import { readFileSync } from 'fs'
import { join } from 'path'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

function parsePost(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { title: '', content: raw }
  const frontmatter = match[1]
  const content = match[2].trim()
  const titleMatch = frontmatter.match(/^(?:page-)?title:\s*(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : ''
  return { title, content }
}

function readPost(slug: string) {
  try {
    const filePath = join(process.cwd(), '_posts', `${slug}.html`)
    return readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await props.params
  const raw = readPost(slug)
  if (!raw) return { title: 'devlog' }
  const { title } = parsePost(raw)
  return { title: `${title} — devlog` }
}

export default async function DevlogPostPage(
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params
  const raw = readPost(slug)
  if (!raw) notFound()

  const { title, content } = parsePost(raw!)

  return (
    <main className="devlog-post">
      <article dangerouslySetInnerHTML={{ __html: content }} />
    </main>
  )
}
