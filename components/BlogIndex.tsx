'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { PostMeta } from '@/lib/blog'

const PAGE_SIZE = 10

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function BlogIndex({ posts }: { posts: PostMeta[] }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return posts
    return posts.filter(p => {
      const haystack = [p.title, p.summary, p.category, ...p.tags].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [posts, query])

  // any filter change returns to the first page
  useEffect(() => {
    setPage(1)
  }, [query])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const pageItems = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const goTo = (n: number) => {
    setPage(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="blog-page">
      <div className="blog-wrap">
        <div className="page-header">
          <h1>blog</h1>
        </div>

        <div className="blog-search">
          <input
            type="search"
            className="blog-search-input"
            placeholder="search posts, tags…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="search posts"
          />
          {query && (
            <button className="blog-search-clear" onClick={() => setQuery('')} aria-label="clear search">
              ✕
            </button>
          )}
        </div>

        <ul className="blog-list">
          {pageItems.map(post => (
            <li key={post.slug} className="blog-card">
              <div className="blog-card-meta">
                <span className="blog-card-date">{formatDate(post.date)}</span>
              </div>
              <h2 className="blog-card-title">
                <Link href={`/blog/${post.slug}`} scroll={false}>
                  {post.title}
                </Link>
              </h2>
              {post.summary && <p className="blog-card-summary">{post.summary}</p>}
              {post.tags.length > 0 && (
                <div className="card-tags">
                  {post.tags.map(t => (
                    <button
                      key={t}
                      type="button"
                      className="card-tag card-tag--button"
                      onClick={() => setQuery(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {visible.length === 0 && <p className="blog-empty">no posts match “{query}”.</p>}

        {totalPages > 1 && (
          <nav className="blog-pagination" aria-label="pagination">
            <button
              className="blog-page-btn"
              onClick={() => goTo(current - 1)}
              disabled={current === 1}
            >
              ← prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`blog-page-btn${n === current ? ' active' : ''}`}
                onClick={() => goTo(n)}
                aria-current={n === current ? 'page' : undefined}
              >
                {n}
              </button>
            ))}
            <button
              className="blog-page-btn"
              onClick={() => goTo(current + 1)}
              disabled={current === totalPages}
            >
              next →
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
