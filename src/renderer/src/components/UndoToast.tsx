import { useTodoStore } from '../store'

export default function UndoToast(): JSX.Element | null {
  const { deletedTodo, undoDelete, clearDeletedTodo } = useTodoStore()

  if (!deletedTodo) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 surface-glass rounded-xl shadow-lg animate-slide-up"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <span className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-secondary)' }}>
        已删除「{deletedTodo.title}」
      </span>
      <button
        onClick={undoDelete}
        className="text-xs font-medium whitespace-nowrap transition-colors hover:brightness-110"
        style={{ color: 'var(--accent)' }}
      >
        撤销
      </button>
      <button
        onClick={clearDeletedTodo}
        className="btn-icon"
        style={{ padding: '2px' }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
