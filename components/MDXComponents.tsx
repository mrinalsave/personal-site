import Link from 'next/link'
import type { AnchorHTMLAttributes } from 'react'
import PhotoSlider from './PhotoSlider'
import BlogImage from './BlogImage'
export type { SlideItem } from './PhotoSlider'

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
  PhotoSlider,
}

// Custom JSX components (non-HTML) must be injected via `scope` in
// next-mdx-remote/rsc so they're available as variables in the MDX module.
export const mdxScope = {
  PhotoSlider,
}
