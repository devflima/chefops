import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const start = Date.now()

    await supabase.from('tenants').select('id').limit(1)

    return NextResponse.json({
      status: 'ok',
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}