import { Todo } from '../types'
import { getToday } from './dates'

export function carryOverTodos(todos: Todo[], lastOpenDate: string): Todo[] {
  const today = getToday()
  if (lastOpenDate === today) return todos

  return todos.map((todo) => {
    // Skip already-archived tasks
    if (todo.archived) return todo

    // Auto-archive completed tasks from past dates
    if (todo.status === 'done' && todo.date < today) {
      return {
        ...todo,
        archived: true,
        updatedAt: new Date().toISOString()
      }
    }

    // Carry over incomplete tasks to today
    if (todo.status !== 'done' && todo.date < today) {
      return {
        ...todo,
        date: today,
        updatedAt: new Date().toISOString()
      }
    }

    return todo
  })
}
