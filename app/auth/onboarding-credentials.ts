let pendingEmail = ''
let pendingPassword = ''

export function setOnboardingCredentials(email: string, password: string): void {
  pendingEmail = email.trim()
  pendingPassword = password
}

export function consumeOnboardingCredentials(): { email: string; password: string } | null {
  if (!pendingEmail || !pendingPassword) return null
  const out = { email: pendingEmail, password: pendingPassword }
  pendingEmail = ''
  pendingPassword = ''
  return out
}
