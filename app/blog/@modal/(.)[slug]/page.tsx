import BlogModal from '@/components/BlogModal'
import BlogPostContent from '@/components/BlogPostContent'

// Intercepts /blog/[slug] during soft navigation from /blog and shows it as a
// modal over the (blurred) index. Hard loads fall through to the full page.
export default async function BlogPostModal(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params
  return (
    <BlogModal>
      <BlogPostContent slug={slug} />
    </BlogModal>
  )
}
