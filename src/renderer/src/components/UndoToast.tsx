import { useTodoStore } from '../store'

export default function UndoToast(): JSX.Element | null {
  const { deletedTodo, undoDelete, clearDeletedTodo } = useTodoStore()

  if (!deletedTodo) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg animate-slide-up">
      <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-[180px]">
        已删除「{deletedTodo.title}」
      </span>
      <button
        onClick={undoDelete}
        className="text-xs font-medium text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 whitespace-nowrap"
      >
        撤销
      </button>
      <button
        onClick={clearDeletedTodo}
        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs"
      >
        ✕
      </button>
    </div>
  )
}
