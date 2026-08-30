import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiDownload, FiSearch } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import HelpArticleBody from '../components/HelpArticleBody'
import {
  MANUAL_HREF,
  articleById,
  articlesForBrowse,
  helpCategories,
  roleNote,
  visibleLinks,
} from '../data/helpKb'
import { matchHelp } from '../lib/matchHelp'

export default function HelpPage() {
  const { hasRole } = useAuth()
  const [params, setParams] = useSearchParams()
  const topic = params.get('topic')
  const article = topic ? articleById[topic] : null
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [category, setCategory] = useState('all')

  const browse = useMemo(() => articlesForBrowse(hasRole), [hasRole])
  const pool = useMemo(() => {
    const full = [...browse.mine, ...browse.rest]
    return showAll || query.trim() ? full : browse.mine
  }, [browse, showAll, query])

  const filtered = useMemo(() => {
    const byCategory = category === 'all' ? pool : pool.filter((item) => item.category === category)
    const q = query.trim()
    if (!q) return byCategory
    const { matches, fallback } = matchHelp(q, { pathname: '/help' })
    const allowed = new Set(byCategory.map((item) => item.id))
    if (fallback) {
      const needle = q.toLowerCase()
      return byCategory.filter((item) => `${item.title} ${item.keywords.join(' ')}`.toLowerCase().includes(needle))
    }
    return matches.map((row) => row.article).filter((item) => allowed.has(item.id))
  }, [pool, category, query])

  const openTopic = (id) => {
    const copy = new URLSearchParams(params)
    copy.set('topic', id)
    setParams(copy)
  }

  const clearTopic = () => {
    const copy = new URLSearchParams(params)
    copy.delete('topic')
    setParams(copy)
  }

  if (topic && !article) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-slate-500">That help topic was not found.</p>
        <button type="button" className="btn-primary" onClick={clearTopic}>Back to all topics</button>
      </div>
    )
  }

  if (article) {
    const links = visibleLinks(article.links, hasRole)
    const note = roleNote(article, hasRole)
    const related = (article.related || []).map((id) => articleById[id]).filter(Boolean)

    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <button type="button" className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--link)' }} onClick={clearTopic}>
          <FiArrowLeft /> All topics
        </button>
        <article className="card space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
            {helpCategories.find((item) => item.id === article.category)?.label || 'Help'}
          </p>
          <h3 className="text-2xl font-semibold" style={{ color: 'var(--heading)' }}>{article.title}</h3>
          <HelpArticleBody article={article} note={note} />
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {links.map((link) => (
                <Link key={link.to + link.label} to={link.to} className="btn-primary px-3 py-2 text-sm">
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </article>
        {related.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Related topics</p>
            <div className="flex flex-wrap gap-2">
              {related.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="rounded-full px-3 py-1.5 text-sm ring-1"
                  style={{ background: 'var(--surface)', color: 'var(--ink)', boxShadow: '0 0 0 1px var(--line)' }}
                  onClick={() => openTopic(item.id)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <a
          href={MANUAL_HREF}
          download="School-SMS-User-Manual.pdf"
          className="inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--link)' }}
        >
          <FiDownload /> Download the user manual (PDF)
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">SMS Guide</p>
          <h3 className="mt-1 text-2xl font-semibold text-emerald-950">Help</h3>
          <p className="mt-1 text-sm text-slate-500">
            Short, role-aware answers for navigating the portal. Pick a topic or search — the same guide as the chat bubble.
          </p>
        </div>
        <a
          href={MANUAL_HREF}
          download="School-SMS-User-Manual.pdf"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-emerald-900 ring-1 ring-stone-200 hover:bg-white"
        >
          <FiDownload /> Manual (PDF)
        </a>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help topics…"
            aria-label="Search help topics"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showAll} onChange={(event) => setShowAll(event.target.checked)} />
          Show all topics
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`rounded-full px-3 py-1.5 text-sm ${category === 'all' ? 'bg-emerald-900 text-white' : 'bg-white text-slate-600 ring-1 ring-stone-200'}`}
        >
          All
        </button>
        {helpCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCategory(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${category === item.id ? 'bg-emerald-900 text-white' : 'bg-white text-slate-600 ring-1 ring-stone-200'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openTopic(item.id)}
            className="card text-left transition hover:ring-emerald-700/30"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {helpCategories.find((entry) => entry.id === item.category)?.label}
            </p>
            <p className="mt-1 font-semibold text-emerald-950">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {Array.isArray(item.body[0]) ? item.body[0][0] : item.body[0]}
            </p>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-slate-500">No topics match that search. Try another phrase or download the PDF manual.</p>
      )}
    </div>
  )
}
