import { listObjects } from '@/lib/orbital-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(listObjects())
}
