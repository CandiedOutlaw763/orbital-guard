import { computeBatchConjunctions } from '@/lib/orbital-store'

export async function POST(req: Request) {
  try {
    const { norad_ids } = await req.json()
    if (!Array.isArray(norad_ids)) {
      return Response.json([])
    }
    const results = computeBatchConjunctions(norad_ids)
    return Response.json(results)
  } catch (e) {
    return Response.json([])
  }
}
