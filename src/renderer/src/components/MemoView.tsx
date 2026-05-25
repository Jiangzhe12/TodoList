import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTodoStore } from '../store'
import { useImagePaste } from '../utils/useImagePaste'
import { markdownUrlTransform } from '../utils/markdownUrl'

export default function MemoView(): JSX.Element {
  const memo = useTodoStore((s) => s.memo)
  const setMemo = useTodoStore((s) => s.setMemo)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [justCopied, setJustCopied] = useState(false)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  const insertAtCursor = (insert: string): void => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = memo.slice(0, start) + insert + memo.slice(end)
    setMemo(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + insert.length
      ta.selectionStart = ta.selectionEnd = pos
    })
  }

  const { onPaste, error: pasteError } = useImagePaste({
    onImage: ({ url }) => {
      insertAtCursor(`![](${url})`)
    }
  })

  useEffect(() => {
    if (mode !== 'edit') return
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    ta.setSelectionRange(memo.length, memo.length)
    // Only on mount / mode switch back to edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = memo.slice(0, start) + '  ' + memo.slice(end)
      setMemo(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  const insertTimestamp = (): void => {
    const ta = textareaRef.current
    if (!ta) return
    const now = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const prefix = start === 0 || memo[start - 1] === '\n' ? '' : '\n'
    const insert = `${prefix}${ts} `
    const next = memo.slice(0, start) + insert + memo.slice(end)
    setMemo(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + insert.length
      ta.selectionStart = ta.selectionEnd = pos
    })
  }

  const copyAll = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(memo)
    } catch {
      const el = document.createElement('textarea')
      el.value = memo
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setJustCopied(true)
    setTimeout(() => setJustCopied(false), 1500)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            便签
          </span>
          <div className="flex items-center gap-0.5 no-drag" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1px' }}>
            <button
              onClick={() => setMode('edit')}
              className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
              style={{
                background: mode === 'edit' ? 'var(--accent-soft)' : 'transparent',
                color: mode === 'edit' ? 'var(--accent)' : 'var(--text-muted)'
              }}
            >
              编辑
            </button>
            <button
              onClick={() => setMode('preview')}
              className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
              style={{
                background: mode === 'preview' ? 'var(--accent-soft)' : 'transparent',
                color: mode === 'preview' ? 'var(--accent)' : 'var(--text-muted)'
              }}
            >
              预览
            </button>
          </div>
        </div>
        <div className="flex items-center gap-0.5 no-drag">
          <button onClick={insertTimestamp} className="btn-icon" title="插入当前时间">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
          </button>
          <button onClick={copyAll} className={`btn-icon ${justCopied ? 'active' : ''}`} title={justCopied ? '已复制' : '复制全部'}>
            {justCopied ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          placeholder="随便写点什么… (粘贴图片自动插入)"
          className="flex-1 w-full px-4 py-3 resize-none outline-none"
          style={{
            background: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            fontSize: '13px',
            lineHeight: '1.7'
          }}
          spellCheck={false}
        />
      ) : (
        <div
          className="flex-1 overflow-auto px-4 py-3 prose-mini"
          style={{ color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.7' }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform}>
            {memo || '*（空）*'}
          </ReactMarkdown>
        </div>
      )}

      <div
        className="px-3 py-1 flex items-center justify-between text-[11px]"
        style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}
      >
        <span style={{ color: pasteError ? '#ef4444' : 'transparent' }}>
          {pasteError ?? '·'}
        </span>
        <span>{memo.length} 字</span>
      </div>
    </div>
  )
}
