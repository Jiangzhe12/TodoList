import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDateHeader(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return `今天 - ${format(date, 'M月d日')}`
  if (isYesterday(date)) return `昨天 - ${format(date, 'M月d日')}`
  return format(date, 'M月d日 EEEE', { locale: zhCN })
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'M月d日', { locale: zhCN })
}
