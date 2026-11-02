import { useEffect, useState } from 'react'
import EsignCheck from '../verify/EsignCheck'
import ServiceShell from './ServiceShell'
import useService from './useService'

// Consent e-Sign: the customer gets the consent letter and signs it on their phone.
// The form (and its own result) is the existing EsignCheck; this page adds the layout, stats and recent checks.
export default function EsignPage() {
  const { info, recent, state } = useService('ESIGN')
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    if (info) setBalance(info.wallet_available)
  }, [info])

  if (state === 'loading') return <p className="text-slate-500">Loading...</p>
  if (state === 'unavailable') return <p className="text-slate-600 dark:text-slate-300">Consent e-Sign is not enabled for your account. Please contact the admin.</p>
  if (state === 'error') return <p className="text-red-600">Unable to load this page. Please refresh.</p>

  // EsignCheck reads these names
  const options = {
    retailer: info.retailer,
    wallet_available: balance,
    purposes: info.purposes,
    consent: { ESIGN: info.consent },
    ttl_minutes: { ESIGN: info.ttl_minutes },
    dev_mode: info.dev_mode,
  }

  return (
    <ServiceShell
      info={info}
      balance={balance}
      recent={recent}
      title="Consent e-Sign"
      subtitle="The customer receives a consent letter and signs it on their phone."
      docLabel="Mobile"
      hideResult
      note="The customer's mobile number is not stored."
    >
      <EsignCheck service={{ price: info.price }} options={options} balance={balance} onBalance={setBalance} />
    </ServiceShell>
  )
}
