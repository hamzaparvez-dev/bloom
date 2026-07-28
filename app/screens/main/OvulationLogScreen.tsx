import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format } from 'date-fns'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import {
  Camera,
  Check,
  ChevronRight,
  Droplets,
  ImagePlus,
  Microscope,
  TestTube,
  Thermometer,
  X,
} from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { ThemeColors, ThemeRadius } from '../../constants/theme'
import { useAuth } from '../../providers/AuthProvider'
import { useCycleRefresh } from '../../context/cycle-refresh-context'
import { upsertDailyLog } from '../../lib/upsert-daily-log'
import { supabase } from '../../../supabaseClient'
import { showHabitToast } from '../../lib/habit-toast'
import { recognizeBasalTemperatureFromImageUri } from '../../lib/bbt-photo-recognize'
import { uploadBbtReadingPhoto } from '../../lib/bbt-reading-upload'
import type { BbtSourceDb } from '../../lib/upsert-daily-log'
import {
  type CervicalHeight,
  type CervicalOpening,
  type CervicalPositionStored,
  type CervicalTexture,
  formatCervicalPositionSummary,
  isCervicalPositionEmpty,
  parseCervicalPositionJson,
} from '../../lib/cervical-position'

type CervicalMucusDb = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg_white'
type OpkDb = 'negative' | 'positive' | 'unclear'

const MUCUS_ORDER: CervicalMucusDb[] = ['dry', 'sticky', 'creamy', 'watery', 'egg_white']

const MUCUS_LABEL: Record<CervicalMucusDb, string> = {
  dry: 'Dry',
  sticky: 'Sticky',
  creamy: 'Creamy',
  watery: 'Watery',
  egg_white: 'Egg white (peak)',
}

const MUCUS_HELPER: Record<CervicalMucusDb, string> = {
  dry: 'No noticeable mucus',
  sticky: 'Thick, not stretchy',
  creamy: 'Smooth, lotion-like',
  watery: 'Thin, slippery',
  egg_white: 'Clear, stretches like egg white',
}

const OPK_ORDER: OpkDb[] = ['negative', 'positive', 'unclear']

const OPK_LABEL: Record<OpkDb, string> = {
  negative: 'Negative',
  positive: 'Positive',
  unclear: 'Unclear',
}

const OPK_HELPER: Record<OpkDb, string> = {
  negative: 'No surge detected',
  positive: 'LH surge likely',
  unclear: 'Test unclear',
}

const CERVIX_HEIGHTS: CervicalHeight[] = ['low', 'medium', 'high']
const CERVIX_HEIGHT_LABEL: Record<CervicalHeight, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const CERVIX_TEXTURES: CervicalTexture[] = ['firm', 'soft']
const CERVIX_TEXTURE_LABEL: Record<CervicalTexture, string> = {
  firm: 'Firm',
  soft: 'Soft',
}

const CERVIX_OPENINGS: CervicalOpening[] = ['closed', 'slightly_open', 'open']
const CERVIX_OPENING_LABEL: Record<CervicalOpening, string> = {
  closed: 'Closed',
  slightly_open: 'Slightly open',
  open: 'Open',
}

function parseBbt(raw: string): number | null {
  const n = parseFloat(raw.replace(/°/g, '').replace(',', '.').trim())
  return Number.isFinite(n) ? n : null
}

function parseOpkFromNotes(notes: string | null): OpkDb | null {
  if (!notes || typeof notes !== 'string') return null
  const m = notes.match(/OPK:\s*(positive|negative|unclear)/i)
  if (!m) return null
  const v = m[1].toLowerCase()
  if (v === 'positive' || v === 'negative' || v === 'unclear') return v
  return null
}

function buildNotes(opk: OpkDb | null): string | null {
  if (!opk) return null
  return `OPK: ${opk}`
}

function postSaveInsight(m: CervicalMucusDb | null, opk: OpkDb | null, hasBbt: boolean): string {
  if (opk === 'positive') return 'Peak fertility likely'
  if (m === 'egg_white' || m === 'watery') return 'Fertility rising'
  if (m === 'creamy') return 'Fertility rising'
  if (opk === 'negative') return 'No strong ovulation signals yet'
  if (opk === 'unclear') return 'LH unclear — try again tomorrow or add mucus.'
  if (hasBbt) return 'BBT saved — add mucus or an LH test when you can for sharper timing.'
  return 'Logged. Update as signs change this cycle.'
}

interface TrackingCardProps {
  icon: LucideIcon
  iconColor: string
  cardBg: string
  label: string
  value: string
  valueHint?: string
  onPress: () => void
  emphasized?: boolean
}

function TrackingCard({
  icon: Icon,
  iconColor,
  cardBg,
  label,
  value,
  valueHint,
  onPress,
  emphasized,
}: TrackingCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.trackCard,
        { backgroundColor: cardBg },
        emphasized && styles.trackCardEmphasized,
        pressed && { opacity: 0.88 },
      ]}
    >
      <View style={styles.trackLeft}>
        <Icon size={22} color={iconColor} strokeWidth={1.8} />
        <View style={styles.trackBody}>
          <Text style={[styles.trackLabel, emphasized && styles.trackLabelEmphasized]}>{label}</Text>
          <Text style={styles.trackValue} numberOfLines={2}>
            {value}
          </Text>
          {valueHint ? (
            <Text style={styles.trackValueHint} numberOfLines={2}>
              {valueHint}
            </Text>
          ) : null}
        </View>
      </View>
      <ChevronRight size={16} color={ThemeColors.textLight} strokeWidth={2} />
    </Pressable>
  )
}

interface CervixChipRowProps<T extends string> {
  label: string
  options: readonly T[]
  optionLabel: Record<T, string>
  value: T | null
  onChange: (next: T | null) => void
}

function CervixChipRow<T extends string>({ label, options, optionLabel, value, onChange }: CervixChipRowProps<T>) {
  return (
    <View style={styles.cervixRow}>
      <Text style={styles.cervixRowLabel}>{label}</Text>
      <View style={styles.cervixChips}>
        {options.map((key) => {
          const selected = value === key
          return (
            <Pressable
              key={key}
              onPress={() => {
                void Haptics.selectionAsync()
                onChange(selected ? null : key)
              }}
              style={({ pressed }) => [
                styles.cervixChip,
                selected && styles.cervixChipOn,
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={[styles.cervixChipText, selected && styles.cervixChipTextOn]}>{optionLabel[key]}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

interface Props {
  onBack?: () => void
}

export function OvulationLogScreen(_props: Props) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { bumpCycleRefresh } = useCycleRefresh()
  const [bbtInput, setBbtInput] = useState('')
  const [bbtSourceDraft, setBbtSourceDraft] = useState<BbtSourceDb | null>(null)
  const [mucus, setMucus] = useState<CervicalMucusDb | null>(null)
  const [opk, setOpk] = useState<OpkDb | null>(null)
  const [cervicalPosition, setCervicalPosition] = useState<CervicalPositionStored>({
    position: null,
    texture: null,
    opening: null,
  })
  const [saving, setSaving] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [lastBbtLine, setLastBbtLine] = useState<string | null>(null)
  const [mucusModalOpen, setMucusModalOpen] = useState(false)
  const [opkModalOpen, setOpkModalOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [inlineInsight, setInlineInsight] = useState<string | null>(null)

  const [bbtPhotoToolsOpen, setBbtPhotoToolsOpen] = useState(false)
  const [thermoLocalUri, setThermoLocalUri] = useState<string | null>(null)
  const [savedBbtImageUrl, setSavedBbtImageUrl] = useState<string | null>(null)
  const [attachThermoToLog, setAttachThermoToLog] = useState(true)
  const [pendingStripBbtImage, setPendingStripBbtImage] = useState(false)

  const [bbtScanModalOpen, setBbtScanModalOpen] = useState(false)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [bbtDraftFromOcr, setBbtDraftFromOcr] = useState('')
  const [ocrFailedMessage, setOcrFailedMessage] = useState<string | null>(null)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const hydrate = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setHydrating(false)
      return
    }
    setHydrating(true)
    const [{ data: todayRow }, { data: priorBbt }] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('bbt, cervical_mucus, notes, bbt_source, bbt_image_url, cervical_position')
        .eq('user_id', uid)
        .eq('date', todayStr)
        .maybeSingle(),
      supabase
        .from('daily_logs')
        .select('bbt')
        .eq('user_id', uid)
        .not('bbt', 'is', null)
        .lt('date', todayStr)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (todayRow) {
      if (todayRow.bbt != null && Number.isFinite(Number(todayRow.bbt))) {
        setBbtInput(String(Number(todayRow.bbt)))
      } else {
        setBbtInput('')
      }
      const src = todayRow.bbt_source != null ? String(todayRow.bbt_source).toLowerCase() : ''
      if (src === 'manual' || src === 'scanned') setBbtSourceDraft(src as BbtSourceDb)
      else setBbtSourceDraft(null)

      const img = todayRow.bbt_image_url != null ? String(todayRow.bbt_image_url) : ''
      setSavedBbtImageUrl(img.trim() ? img : null)
      setThermoLocalUri(null)
      setPendingStripBbtImage(false)

      const parsedCol = parseCervicalPositionJson(todayRow.cervical_position)
      setCervicalPosition(parsedCol ?? { position: null, texture: null, opening: null })

      const cm = todayRow.cervical_mucus != null ? String(todayRow.cervical_mucus).toLowerCase() : ''
      if (cm && (MUCUS_ORDER as string[]).includes(cm)) setMucus(cm as CervicalMucusDb)
      else setMucus(null)
      setOpk(parseOpkFromNotes(todayRow.notes != null ? String(todayRow.notes) : null))
    } else {
      setBbtInput('')
      setBbtSourceDraft(null)
      setSavedBbtImageUrl(null)
      setThermoLocalUri(null)
      setPendingStripBbtImage(false)
      setCervicalPosition({ position: null, texture: null, opening: null })
      setMucus(null)
      setOpk(null)
    }

    if (priorBbt?.bbt != null && Number.isFinite(Number(priorBbt.bbt))) {
      setLastBbtLine(`Last: ${Number(priorBbt.bbt).toFixed(2)}°C`)
    } else {
      setLastBbtLine(null)
    }

    setHydrating(false)
  }, [user?.id, todayStr])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const bbtParsed = useMemo(() => (bbtInput.trim() ? parseBbt(bbtInput) : null), [bbtInput])

  const bbtSoftWarning = useMemo(() => {
    if (bbtParsed == null) return null
    if (bbtParsed < 35) return 'Unusually low for BBT — double-check the reading.'
    if (bbtParsed >= 39)
      return 'Very high for basal temperature — confirm you were at rest, or note if you feel unwell.'
    if (bbtParsed > 38) return 'Unusually high for BBT — double-check the reading.'
    return null
  }, [bbtParsed])

  const bbtHardInvalid = useMemo(() => {
    if (!bbtInput.trim()) return false
    if (bbtParsed == null) return true
    return bbtParsed < 32 || bbtParsed > 41
  }, [bbtInput, bbtParsed])

  const signalCount = useMemo(() => {
    let n = 0
    if (bbtInput.trim() && bbtParsed != null && !bbtHardInvalid) n++
    if (mucus) n++
    if (opk) n++
    return n
  }, [bbtInput, bbtParsed, bbtHardInvalid, mucus, opk])

  const hasStructuredCervix = useMemo(() => !isCervicalPositionEmpty(cervicalPosition), [cervicalPosition])

  const hasAnyInput = useMemo(() => {
    if (bbtInput.trim() && !bbtHardInvalid && bbtParsed != null) return true
    if (mucus) return true
    if (opk) return true
    if (hasStructuredCervix) return true
    return false
  }, [bbtInput, bbtHardInvalid, bbtParsed, mucus, opk, hasStructuredCervix])

  const mucusDisplay = mucus ? MUCUS_LABEL[mucus] : "Select today's type"
  const mucusHint = mucus ? MUCUS_HELPER[mucus] : 'Opens a quick picker'

  const opkDisplay =
    opk === 'positive'
      ? OPK_LABEL.positive
      : opk === 'negative'
        ? OPK_LABEL.negative
        : opk === 'unclear'
          ? OPK_LABEL.unclear
          : 'Add test result'
  const opkHint = opk ? OPK_HELPER[opk] : 'Negative, positive, or unclear'

  const cervixSummary = formatCervicalPositionSummary(cervicalPosition)

  const pickMucusOption = (key: CervicalMucusDb) => {
    void Haptics.selectionAsync()
    setMucus(key)
    setMucusModalOpen(false)
    showHabitToast(`Saved: ${MUCUS_LABEL[key]}`)
  }

  const pickOpkOption = (key: OpkDb) => {
    void Haptics.selectionAsync()
    setOpk(key)
    setOpkModalOpen(false)
    showHabitToast(`Saved: ${OPK_LABEL[key]}`)
  }

  const onBbtTyped = useCallback((t: string) => {
    setBbtInput(t)
    setBbtSourceDraft('manual')
  }, [])

  const openPickerFlow = useCallback(async (source: 'camera' | 'library') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      showHabitToast(source === 'camera' ? 'Camera access is needed to photograph your thermometer.' : 'Photo library access is needed to pick a thermometer photo.')
      return
    }
    const launch =
      source === 'camera'
        ? ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          })
    const res = await launch
    if (res.canceled || !res.assets?.[0]?.uri) return
    const uri = res.assets[0].uri
    setThermoLocalUri(uri)
    setPendingStripBbtImage(false)
    setAttachThermoToLog(true)
    setBbtScanModalOpen(true)
    setOcrBusy(true)
    setOcrFailedMessage(null)
    setBbtDraftFromOcr('')
    const ocr = await recognizeBasalTemperatureFromImageUri(uri)
    setOcrBusy(false)
    if (ocr.ok) {
      setBbtDraftFromOcr(String(ocr.valueCelsius))
      setOcrFailedMessage(null)
      return
    }
    if (ocr.reason === 'no_temperature_in_text')
      setOcrFailedMessage("Couldn’t detect temperature. Please enter manually.")
    else setOcrFailedMessage("Couldn’t detect temperature. Please enter manually.")
  }, [])

  const applyBbtScanConfirm = useCallback(() => {
    const v = parseBbt(bbtDraftFromOcr)
    if (v == null || v < 32 || v > 41) {
      showHabitToast('Enter a temperature between 32 and 41 °C.')
      return
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setBbtInput(String(Math.round(v * 100) / 100))
    setBbtSourceDraft('scanned')
    setBbtScanModalOpen(false)
    setOcrFailedMessage(null)
    showHabitToast('Temperature applied — review and save when ready.')
  }, [bbtDraftFromOcr])

  const dismissBbtScanModal = useCallback(() => {
    setBbtScanModalOpen(false)
    setOcrBusy(false)
    setOcrFailedMessage(null)
  }, [])

  const save = () => {
    if (!user?.id) {
      showHabitToast('Sign in to save fertility signs.')
      return
    }
    if (!hasAnyInput) return
    if (bbtHardInvalid) {
      showHabitToast('Fix BBT (use a number between 32 and 41 °C) or clear the field.')
      return
    }

    let bbtNum: number | null = null
    if (bbtInput.trim() && bbtParsed != null) bbtNum = Math.round(bbtParsed * 100) / 100

    const notesStr = buildNotes(opk)
    const bbtSource: BbtSourceDb | null =
      bbtNum != null ? (bbtSourceDraft === 'scanned' ? 'scanned' : 'manual') : null

    setSaving(true)
    void (async () => {
      let imageUrl: string | null | undefined = undefined
      if (pendingStripBbtImage) imageUrl = null
      else if (thermoLocalUri && attachThermoToLog && bbtNum != null) {
        const up = await uploadBbtReadingPhoto(user.id, thermoLocalUri)
        if (up.error) {
          setSaving(false)
          showHabitToast(`Photo upload failed — ${up.error}`)
          return
        }
        imageUrl = up.publicUrl
      }

      const { error } = await upsertDailyLog({
        userId: user.id,
        bbt: bbtNum,
        cervical_mucus: mucus,
        notes: notesStr,
        bbtSource: bbtSource ?? undefined,
        bbtImageUrl: imageUrl,
        cervicalPosition: hasStructuredCervix ? cervicalPosition : null,
        clearCervicalPosition: !hasStructuredCervix,
      })
      setSaving(false)
      if (error) {
        showHabitToast(`Could not save — ${error.message}`)
        return
      }
      bumpCycleRefresh()
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setInlineInsight(postSaveInsight(mucus, opk, bbtNum != null))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2200)
      showHabitToast("Saved — today's log updated.")
      if (imageUrl === null) setSavedBbtImageUrl(null)
      else if (typeof imageUrl === 'string') setSavedBbtImageUrl(imageUrl)
      setPendingStripBbtImage(false)
      if (thermoLocalUri && attachThermoToLog) setThermoLocalUri(null)
      await hydrate()
    })()
  }

  const saveLabel = saving ? 'Saving…' : savedFlash ? 'Saved ✓' : hasAnyInput ? "Save today's log" : 'Add at least one sign'

  const thumbUri = thermoLocalUri ?? savedBbtImageUrl

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 140 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Ovulation Tracking</Text>
        <Text style={styles.subtitle}>Log 1–2 signs for better predictions today</Text>
        <Text style={styles.progressLine}>
          {signalCount} of 3 signals logged
          <Text style={styles.progressHint}> · BBT, mucus, LH</Text>
        </Text>

        {inlineInsight ? (
          <View style={styles.insightBanner}>
            <Text style={styles.insightText}>{inlineInsight}</Text>
          </View>
        ) : null}

        {hydrating ? (
          <View style={styles.hydrateRow}>
            <ActivityIndicator color={ThemeColors.primary} />
            <Text style={styles.hydrateText}>Loading today…</Text>
          </View>
        ) : null}

        <View style={styles.inputBlock}>
          <View style={styles.inputRow}>
            <Thermometer size={20} color={ThemeColors.peach} strokeWidth={2} />
            <View style={styles.inputBody}>
              <Text style={styles.inputLabel}>Basal body temperature (°C)</Text>
              {lastBbtLine ? <Text style={styles.lastBbt}>{lastBbtLine}</Text> : null}
              <Text style={styles.bbtHelper}>Best taken in the morning, before you get up.</Text>
              <TextInput
                value={bbtInput}
                onChangeText={onBbtTyped}
                placeholder="e.g. 36.65"
                placeholderTextColor={ThemeColors.textLight}
                keyboardType="decimal-pad"
                style={styles.textField}
              />
              {bbtSoftWarning ? <Text style={styles.softWarn}>{bbtSoftWarning}</Text> : null}

              {!bbtPhotoToolsOpen ? (
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync()
                    setBbtPhotoToolsOpen(true)
                  }}
                  style={({ pressed }) => [styles.addPhotoLink, pressed && { opacity: 0.75 }]}
                >
                  <ImagePlus size={16} color={ThemeColors.primary} strokeWidth={2} />
                  <Text style={styles.addPhotoLinkText}>Add thermometer photo</Text>
                </Pressable>
              ) : (
                <View style={styles.photoTools}>
                  <Text style={styles.photoToolsHint}>Scan the display — you will confirm the value before it is saved.</Text>
                  <View style={styles.photoBtnRow}>
                    <Pressable
                      onPress={() => void openPickerFlow('camera')}
                      style={({ pressed }) => [styles.photoPickBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Camera size={18} color={ThemeColors.primary} strokeWidth={2} />
                      <Text style={styles.photoPickBtnText}>Take photo</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void openPickerFlow('library')}
                      style={({ pressed }) => [styles.photoPickBtn, pressed && { opacity: 0.85 }]}
                    >
                      <ImagePlus size={18} color={ThemeColors.primary} strokeWidth={2} />
                      <Text style={styles.photoPickBtnText}>Upload</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {thumbUri ? (
                <View style={styles.thumbBlock}>
                  <Image source={{ uri: thumbUri }} style={styles.thumbImage} contentFit="cover" transition={160} />
                  <View style={styles.thumbMeta}>
                    <Text style={styles.thumbLabel}>{thermoLocalUri ? 'Ready to attach' : 'Saved photo'}</Text>
                    {thermoLocalUri ? (
                      <Pressable
                        onPress={() => {
                          void Haptics.selectionAsync()
                          setAttachThermoToLog((v) => !v)
                        }}
                        style={styles.thumbToggle}
                      >
                        <Text style={styles.thumbToggleText}>{attachThermoToLog ? '✓ Attach to log' : 'Attach off'}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        void Haptics.selectionAsync()
                        setThermoLocalUri(null)
                        setSavedBbtImageUrl(null)
                        setAttachThermoToLog(true)
                        setPendingStripBbtImage(true)
                        showHabitToast('Photo removed — save to update your log.')
                      }}
                      style={styles.thumbRemove}
                    >
                      <Text style={styles.thumbRemoveText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.cardStack}>
          <TrackingCard
            icon={Droplets}
            iconColor={ThemeColors.sky}
            cardBg="#F0F7FC"
            label="Cervical mucus"
            value={mucusDisplay}
            valueHint={mucusHint}
            emphasized
            onPress={() => setMucusModalOpen(true)}
          />
          <TrackingCard
            icon={TestTube}
            iconColor={ThemeColors.mint}
            cardBg="#F0FAF4"
            label="LH test (OPK)"
            value={opkDisplay}
            valueHint={opkHint}
            emphasized
            onPress={() => setOpkModalOpen(true)}
          />
        </View>

        <View style={styles.cervixBlock}>
          <View style={styles.inputRow}>
            <Microscope size={20} color={ThemeColors.lavender} strokeWidth={2} />
            <View style={styles.inputBody}>
              <Text style={[styles.inputLabel, styles.optionalMuted]}>Cervical position</Text>
              <Text style={styles.cervixHelpLine}>Not sure? You can skip this.</Text>
              <Text style={styles.cervixScienceLine}>
                High + soft + open often appears closer to ovulation; low + firm + closed is common after your period.
              </Text>

              <CervixChipRow<CervicalHeight>
                label="Position"
                options={CERVIX_HEIGHTS}
                optionLabel={CERVIX_HEIGHT_LABEL}
                value={cervicalPosition.position}
                onChange={(position) => setCervicalPosition((p) => ({ ...p, position }))}
              />
              <CervixChipRow<CervicalTexture>
                label="Texture"
                options={CERVIX_TEXTURES}
                optionLabel={CERVIX_TEXTURE_LABEL}
                value={cervicalPosition.texture}
                onChange={(texture) => setCervicalPosition((p) => ({ ...p, texture }))}
              />
              <CervixChipRow<CervicalOpening>
                label="Opening"
                options={CERVIX_OPENINGS}
                optionLabel={CERVIX_OPENING_LABEL}
                value={cervicalPosition.opening}
                onChange={(opening) => setCervicalPosition((p) => ({ ...p, opening }))}
              />

              {cervixSummary ? <Text style={styles.cervixSummary}>Selected: {cervixSummary}</Text> : null}
            </View>
          </View>
        </View>

        <Text style={styles.habitFoot}>Logging daily improves prediction accuracy.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 80 }]}>
        <Pressable
          onPress={save}
          disabled={saving || !hasAnyInput || bbtHardInvalid}
          style={({ pressed }) => [
            styles.saveBtn,
            (!hasAnyInput || bbtHardInvalid) && styles.saveBtnDisabled,
            pressed && hasAnyInput && !bbtHardInvalid && !saving && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            saving && { opacity: 0.72 },
          ]}
        >
          <Check size={18} color={ThemeColors.white} strokeWidth={2.5} />
          <Text style={styles.saveText}>{saveLabel}</Text>
        </Pressable>
      </View>

      <Modal visible={bbtScanModalOpen} animationType="fade" transparent onRequestClose={dismissBbtScanModal}>
        <Pressable style={styles.modalBackdrop} onPress={dismissBbtScanModal}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.scanModalHeader}>
              <Text style={styles.modalTitle}>Thermometer reading</Text>
              <Pressable onPress={dismissBbtScanModal} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.7 }}>
                <X size={22} color={ThemeColors.textMid} strokeWidth={2} />
              </Pressable>
            </View>
            <Text style={styles.modalSub}>Confirm the value before it is added to your log.</Text>

            {ocrBusy ? (
              <View style={styles.ocrBusyRow}>
                <ActivityIndicator color={ThemeColors.primary} />
                <Text style={styles.ocrBusyText}>Reading the photo…</Text>
              </View>
            ) : null}

            {!ocrBusy && ocrFailedMessage ? <Text style={styles.ocrFailText}>{ocrFailedMessage}</Text> : null}

            {!ocrBusy && !ocrFailedMessage && bbtDraftFromOcr.trim() && parseBbt(bbtDraftFromOcr) != null ? (
              <Text style={styles.detectedLine}>
                Detected: {parseBbt(bbtDraftFromOcr)!.toFixed(2)}°C
              </Text>
            ) : null}

            <Text style={styles.scanFieldLabel}>Temperature (°C)</Text>
            <TextInput
              value={bbtDraftFromOcr}
              onChangeText={setBbtDraftFromOcr}
              placeholder="e.g. 36.72"
              placeholderTextColor={ThemeColors.textLight}
              keyboardType="decimal-pad"
              style={styles.scanField}
            />

            <Pressable
              onPress={applyBbtScanConfirm}
              style={({ pressed }) => [styles.scanConfirmBtn, pressed && { opacity: 0.88 }]}
            >
              <Check size={18} color={ThemeColors.white} strokeWidth={2.5} />
              <Text style={styles.scanConfirmText}>Confirm</Text>
            </Pressable>
            <Pressable onPress={dismissBbtScanModal} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={mucusModalOpen} animationType="fade" transparent onRequestClose={() => setMucusModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMucusModalOpen(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Cervical mucus</Text>
            <Text style={styles.modalSub}>Tap one — we will save your pick to this screen.</Text>
            {MUCUS_ORDER.map((key) => {
              const selected = mucus === key
              return (
                <Pressable
                  key={key}
                  onPress={() => pickMucusOption(key)}
                  style={({ pressed }) => [
                    styles.modalRow,
                    selected && styles.modalRowSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.modalRowText}>
                    <Text style={[styles.modalRowTitle, selected && styles.modalRowTitleOn]}>{MUCUS_LABEL[key]}</Text>
                    <Text style={styles.modalRowDesc}>{MUCUS_HELPER[key]}</Text>
                  </View>
                  {selected ? <Check size={18} color={ThemeColors.primary} strokeWidth={2.5} /> : null}
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync()
                setMucus(null)
                setMucusModalOpen(false)
                showHabitToast('Cervical mucus cleared')
              }}
              style={styles.modalClear}
            >
              <Text style={styles.modalClearText}>Clear selection</Text>
            </Pressable>
            <Pressable onPress={() => setMucusModalOpen(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={opkModalOpen} animationType="fade" transparent onRequestClose={() => setOpkModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpkModalOpen(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>LH test (OPK)</Text>
            <Text style={styles.modalSub}>Tap your result — we will save it to this screen.</Text>
            {OPK_ORDER.map((key) => {
              const selected = opk === key
              return (
                <Pressable
                  key={key}
                  onPress={() => pickOpkOption(key)}
                  style={({ pressed }) => [
                    styles.modalRow,
                    selected && styles.modalRowSelected,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View style={styles.modalRowText}>
                    <Text style={[styles.modalRowTitle, selected && styles.modalRowTitleOn]}>{OPK_LABEL[key]}</Text>
                    <Text style={styles.modalRowDesc}>{OPK_HELPER[key]}</Text>
                  </View>
                  {selected ? <Check size={18} color={ThemeColors.primary} strokeWidth={2.5} /> : null}
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync()
                setOpk(null)
                setOpkModalOpen(false)
                showHabitToast('LH test cleared')
              }}
              style={styles.modalClear}
            >
              <Text style={styles.modalClearText}>Clear selection</Text>
            </Pressable>
            <Pressable onPress={() => setOpkModalOpen(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ThemeColors.bgCream },
  content: { paddingHorizontal: 20 },

  title: { fontSize: 28, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 4 },
  subtitle: { fontSize: 15, fontWeight: '500', color: ThemeColors.textMid, marginBottom: 6 },
  progressLine: { fontSize: 13, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 16 },
  progressHint: { fontWeight: '500', color: ThemeColors.textLight },

  hydrateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  hydrateText: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid },

  inputBlock: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  cervixBlock: {
    backgroundColor: ThemeColors.surface,
    borderRadius: ThemeRadius.card,
    padding: 16,
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  inputBody: { flex: 1, gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid },
  optionalMuted: { opacity: 0.85 },
  lastBbt: { fontSize: 13, fontWeight: '700', color: ThemeColors.textDark },
  bbtHelper: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight, lineHeight: 16 },
  softWarn: { fontSize: 13, fontWeight: '600', color: '#B45309', marginTop: 4 },
  textField: {
    fontSize: 17,
    fontWeight: '600',
    color: ThemeColors.textDark,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ThemeColors.border,
  },

  addPhotoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addPhotoLinkText: { fontSize: 14, fontWeight: '700', color: ThemeColors.primary },
  photoTools: { marginTop: 12, gap: 8 },
  photoToolsHint: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight, lineHeight: 16 },
  photoBtnRow: { flexDirection: 'row', gap: 12 },
  photoPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: ThemeRadius.md,
    backgroundColor: ThemeColors.pinkSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  photoPickBtnText: { fontSize: 14, fontWeight: '700', color: ThemeColors.textDark },

  thumbBlock: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' },
  thumbImage: { width: 72, height: 72, borderRadius: 12, backgroundColor: ThemeColors.border },
  thumbMeta: { flex: 1, gap: 4 },
  thumbLabel: { fontSize: 12, fontWeight: '600', color: ThemeColors.textMid },
  thumbToggle: { alignSelf: 'flex-start' },
  thumbToggleText: { fontSize: 13, fontWeight: '600', color: ThemeColors.primary },
  thumbRemove: { alignSelf: 'flex-start' },
  thumbRemoveText: { fontSize: 13, fontWeight: '600', color: ThemeColors.textLight },

  cervixHelpLine: { fontSize: 12, fontWeight: '600', color: ThemeColors.textMid },
  cervixScienceLine: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight, lineHeight: 16 },
  cervixRow: { marginTop: 8, gap: 6 },
  cervixRowLabel: { fontSize: 12, fontWeight: '700', color: ThemeColors.textDark },
  cervixChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cervixChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: ThemeRadius.md,
    backgroundColor: ThemeColors.bgCream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  cervixChipOn: {
    borderColor: ThemeColors.primary,
    backgroundColor: ThemeColors.pinkSurface,
  },
  cervixChipText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textMid },
  cervixChipTextOn: { color: ThemeColors.primary },
  cervixSummary: { fontSize: 13, fontWeight: '600', color: ThemeColors.textDark, marginTop: 8 },

  cardStack: { gap: 12 },

  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: ThemeRadius.card,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: ThemeColors.primary,
    shadowColor: ThemeColors.textDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  trackCardEmphasized: {
    borderLeftWidth: 4,
    borderLeftColor: ThemeColors.primary,
  },
  trackLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  trackBody: { flex: 1, gap: 2 },
  trackLabel: { fontSize: 13, fontWeight: '600', color: ThemeColors.textMid },
  trackLabelEmphasized: { fontWeight: '800', color: ThemeColors.textDark },
  trackValue: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  trackValueHint: { fontSize: 12, fontWeight: '500', color: ThemeColors.textLight, marginTop: 2 },

  insightBanner: {
    marginTop: 8,
    marginBottom: 8,
    padding: 14,
    borderRadius: ThemeRadius.card,
    backgroundColor: '#F0EAFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  insightText: { fontSize: 15, fontWeight: '600', color: ThemeColors.textDark, lineHeight: 21 },

  habitFoot: {
    fontSize: 12,
    fontWeight: '500',
    color: ThemeColors.textLight,
    marginTop: 20,
    textAlign: 'center',
  },

  footer: { paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: ThemeRadius.button,
    backgroundColor: ThemeColors.primary,
  },
  saveBtnDisabled: {
    opacity: 0.42,
  },
  saveText: { fontSize: 17, fontWeight: '700', color: ThemeColors.white },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: ThemeColors.surface,
    borderTopLeftRadius: ThemeRadius.lg,
    borderTopRightRadius: ThemeRadius.lg,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '72%',
  },
  scanModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: ThemeColors.textDark, marginBottom: 4 },
  modalSub: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, marginBottom: 12 },
  ocrBusyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  ocrBusyText: { fontSize: 14, fontWeight: '600', color: ThemeColors.textMid },
  ocrFailText: { fontSize: 14, fontWeight: '600', color: '#B45309', marginBottom: 8 },
  detectedLine: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark, marginBottom: 8 },
  scanFieldLabel: { fontSize: 12, fontWeight: '600', color: ThemeColors.textMid, marginTop: 4 },
  scanField: {
    fontSize: 18,
    fontWeight: '700',
    color: ThemeColors.textDark,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ThemeColors.border,
    marginBottom: 16,
  },
  scanConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: ThemeRadius.button,
    backgroundColor: ThemeColors.primary,
    marginBottom: 8,
  },
  scanConfirmText: { fontSize: 16, fontWeight: '700', color: ThemeColors.white },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: ThemeRadius.md,
    marginBottom: 8,
    backgroundColor: ThemeColors.bgCream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ThemeColors.border,
  },
  modalRowSelected: {
    borderColor: ThemeColors.primary,
    backgroundColor: ThemeColors.pinkSurface,
  },
  modalRowText: { flex: 1, paddingRight: 8 },
  modalRowTitle: { fontSize: 16, fontWeight: '700', color: ThemeColors.textDark },
  modalRowTitleOn: { color: ThemeColors.primary },
  modalRowDesc: { fontSize: 13, fontWeight: '500', color: ThemeColors.textMid, marginTop: 2 },
  modalClear: { paddingVertical: 12, alignItems: 'center' },
  modalClearText: { fontSize: 15, fontWeight: '600', color: ThemeColors.textMid },
  modalCancel: { paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: ThemeColors.primary },
})
