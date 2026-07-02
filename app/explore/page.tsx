'use client'
import { useState } from 'react'
import Link from 'next/link'

const FILTERS = [
  'all', 'catalog', 'chart.js', 'data visualization',
  'food', 'games', 'music', 'three.js', 'webgl',
]

const PROJECTS = [
  { name: 'nintendo switch games',  href: '/nintendo-games/',   tags: ['games', 'catalog'] },
  { name: 'songs in rotation',      href: '/songs-in-rotation/', tags: ['music', 'catalog'] },
  { name: 'art gallery',            href: '/art/',              tags: ['masonry.js', 'art', 'catalog'] },
  { name: 'oreo dashboard',         href: '/oreos/',            tags: ['chart.js', 'data visualization', 'catalog', 'food'] },
  { name: 'favorite pokémon cards', href: '/pokemon-cards/',    tags: ['vanilla-tilt.js', 'games', 'catalog'] },
  { name: 'audio visualizer',       href: '/audio-visualizer/', tags: ['three.js', 'webgl', 'music'] },
]

const COMING_SOON = [
  'fridge magnets',
  'cafe hopping',
  'ガシャポン',
  'snacks',
]

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState('all')

  const isVisible = (tags: string[]) =>
    activeFilter === 'all' || tags.includes(activeFilter)

  return (
    <div className="explore-page">
      <div className="explore-wrap">
        <div className="page-header">
          <h1>explore</h1>
        </div>

        <div className="filter-bar">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-btn${activeFilter === f ? ' active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="project-grid">
          {PROJECTS.map(p => (
            <Link
              key={p.name}
              href={p.href}
              className={`project-card${!isVisible(p.tags) ? ' hidden' : ''}`}
            >
              <span className="card-name">{p.name}</span>
              <div className="card-tags">
                {p.tags.map(t => (
                  <span key={t} className="card-tag">{t}</span>
                ))}
              </div>
            </Link>
          ))}

          {activeFilter === 'all' && COMING_SOON.map(name => (
            <div key={name} className="project-card project-card--coming-soon">
              <span className="card-name">{name}</span>
              <div className="card-tags">
                <span className="card-tag card-tag--coming-soon">coming soon</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
