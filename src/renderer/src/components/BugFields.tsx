interface BugFieldsProps {
  bugCause: string
  fixPlan: string
  onChange: (field: 'bugCause' | 'fixPlan', value: string) => void
}

export default function BugFields({ bugCause, fixPlan, onChange }: BugFieldsProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Bug 原因</label>
        <textarea
          value={bugCause}
          onChange={(e) => onChange('bugCause', e.target.value)}
          className="w-full px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
          rows={2}
          placeholder="描述 Bug 产生的原因..."
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">修复方案</label>
        <textarea
          value={fixPlan}
          onChange={(e) => onChange('fixPlan', e.target.value)}
          className="w-full px-2 py-1.5 text-sm bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
          rows={2}
          placeholder="描述修复方案..."
        />
      </div>
    </div>
  )
}
