import { addObject } from '@/lib/orbital-store'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const noradId = Number.parseInt(request.nextUrl.searchParams.get('norad_id') ?? '', 10)
  if (!Number.isFinite(noradId)) {
    return Response.json({ error: 'norad_id is required' }, { status: 400 })
  }
  return Response.json(addObject(noradId))
}
