import { TodoCategory } from '../types'

const badgeClass: Record<TodoCategory, string> = {
  feature: 'badge badge-feature',
  bug: 'badge badge-bug',
  optimization: 'badge badge-optimization'
}

const labels: Record<TodoCategory, string> = {
  feature: 'Feature',
  bug: 'Bug',
  optimization: '优化'
}

export default function CategoryBadge({ category }: { category: TodoCategory }): JSX.Element {
  return <span className={badgeClass[category]}>{labels[category]}</span>
}
