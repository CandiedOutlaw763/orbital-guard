import { clearObjects } from '@/lib/orbital-store'

export async function POST() {
  return Response.json(clearObjects())
}
