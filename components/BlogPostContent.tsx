import { notFound } from 'next/navigation'
import { compileMDX } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypePrettyCode from 'rehype-pretty-code'
import { getPost } from '@/lib/blog'
import { mdxComponents } from '@/components/MDXComponents'
import BlogBackToTop from '@/components/BlogBackToTop'

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/* Shared post body — rendered both as a full page (app/blog/[slug]) and inside
   the intercepted modal (app/blog/@modal/(.)[slug]). */
export default async function BlogPostContent({ slug }: { slug: string }) {
  const post = getPost(slug)
  if (!post) notFound()

  const { content } = await compileMDX({
    source: post.content,
    components: mdxComponents,
    options: {
      blockJS: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypePrettyCode,
            { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false },
          ],
        ],
      },
    },
  })

  const { title, date, tags } = post.meta

  return (
    <>
      <div className="blog-post-header">
        <div className="blog-post-meta">
          <span className="blog-card-date">{formatDate(date)}</span>
        </div>
        <h1 className="blog-post-title">{title}</h1>
        {tags.length > 0 && (
          <div className="card-tags">
            {tags.map(t => (
              <span key={t} className="card-tag">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <article className="post-content">{content}</article>
      <BlogBackToTop />
    </>
  )
}
