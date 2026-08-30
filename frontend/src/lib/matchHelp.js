import {
  articleById,
  articlePlainText,
  getStarterChips,
  helpArticles,
  helpSynonyms,
} from '../data/helpKb'

const STOP = new Set([
  'a', 'an', 'the', 'how', 'do', 'i', 'to', 'for', 'of', 'in', 'on', 'my', 'me',
  'can', 'what', 'where', 'who', 'is', 'are', 'and', 'or', 'please', 'help',
  'with', 'this', 'that', 'does', 'did', 'should', 'would', 'could', 'open',
  'go', 'want', 'need', 'tell', 'show', 'get', 'use', 'using', 'about', 'it',
  'we', 'you', 'your', 'our', 'at', 'from', 'into', 'be', 'am', 'was', 'were',
])

const SCORE_THRESHOLD = 3
const MAX_RESULTS = 3

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token))
    .map((token) => helpSynonyms[token] || token)
}

function unique(tokens) {
  return [...new Set(tokens)]
}

function pathMatches(article, pathname) {
  if (!pathname || !article.paths?.length) return false
  return article.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export function scoreArticle(article, tokens, pathname) {
  const titleTokens = new Set(tokenize(article.title))
  const keywordTokens = new Set((article.keywords || []).flatMap((keyword) => tokenize(keyword)))
  const bodyTokens = new Set(tokenize(articlePlainText(article)))
  const query = tokens.join(' ')

  let score = 0
  let covered = 0
  for (const token of tokens) {
    const inTitle = titleTokens.has(token)
    const inKeywords = keywordTokens.has(token)
    const inBody = bodyTokens.has(token)
    if (inTitle) score += 3
    if (inKeywords) score += 2
    if (inBody) score += 1
    if (inTitle || inKeywords || inBody) covered += 1
  }

  score += covered * 3

  for (const keyword of article.keywords || []) {
    const phrase = tokenize(keyword).join(' ')
    if (phrase && query.includes(phrase)) score += 4
  }

  if (pathMatches(article, pathname)) score += 2

  return score
}

export function matchHelp(query, { pathname = '', publicOnly = false } = {}) {
  const tokens = unique(tokenize(query))
  const pool = publicOnly ? helpArticles.filter((article) => article.public) : helpArticles

  if (!tokens.length) {
    return { matches: [], fallback: true }
  }

  const ranked = pool
    .map((article) => ({ article, score: scoreArticle(article, tokens, pathname) }))
    .filter((row) => row.score >= SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))

  const matches = ranked.slice(0, MAX_RESULTS)
  return { matches, fallback: matches.length === 0 }
}

export { getStarterChips, articleById }
