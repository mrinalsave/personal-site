import type { Metadata } from 'next'
import BlogIndex from '@/components/BlogIndex'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'blog — mrinal save',
  description: 'what\'s on my mind',
}

export default function BlogIndexPage() {
  return <BlogIndex posts={getAllPosts()} />
}
