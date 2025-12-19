import { NextRequest, NextResponse } from 'next/server';

const PYTHON_AI_BASE = process.env.PYTHON_AI_BASE || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const r = await fetch(`${PYTHON_AI_BASE}/ai/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.warn('Python grade service returned non-OK:', r.status, t);
      return NextResponse.json({ error: 'Grading service unavailable' }, { status: 503 });
    }

    const json = await r.json();
    return NextResponse.json(json);
  } catch (err: any) {
    console.error('Proxy grade error:', err);
    return NextResponse.json({ error: err.message || 'Proxy error' }, { status: 500 });
  }
}
