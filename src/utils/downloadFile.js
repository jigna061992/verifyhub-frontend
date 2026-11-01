import api from '../api/axios'

// Downloads a file from the API with the login token (a plain <a href> cannot send the token).
// Throws an Error with a readable message when the server refuses.
export async function downloadFile(url, params = {}, fallbackName = 'download.csv') {
  let res
  try {
    res = await api.get(url, { params, responseType: 'blob' })
  } catch (err) {
    // With responseType blob, a JSON error body also arrives as a Blob. Read the message out of it.
    const body = err?.response?.data
    if (body instanceof Blob) {
      try {
        const json = JSON.parse(await body.text())
        const first = json.errors ? Object.values(json.errors)[0]?.[0] : null
        throw new Error(first || json.message || 'Download failed. Please try again.')
      } catch (inner) {
        if (inner instanceof SyntaxError) throw new Error('Download failed. Please try again.')
        throw inner
      }
    }
    throw new Error('Download failed. Please check your connection and try again.')
  }

  const disposition = res.headers?.['content-disposition'] || ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const name = match?.[1] || fallbackName

  const blobUrl = URL.createObjectURL(res.data)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}
