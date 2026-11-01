import { Construction } from 'lucide-react'

export default function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center dark:border-slate-700 dark:bg-slate-900">
      <Construction className="h-10 w-10 text-slate-400" />
      <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This screen will be built in an upcoming step.</p>
    </div>
  )
}