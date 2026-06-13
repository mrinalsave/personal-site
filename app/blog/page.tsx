import type { Metadata } from 'next'
import BlogIndex from '@/components/BlogIndex'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'blog',
  description: "devlogs, travel diaries, and thoughts — mrinal's blog.",
  alternates: { canonical: 'https://www.mrinalsave.com/blog' },
}

export default function BlogIndexPage() {
  return <BlogIndex posts={getAllPosts()} />
}
