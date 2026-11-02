import { useEffect, useRef, useState } from 'react'
import { CreditCard, FlaskConical, Loader2 } from 'lucide-react'
import api from '../../api/axios'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import { loadRazorpay } from '../../utils/razorpay'
import { formatINR } from '../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'

const QUICK = [500, 1000, 2000, 5000]

/**
 * Online wallet top-up with Razorpay Checkout.
 * Props: config {mode, min_amount, max_amount}, onClose, onPaid(message)
 *
 * The browser never decides anything: the server creates the order and the server verifies the payment.
 */
export default function RazorpayTopup({ config, onClose, onPaid }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [step, setStep] = useState('idle') // idle | creating | paying | verifying
  const [unconfirmed, setUnconfirmed] = useState(null) // payment answer that could not be verified yet (network problem)
  const closedRef = useRef(false)

  useEffect(() => {
    closedRef.current = false
    return () => {
      closedRef.current = true
    }
  }, [])

  const busy = step !== 'idle'
  const isTest = config.mode === 'test'

  const verify = async (response) => {
    setStep('verifying')
    setError('')
    try {
      const res = await api.post('/retailer/payments/razorpay/verify', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      })
      setUnconfirmed(null)
      if (!closedRef.current) onPaid(res.data.message)
    } catch (err) {
      // The money may already be taken: keep the answer so the retailer can retry the check without paying again
      setUnconfirmed(response)
      setError(getErrorMessage(err, 'Payment could not be confirmed yet.'))
      setStep('idle')
    }
  }

  const pay = async (e) => {
    e.preventDefault()
    if (busy) return

    setError('')
    setFieldError('')
    setUnconfirmed(null)

    const value = Number(amount)
    if (!value || value < config.min_amount || value > config.max_amount) {
      setFieldError(`Enter an amount between ${formatINR(config.min_amount)} and ${formatINR(config.max_amount)}.`)
      return
    }

    setStep('creating')

    let order
    try {
      order = (await api.post('/retailer/payments/razorpay/order', { amount: value })).data
      await loadRazorpay()
    } catch (err) {
      const fields = getFieldErrors(err)
      if (fields.amount) setFieldError(fields.amount)
      else setError(err?.response ? getErrorMessage(err) : err.message)
      setStep('idle')
      return
    }

    const checkout = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: 'VerifyHub',
      description: 'Wallet top-up',
      prefill: order.prefill,
      theme: { color: '#047857' },
      handler: verify,
      modal: {
        ondismiss: () => setStep((s) => (s === 'paying' ? 'idle' : s)), // closed without paying
      },
    })

    checkout.on('payment.failed', (res) => {
      const reason = res?.error?.description || 'Payment failed.'
      setError(`${reason} You can try again.`)
      api.post('/retailer/payments/razorpay/failed', { razorpay_order_id: order.order_id, reason }).catch(() => {})
    })

    setStep('paying')
    checkout.open()
  }

  return (
    <Modal title="Add money online" subtitle="Pay with Razorpay" icon={CreditCard} onClose={busy && step !== 'paying' ? () => {} : onClose}>
      <form onSubmit={pay} className="space-y-4" autoComplete="off">
        {isTest && (
          <div className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <b>Test mode: no real money moves.</b> In the payment window use UPI <span className="font-mono">success@razorpay</span> (failure:{' '}
              <span className="font-mono">failure@razorpay</span>), or a Razorpay test card with any future expiry, any CVV and any OTP. The
              netbanking test page has Success and Failure buttons.
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}

        <Input
          label="Amount (Rs)"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          error={fieldError}
          inputMode="decimal"
          placeholder={`${config.min_amount} to ${config.max_amount.toLocaleString('en-IN')}`}
          disabled={busy}
          autoFocus
        />

        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => setAmount(String(q))}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {formatINR(q)}
            </button>
          ))}
        </div>

        {unconfirmed && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Your payment went through but is not confirmed yet. <b>Do not pay again.</b>
            <button type="button" onClick={() => verify(unconfirmed)} disabled={busy} className="ml-2 font-semibold underline disabled:opacity-50">
              Check again
            </button>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy && step !== 'paying'}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !amount}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === 'creating' ? 'Starting...' : step === 'paying' ? 'Waiting for payment...' : step === 'verifying' ? 'Confirming...' : amount ? `Pay ${formatINR(amount)}` : 'Pay'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
