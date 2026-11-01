// First readable message from a Laravel error response
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data
  if (data?.errors) return Object.values(data.errors)[0]?.[0] ?? data.message ?? fallback
  return data?.message || fallback
}

// { field: "message" } map for showing errors under each input
export function getFieldErrors(err) {
  const errors = err?.response?.data?.errors || {}
  return Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, value[0]]))
}