// "Keep me signed in" = localStorage (survives browser close)
// Otherwise sessionStorage (cleared when the tab is closed)
export const getToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token')

export const saveToken = (token, remember) => {
  clearToken()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem('token', token)
}

export const clearToken = () => {
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
}