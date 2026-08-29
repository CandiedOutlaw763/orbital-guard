import { addRandom } from '@/lib/orbital-store'

export async function POST() {
  return Response.json(addRandom())
}
