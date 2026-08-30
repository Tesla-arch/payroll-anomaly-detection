import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiHelpCircle, FiMessageCircle, FiSend, FiX } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import HelpArticleBody from './HelpArticleBody'
import {
  MANUAL_HREF,
  getStarterChips,
  roleNote,
  visibleLinks,
} from '../data/helpKb'
import { matchHelp } from '../lib/matchHelp'

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function greetingText(mode, user) {
  if (mode === 'auth') {
    return 'I’m the SMS Guide. I can help you sign in — email and password for officers and parents, or Staff ID for teachers and accountants.'
  }
  const name = user?.name?.split(' ')[0] || 'there'
  const desk = user?.role?.name || 'your'
  return `Hello, ${name}. I’m the SMS Guide for your ${desk} desk. Ask how to get somewhere, or pick a topic.`
}

export default function HelpChat({ mode = 'app' }) {
  const { user, hasRole } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const titleId = useId()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const chips = useMemo(
    () => getStarterChips({ mode, role: user?.role?.slug, pathname: location.pathname }),
    [mode, user?.role?.slug, location.pathname],
  )

  const [messages, setMessages] = useState(() => [
    { id: 'hello', from: 'bot', text: greetingText(mode, user) },
  ])

  useEffect(() => {
    if (!open) return undefined
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, open])

  const ask = (query) => {
    const text = String(query || '').trim()
    if (!text) return
    setDraft('')
    const { matches, fallback } = matchHelp(text, {
      pathname: location.pathname,
      publicOnly: mode === 'auth',
    })

    const reply = fallback
      ? {
          id: nextId(),
          from: 'bot',
          text: 'I don’t have a topic that matches that yet. Try one of these, or download the user manual.',
          chips,
          pdf: true,
        }
      : (() => {
          const top = matches[0].article
          const related = matches.slice(1).map((row) => row.article)
          return {
            id: nextId(),
            from: 'bot',
            article: top,
            note: roleNote(top, mode === 'app' ? hasRole : null),
            links: visibleLinks(top.links, mode === 'app' ? hasRole : null),
            related,
            readMore: mode === 'app',
          }
        })()

    setMessages((current) => [
      ...current,
      { id: nextId(), from: 'user', text },
      reply,
    ])
    setOpen(true)
  }

  const openLink = (link) => {
    if (link.download || link.to.endsWith('.pdf')) {
      const anchor = document.createElement('a')
      anchor.href = link.to
      anchor.download = 'School-SMS-User-Manual.pdf'
      anchor.click()
      return
    }
    setOpen(false)
    navigate(link.to)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
      {open && (
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-2xl sm:w-[22rem]"
          style={{ background: 'var(--surface)', color: 'var(--ink)', boxShadow: '0 18px 40px rgb(15 23 42 / 0.18)', outline: '1px solid var(--line)' }}
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3" style={{ background: 'var(--brand)', color: 'var(--brand-fg)' }}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="bg-accent grid h-8 w-8 place-items-center rounded-full text-xs font-bold">SMS</span>
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-sm font-semibold">SMS Guide</h2>
                <p className="text-[11px] opacity-80">Role-aware help · no internet AI</p>
              </div>
            </div>
            <button
              type="button"
              className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close help"
            >
              <FiX size={18} />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm ${message.from === 'user' ? 'rounded-br-md text-white' : 'rounded-bl-md ring-1'}`}
                  style={message.from === 'user'
                    ? { background: 'var(--primary)' }
                    : { background: 'var(--surface-2)', color: 'var(--ink)', boxShadow: '0 0 0 1px var(--line)' }}
                >
                  {message.text && <p>{message.text}</p>}
                  {message.article && (
                    <div className="space-y-2">
                      <p className="font-semibold" style={{ color: 'var(--heading)' }}>{message.article.title}</p>
                      <HelpArticleBody article={message.article} note={message.note} />
                    </div>
                  )}
                  {message.links?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.links.map((link) => (
                        <button
                          key={link.to + link.label}
                          type="button"
                          className="btn-primary px-3 py-1.5 text-xs"
                          onClick={() => openLink(link)}
                        >
                          {link.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {message.readMore && message.article && (
                    <button
                      type="button"
                      className="mt-2 text-xs font-medium underline"
                      style={{ color: 'var(--link)' }}
                      onClick={() => {
                        setOpen(false)
                        navigate(`/help?topic=${message.article.id}`)
                      }}
                    >
                      Read more on the Help page
                    </button>
                  )}
                  {message.pdf && (
                    <a
                      href={MANUAL_HREF}
                      download="School-SMS-User-Manual.pdf"
                      className="mt-2 inline-block text-xs font-medium underline"
                      style={{ color: 'var(--link)' }}
                    >
                      Download the user manual (PDF)
                    </a>
                  )}
                  {message.related?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.related.map((article) => (
                        <button
                          key={article.id}
                          type="button"
                          className="rounded-full px-2.5 py-1 text-xs ring-1"
                          style={{ background: 'var(--surface)', boxShadow: '0 0 0 1px var(--line)' }}
                          onClick={() => ask(article.title)}
                        >
                          {article.title}
                        </button>
                      ))}
                    </div>
                  )}
                  {message.chips?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.chips.map((chip) => (
                        <button
                          key={chip.query}
                          type="button"
                          className="rounded-full px-2.5 py-1 text-xs ring-1"
                          style={{ background: 'var(--surface)', boxShadow: '0 0 0 1px var(--line)' }}
                          onClick={() => ask(chip.query)}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {mode === 'app' && (
            <div className="border-t px-3 py-2 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
              <button type="button" className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: 'var(--link)' }} onClick={() => { setOpen(false); navigate('/help') }}>
                <FiHelpCircle size={14} /> Browse all topics
              </button>
            </div>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t px-3 py-2" style={{ borderColor: 'var(--line)' }}>
              {chips.map((chip) => (
                <button
                  key={chip.query}
                  type="button"
                  className="rounded-full px-2.5 py-1 text-xs"
                  style={{ background: 'var(--surface-2)', color: 'var(--ink)', boxShadow: '0 0 0 1px var(--line)' }}
                  onClick={() => ask(chip.query)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex gap-2 border-t p-3"
            style={{ borderColor: 'var(--line)' }}
            onSubmit={(event) => {
              event.preventDefault()
              ask(draft)
            }}
          >
            <input
              ref={inputRef}
              className="input min-h-11 flex-1 text-sm"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask how to use the portal…"
              aria-label="Ask the SMS Guide"
            />
            <button type="submit" className="btn-primary min-h-11 min-w-11 px-0" aria-label="Send question">
              <FiSend size={16} />
            </button>
          </form>
        </section>
      )}

      {!open && (
        <button
          type="button"
          className="help-chat-pulse pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-lg"
          style={{ background: 'var(--brand)', color: 'var(--brand-fg)' }}
          onClick={() => setOpen(true)}
          aria-label="Open SMS Guide"
        >
          <span className="bg-accent grid h-8 w-8 place-items-center rounded-full">
            <FiMessageCircle size={16} />
          </span>
          <span className="pr-1">Ask SMS</span>
        </button>
      )}
    </div>
  )
}
