import Link from 'next/link'
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'react'

/* Markdown images route through here so posts get consistent, responsive,
   dark-aware styling without per-image legwork. Inline styles/classNames
   passed from MDX still win (e.g. the inline pikachu gif). */
function BlogImage({ className, alt = '', ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={['blog-img', className].filter(Boolean).join(' ')} alt={alt} {...rest} />
}

/* Internal links use next/link for client navigation; external links open
   in a new tab. */
function BlogLink({ href = '', children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isInternal = href.startsWith('/') || href.startsWith('#')
  if (isInternal) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  )
}

export const mdxComponents = {
  img: BlogImage,
  a: BlogLink,
}
