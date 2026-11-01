import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, Pencil, Power, Store, UserPlus, Lock, Eye, EyeOff, Info } from 'lucide-react'
import api from '../../api/axios'
import Card from '../../components/ui/Card'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import { inputClass } from '../../components/ui/Input'
import Pagination from '../../components/ui/Pagination'
import Toast from '../../components/ui/Toast'
import { formatINR, formatDate } from '../../utils/format'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'

// Fields sent even when empty, so the server can show "required" messages.
// PAN, GST and password are only sent when typed (on edit they keep the old value if left empty).
const REQUIRED = ['business_name', 'name', 'mobile', 'email', 'address', 'status']

const withError = (error) => `${inputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`

/* Label row with a red * (required) or "Optional" on the right, plus hint and error text */
function Field({ id, label, required, optional, hint, error, className = '', children }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
        {required && <span className="text-xs font-bold text-red-500">*</span>}
        {optional && <span className="text-xs text-slate-400">Optional</span>}
      </div>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

/* ---------- Create / edit form (inside a modal) ---------- */
function RetailerForm({ retailer, onClose, onSaved }) {
  const isEdit = Boolean(retailer)

  const [form, setForm] = useState({
    business_name: retailer?.business_name ?? '',
    name: retailer?.user.name ?? '',
    mobile: retailer?.user.mobile ?? '',
    email: retailer?.user.email ?? '',
    address: retailer?.address ?? '',
    pan: '',
    gst: '',
    password: '',
    status: retailer?.status ?? 'active',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key, transform = (v) => v) => (e) => setForm({ ...form, [key]: transform(e.target.value) })

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setFormError('')
    setSaving(true)

    const payload = Object.fromEntries(
      Object.entries(form).filter(([key, value]) => value !== '' || REQUIRED.includes(key))
    )

    try {
      if (isEdit) {
        await api.put(`/admin/retailers/${retailer.id}`, payload)
      } else {
        await api.post('/admin/retailers', payload)
      }
      onSaved(isEdit ? 'Retailer updated successfully.' : 'Retailer created successfully.')
    } catch (err) {
      const fieldErrors = getFieldErrors(err)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="retailer-form"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        <UserPlus className="h-4 w-4" />
        {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create retailer'}
      </button>
    </>
  )

  return (
    <Modal
      title={isEdit ? 'Edit retailer' : 'Add new retailer'}
      subtitle={isEdit ? 'Update the retailer details.' : 'Create a partner account with dashboard login credentials.'}
      icon={UserPlus}
      size="2xl"
      footer={footer}
      onClose={onClose}
    >
      <form id="retailer-form" onSubmit={submit} autoComplete="off" className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 dark:bg-red-950 dark:text-red-300">
            {formError}
          </p>
        )}

        <Field id="business_name" label="Business / shop name" required error={errors.business_name}>
          <input
            id="business_name"
            value={form.business_name}
            onChange={set('business_name')}
            placeholder="e.g. Shree Ganesh Mobile Point"
            className={withError(errors.business_name)}
            required
          />
        </Field>

        <Field id="name" label="Owner name" required error={errors.name}>
          <input
            id="name"
            value={form.name}
            onChange={set('name')}
            placeholder="Full name as per PAN"
            className={withError(errors.name)}
            required
          />
        </Field>

        <Field id="mobile" label="Mobile number" required error={errors.mobile}>
          <div className="flex">
            <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              +91
            </span>
            <input
              id="mobile"
              value={form.mobile}
              onChange={set('mobile', (v) => v.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              placeholder="10-digit mobile"
              className={`${withError(errors.mobile)} rounded-l-none`}
              required
            />
          </div>
        </Field>

        <Field id="email" label="Email address" required error={errors.email}>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="owner@business.in"
            className={withError(errors.email)}
            required
          />
        </Field>

        <Field id="address" label="Business address" required error={errors.address} className="sm:col-span-2">
          <textarea
            id="address"
            rows={3}
            value={form.address}
            onChange={set('address')}
            placeholder="Shop no., street, city, state - PIN"
            className={`${withError(errors.address)} resize-y`}
            required
          />
        </Field>

        <Field
          id="pan"
          label="PAN number"
          required={!isEdit}
          error={errors.pan}
          hint={isEdit ? 'Leave empty to keep the current PAN.' : 'Stored masked in listings.'}
        >
          <input
            id="pan"
            value={form.pan}
            onChange={set('pan', (v) => v.toUpperCase().replace(/\s/g, '').slice(0, 10))}
            placeholder={isEdit && retailer.pan_masked ? retailer.pan_masked : 'ABCPK1234L'}
            className={`${withError(errors.pan)} font-mono`}
            required={!isEdit}
          />
        </Field>

        <Field id="gst" label="GST number" optional error={errors.gst}>
          <input
            id="gst"
            value={form.gst}
            onChange={set('gst', (v) => v.toUpperCase().replace(/\s/g, '').slice(0, 15))}
            placeholder={isEdit && retailer.gst_masked ? retailer.gst_masked : '24ABCPK1234L1Z5'}
            className={`${withError(errors.gst)} font-mono`}
          />
        </Field>

        <Field
          id="password"
          label={isEdit ? 'New login password' : 'Login password'}
          required={!isEdit}
          error={errors.password}
          hint={isEdit ? 'Leave empty to keep the current password. Changing it signs the retailer out.' : undefined}
        >
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder={isEdit ? 'Leave empty to keep current' : 'Min. 8 chars, letters & numbers'}
              autoComplete="new-password"
              className={`${withError(errors.password)} pl-9 pr-10`}
              required={!isEdit}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field id="status" label="Retailer status" required error={errors.status}>
          <select id="status" value={form.status} onChange={set('status')} className={withError(errors.status)}>
            <option value="active">Active — can log in</option>
            <option value="inactive">Inactive — cannot log in</option>
          </select>
        </Field>

        {!isEdit && (
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 sm:col-span-2 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              New retailers start with a ₹0 wallet and default service pricing. You can configure custom pricing and add
              balance right after creation.
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}

/* ---------- Page ---------- */
export default function Retailers() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [formFor, setFormFor] = useState(null) // null = closed, {} = create, retailer = edit
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])

  // Wait 400ms after typing before calling the API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    api
      .get('/admin/retailers', { params: { search: debouncedSearch, status, page } })
      .then((res) => {
        if (cancelled) return
        const { data, ...pagination } = res.data
        setRows(data)
        setMeta(pagination)
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err, 'Unable to load retailers.')))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, status, page, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  const handleSaved = (message) => {
    setFormFor(null)
    setToast({ type: 'success', text: message })
    reload()
  }

  const toggleStatus = async (retailer) => {
    const next = retailer.status === 'active' ? 'inactive' : 'active'
    const question =
      next === 'inactive'
        ? `Deactivate ${retailer.business_name}? They will be signed out and cannot log in.`
        : `Activate ${retailer.business_name}?`

    if (!window.confirm(question)) return

    try {
      await api.put(`/admin/retailers/${retailer.id}`, { status: next })
      setToast({ type: 'success', text: `Retailer ${next === 'active' ? 'activated' : 'deactivated'}.` })
      reload()
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err) })
    }
  }

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={closeToast} />

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Retailers</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create and manage retailer accounts.</p>
        </div>
        <button
          onClick={() => setFormFor({})}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <Plus className="h-4 w-4" /> Add retailer
        </button>
      </div>

      <Card>
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business, owner, email or mobile"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className={`${inputClass} sm:w-44`}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th className="pb-3 font-semibold">Business</th>
                <th className="pb-3 font-semibold">Owner</th>
                <th className="pb-3 font-semibold">Mobile</th>
                <th className="pb-3 font-semibold">PAN</th>
                <th className="pb-3 font-semibold">Wallet</th>
                <th className="pb-3 font-semibold">Joined</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr><td colSpan="8" className="py-10 text-center text-slate-400">Loading retailers...</td></tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <Store className="mx-auto mb-2 h-8 w-8" />
                    No retailers found.
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3 font-semibold">{r.business_name}</td>
                    <td className="py-3">
                      <div>{r.user.name}</div>
                      <div className="text-xs text-slate-400">{r.user.email}</div>
                    </td>
                    <td className="py-3">{r.user.mobile}</td>
                    <td className="py-3 font-mono text-xs">{r.pan_masked ?? '-'}</td>
                    <td className="py-3">{formatINR(r.balance)}</td>
                    <td className="py-3">{r.created_at ? formatDate(r.created_at) : '-'}</td>
                    <td className="py-3"><StatusBadge status={r.status} /></td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setFormFor(r)}
                          title="Edit"
                          aria-label={`Edit ${r.business_name}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleStatus(r)}
                          title={r.status === 'active' ? 'Deactivate' : 'Activate'}
                          aria-label={`${r.status === 'active' ? 'Deactivate' : 'Activate'} ${r.business_name}`}
                          className={`rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                            r.status === 'active' ? 'text-red-500' : 'text-brand-600'
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} onPage={setPage} />
      </Card>

      {formFor && (
        <RetailerForm
          retailer={formFor.id ? formFor : null}
          onClose={() => setFormFor(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}