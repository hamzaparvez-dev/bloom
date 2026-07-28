import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../providers/AuthProvider'
import { fetchHealthReportContext } from '../lib/fetch-health-report-context'
import {
  buildHealthReportPeriodLine,
  buildPatientLine,
  computeHealthReportBullets,
  type HealthReportBullets,
} from '../lib/health-report-engine'

export interface UseHealthReportResult {
  loading: boolean
  error: string | null
  patientLine: string
  periodLine: string
  bullets: HealthReportBullets | null
  reload: () => Promise<void>
}

export function useHealthReport(): UseHealthReportResult {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patientLine, setPatientLine] = useState('Patient: —')
  const [bullets, setBullets] = useState<HealthReportBullets | null>(null)

  const load = useCallback(async () => {
    const uid = user?.id
    if (!uid) {
      setLoading(false)
      setError(null)
      setPatientLine('Patient: —')
      setBullets(null)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await fetchHealthReportContext(uid)
    if (err) {
      setError(err)
      setPatientLine('Patient: —')
      setBullets(null)
    } else if (data) {
      setPatientLine(buildPatientLine(data.displayName))
      setBullets(computeHealthReportBullets(data))
      setError(null)
    }
    setLoading(false)
  }, [user?.id])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  return {
    loading,
    error,
    patientLine,
    periodLine: buildHealthReportPeriodLine(),
    bullets,
    reload: load,
  }
}
