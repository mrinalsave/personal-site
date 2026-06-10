import { readdirSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'

function getPosts() {
  const dir = join(process.cwd(), '_posts')
  return readdirSync(dir)
    .filter(f => f.endsWith('.html'))
    .map(f => {
      const slug = f.replace(/\.html$/, '')
      const [year, month, day, ...rest] = slug.split('-')
      const date = `${year}-${month}-${day}`
      const title = rest.join(' ').replace(/-/g, ' ')
      return { slug, date, title }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export default function DevlogIndexPage() {
  const posts = getPosts()

  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem', paddingTop: 'calc(var(--header-h) + 2.5rem)' }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: '2rem', letterSpacing: '-0.01em' }}>devlog</h1>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {posts.map(({ slug, date, title }) => (
          <li key={slug}>
            <Link
              href={`/devlog/${slug}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '2px', textDecoration: 'none', color: 'inherit' }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.05em' }}>{date}</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '1rem', fontWeight: 600 }}>{title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
