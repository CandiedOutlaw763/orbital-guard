import { searchCatalog } from '@/lib/orbital-store'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? ''
  return Response.json(searchCatalog(q))
}
