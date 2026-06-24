export const dynamic = 'force-dynamic'

import { getOreoFlavors, getOreoReviewers } from '@/lib/queries'
import type { OreoFlavorWithReviews, OreoReviewer } from '@/lib/types'
import OreoDashboard from '@/components/OreoDashboard'

export default async function OreosSlugPage() {
  const [flavors, reviewers]: [OreoFlavorWithReviews[], OreoReviewer[]] =
    await Promise.all([getOreoFlavors(), getOreoReviewers()])

  return <OreoDashboard flavors={flavors} reviewers={reviewers} />
}
