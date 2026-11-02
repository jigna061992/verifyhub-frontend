const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

let loading = null

// Loads Razorpay Checkout once. Resolves with window.Razorpay, rejects if the script is blocked or offline.
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay did not load.')))
    script.onerror = () => {
      loading = null // allow a retry
      script.remove()
      reject(new Error('Could not load the payment window. Check your internet connection or ad blocker.'))
    }
    document.body.appendChild(script)
  })

  return loading
}
