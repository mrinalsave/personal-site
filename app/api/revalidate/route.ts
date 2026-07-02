import { revalidateTag } from 'next/cache'

// Called by the Vercel cron on schedule, or manually via:
//   curl -X GET https://<your-domain>/api/revalidate \
//        -H "Authorization: Bearer <CRON_SECRET>"
//
// Vercel automatically injects CRON_SECRET and sends the Authorization header
// when this route is invoked by the cron job — no manual setup needed.
// For local testing, set CRON_SECRET in .env.local and pass it manually.

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')

  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  revalidateTag('music')
  console.log('[revalidate] music cache cleared')
  return Response.json({ revalidated: true, tag: 'music' })
}
