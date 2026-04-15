import { TodoCategory } from '../types'

const categoryConfig: Record<TodoCategory, { label: string; className: string }> = {
  feature: { label: 'Feature', className: 'bg-blue-900/50 text-blue-300 border-blue-700/50' },
  bug: { label: 'Bug', className: 'bg-red-900/50 text-red-300 border-red-700/50' },
  optimization: { label: '优化', className: 'bg-amber-900/50 text-amber-300 border-amber-700/50' }
}

export default function CategoryBadge({ category }: { category: TodoCategory }): JSX.Element {
  const config = categoryConfig[category]
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border ${config.className}`}
    >
      {config.label}
    </span>
  )
}
