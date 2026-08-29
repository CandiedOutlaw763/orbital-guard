import { listConjunctions } from '@/lib/orbital-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(listConjunctions())
}
