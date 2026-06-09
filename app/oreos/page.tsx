export const dynamic = 'force-dynamic'

import { getOreoFlavors, getOreoReviewers } from '@/lib/queries'
import type { OreoFlavorWithReviews, OreoReviewer } from '@/lib/types'

export default async function OreosPage() {
  const [flavors, reviewers]: [OreoFlavorWithReviews[], OreoReviewer[]] =
    await Promise.all([getOreoFlavors(), getOreoReviewers()])

  return (
    <main style={{ paddingTop: '52px' }}>
      {/* Phase 5: OreoDashboard with Chart.js — flavors + reviewers data ready */}
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-retro)', fontSize: '1.2rem' }}>
          oreo dashboard
        </p>
        <p style={{ opacity: 0.5, fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {flavors.length} flavors · {reviewers.length} reviewers · full UI coming soon
        </p>
      </div>
    </main>
  )
}
