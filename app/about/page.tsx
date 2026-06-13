import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'about me',
  description: "about mrinal, a senior software engineer and digital artist.",
  alternates: { canonical: 'https://www.mrinalsave.com/about' },
}

export default function AboutPage() {
  return (
    <main className="about-layout">
      <div className="left">
        <p className="eyebrow">hi there!</p>
        <h1>about me</h1>
        <p className="subtitle">
          💼 i&apos;m mrinal, a senior software engineer based in the DMV. i have a bachelor&apos;s degree in
          computer science from virginia tech (2020) and just recently completed a masters in computer science
          with an artificial intelligence specialization from georgia tech (2025) while working full-time.

          i work on the integration of new IoT protocols into smart home platforms, and have led two successful
          large-scale products from ideation to launch — these experiences taught me a great deal
          about product development, cross-team collaboration, and leadership.

          <br /><br />

          🎪 when i was younger, the internet was a playground for creativity and exploration, aspects which i feel have been
          somewhat lost in the modernization and standardization of the web.
          i want to bring some of that magic back by applying my passion for the intersection of art and technology
          to build fun and whimsical digital experiences.
          this site is a collection of projects, learnings, and thoughts in those spaces!

          <br /><br />

          🎨 outside of work, i enjoy drawing, games, collecting trinkets, baking, and music.
          i drew a lot in my earlier years, but somewhere along the road, i just stopped pursuing it.
          during the pandemic though, i started an online art account (15K on Tiktok and 1.8K on Twitter), which reignited that passion.
          i lost some momentum during grad school, but i&apos;m getting back into it again and hoping to continue growing my artist identity.{' '}
          <a href="/art/">check out some of my work! ☺︎</a>

          <br /><br />

          🥂 thanks for stopping by — i hope you find something here that sparks your interest!
        </p>
      </div>

      <div className="right">
        <figure className="image-figure">
          <img src="/assets/images/gogh.webp" alt="avatars by gogh" />
          <figcaption>
            avatars by{' '}
            <a href="https://gogh.gg/" target="_blank" rel="noopener noreferrer">
              gogh
            </a>
          </figcaption>
        </figure>
      </div>
    </main>
  )
}
