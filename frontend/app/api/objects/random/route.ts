import { getRandomNoradIds } from '@/lib/orbital-store'

export async function GET() {
  return Response.json({ norad_ids: getRandomNoradIds(20) })
}
