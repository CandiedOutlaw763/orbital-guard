import { getCatalogById, toClientObject } from '@/lib/orbital-store'

export async function POST(req: Request) {
  try {
    const { norad_ids } = await req.json()
    if (!Array.isArray(norad_ids)) {
      return Response.json([])
    }

    const catalogById = getCatalogById()
    const results = []
    
    for (const id of norad_ids) {
      const entry = catalogById.get(id)
      if (entry) {
        results.push(toClientObject({ ...entry, type: 'UNKNOWN', size: 'UNKNOWN' }))
      }
    }
    
    return Response.json(results)
  } catch (e) {
    return Response.json([])
  }
}
