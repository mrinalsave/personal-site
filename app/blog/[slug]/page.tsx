import type { Metadata } from 'next'
import { getAllPosts, getPost } from '@/lib/blog'
import BlogPostContent from '@/components/BlogPostContent'

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await props.params
  const post = getPost(slug)
  if (!post) return { title: 'blog' }
  return {
    title: post.meta.title,
    description: post.meta.summary || undefined,
    alternates: { canonical: `https://www.mrinalsave.com/blog/${slug}` },
    openGraph: {
      title: post.meta.title,
      description: post.meta.summary || undefined,
      images: post.meta.cover ? [{ url: post.meta.cover }] : undefined,
    },
  }
}

export default async function BlogPostPage(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params
  return (
    <main className="blog-post">
      <BlogPostContent slug={slug} />
    </main>
  )
}
