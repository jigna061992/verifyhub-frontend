// Quick checks in the browser. The server checks everything again, these only give fast feedback.

export const isAadhaar = (v) => /^[2-9][0-9]{11}$/.test(v)
export const isPan = (v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)
export const isIfsc = (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)
export const isGstin = (v) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)
export const isAccountNo = (v) => /^[0-9]{9,18}$/.test(v)
export const isMobile = (v) => /^[6-9][0-9]{9}$/.test(v)

// Name used for the name match. Letters, spaces, dot, apostrophe, hyphen (same rule as the server).
export const nameError = (value, { required = false } = {}) => {
  const t = value.trim()
  if (!t) return required ? 'Customer name is required.' : null
  if (t.length < 2) return 'Name is too short.'
  if (t.length > 100) return 'Name is too long.'
  if (!/^\p{L}[\p{L} .'-]*$/u.test(t)) return 'Use letters and spaces only.'
  return null
}

// 4th letter of a PAN tells who holds it
const PAN_TYPES = { P: 'Individual', C: 'Company', H: 'HUF', F: 'Firm', A: 'AOP', T: 'Trust', B: 'BOI', L: 'Local authority', J: 'Artificial juridical person', G: 'Government' }
export const panType = (pan) => PAN_TYPES[pan?.[3]] ?? null
