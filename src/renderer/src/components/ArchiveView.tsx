import { useMemo } from 'react'
import { useTodoStore } from '../store'
import { formatDate } from '../utils/dates'
import CategoryBadge from './CategoryBadge'

interface ArchiveViewProps {
  onClose: () => void
}

export default function ArchiveView({ onClose }: ArchiveViewProps): JSX.Element {
  const todos = useTodoStore((s) => s.todos)
  const unarchiveTodo = useTodoStore((s) => s.unarchiveTodo)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)

  const archivedTodos = useMemo(
    () =>
      todos
        .filter((t) => t.archived)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [todos]
  )

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end animate-fade-in">
      <div className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 rounded-t-xl max-h-[80%] flex flex-col animate-slide-in-bottom">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            归档列表
            <span className="ml-2 text-zinc-400 dark:text-zinc-500 font-normal">({archivedTodos.length})</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2">
          {archivedTodos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-zinc-400 dark:text-zinc-500">
              <span className="text-2xl mb-2">📦</span>
              <span className="text-sm">暂无归档任务</span>
            </div>
          ) : (
            archivedTodos.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{todo.title}</span>
                    <CategoryBadge category={todo.category} />
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                    {formatDate(todo.date)}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => unarchiveTodo(todo.id)}
                    className="px-2 py-0.5 text-[10px] rounded border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="px-2 py-0.5 text-[10px] rounded border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-400 dark:hover:border-red-500/50 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
