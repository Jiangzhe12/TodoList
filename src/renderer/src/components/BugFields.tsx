interface BugFieldsProps {
  bugCause: string
  fixPlan: string
  onChange: (field: 'bugCause' | 'fixPlan', value: string) => void
}

export default function BugFields({ bugCause, fixPlan, onChange }: BugFieldsProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Bug 原因</label>
        <textarea
          value={bugCause}
          onChange={(e) => onChange('bugCause', e.target.value)}
          className="input-field resize-none"
          style={{ fontSize: '13px' }}
          rows={2}
          placeholder="描述 Bug 产生的原因..."
        />
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>修复方案</label>
        <textarea
          value={fixPlan}
          onChange={(e) => onChange('fixPlan', e.target.value)}
          className="input-field resize-none"
          style={{ fontSize: '13px' }}
          rows={2}
          placeholder="描述修复方案..."
        />
      </div>
    </div>
  )
}
