import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'

const BLOG_DIR = join(process.cwd(), 'content', 'blog')

export interface PostMeta {
  slug: string
  title: string
  date: string          // ISO date, e.g. "2026-03-07"
  category: string       // primary type: devlog | travel | review | ...
  tags: string[]
  summary: string
  cover?: string         // optional /public path for cards & OG
}

export interface Post {
  meta: PostMeta
  content: string        // raw MDX body
}

function toMeta(slug: string, data: Record<string, unknown>): PostMeta {
  const rawDate = data.date
  const date =
    rawDate instanceof Date
      ? rawDate.toISOString().slice(0, 10)
      : String(rawDate ?? '')
  return {
    slug,
    title: String(data.title ?? slug),
    date,
    category: String(data.category ?? 'devlog'),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    summary: String(data.summary ?? ''),
    cover: data.cover ? String(data.cover) : undefined,
  }
}

function readFiles(): string[] {
  try {
    return readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'))
  } catch {
    return []
  }
}

export function getAllPosts(): PostMeta[] {
  return readFiles()
    .map(file => {
      const slug = file.replace(/\.mdx$/, '')
      const raw = readFileSync(join(BLOG_DIR, file), 'utf-8')
      const { data } = matter(raw)
      return toMeta(slug, data)
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getPost(slug: string): Post | null {
  try {
    const raw = readFileSync(join(BLOG_DIR, `${slug}.mdx`), 'utf-8')
    const { data, content } = matter(raw)
    return { meta: toMeta(slug, data), content }
  } catch {
    return null
  }
}

export function getAllCategories(): string[] {
  const set = new Set(getAllPosts().map(p => p.category))
  return Array.from(set).sort()
}

export function getAllTags(): string[] {
  const set = new Set<string>()
  for (const post of getAllPosts()) post.tags.forEach(t => set.add(t))
  return Array.from(set).sort()
}
