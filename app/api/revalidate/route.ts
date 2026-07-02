import { revalidateTag } from 'next/cache'

// Called by the Vercel cron on schedule, or manually via:
//   curl -X GET https://<your-domain>/api/revalidate \
//        -H "Authorization: Bearer <CRON_SECRET>"
//
// CRON_SECRET must be set manually as a project env var in Vercel. Once set,
// Vercel includes it in the Authorization header when invoking the cron job.
// Without it, this route rejects every request (including the cron) with 401.
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
