import { Todo } from '../types'
import { getToday } from './dates'

export function carryOverTodos(todos: Todo[], lastOpenDate: string): Todo[] {
  const today = getToday()
  if (lastOpenDate === today) return todos

  return todos.map((todo) => {
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
