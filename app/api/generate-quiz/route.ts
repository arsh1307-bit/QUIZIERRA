import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Proxy Next.js generation requests to the local Python service (FastAPI)
const PYTHON_AI_BASE = process.env.PYTHON_AI_BASE || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { context, numMcq, numText, educationalLevel, educationalYear } = body || {};

    if (!context || typeof context !== 'string' || !context.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid `context`. Provide text to generate questions from.' },
        { status: 400 },
      );
    }

    const mcq = Number(numMcq ?? 0);
    const text = Number(numText ?? 0);

    if (Number.isNaN(mcq) || Number.isNaN(text)) {
      return NextResponse.json(
        { error: '`numMcq` and `numText` must be numbers.' },
        { status: 400 },
      );
    }

    if (mcq < 0 || mcq > 20 || text < 0 || text > 20) {
      return NextResponse.json(
        { error: '`numMcq` and `numText` must be between 0 and 20.' },
        { status: 400 },
      );
    }

    if (mcq + text <= 0) {
      return NextResponse.json(
        { error: 'You must request at least one question.' },
        { status: 400 },
      );
    }

    // Call Python AI endpoint which returns saved MCQs in shape {generated: [{...}]}
    const totalRequested = mcq + text;

    const payload = {
      text: context,
      num_questions: totalRequested,
      use_structured: true,
    };

    const r = await fetch(`${PYTHON_AI_BASE}/ai/from_text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.warn('Python AI service returned non-OK:', r.status, errText);
      // Fallback: generate a safe local quiz so the UI remains usable while the Python
      // service is unreachable. This fallback is intentionally simple and deterministic.
      const fallback = generateFallbackQuestions(context, mcq, text);
      return NextResponse.json({ title: 'Generated Quiz (fallback)', questions: fallback }, { status: 200 });
    }

    const json = await r.json();

    // Python returns { generated: [ {id, question, distractors, answer, difficulty, explanation, topic} ] }
    const generated = (json.generated || []) as any[];

    // Build GenerateQuizOutput-compatible response. We'll mark first N as MCQs and, if
    // text questions were requested, convert the last `text` items into `text`-type questions
    // by using the model's answer as a reference answer.
    const questions: any[] = generated.map((g) => ({
      id: g.id ?? uuidv4(),
      type: 'mcq',
      content: g.question || g.stem || '',
      options: (g.distractors || g.options || []).slice(0, 3).map(String),
      correctAnswer: (g.answer || g.correct || '').toString(),
      maxScore: 10,
    }));

    // If text questions were requested, convert the last `text` entries
    if (text > 0) {
      for (let i = 0; i < text; i++) {
        const idx = questions.length - 1 - i;
        if (idx >= 0) {
          const q = questions[idx];
          q.type = 'text';
          // move correctAnswer to a concise reference answer and drop options
          q.options = undefined;
          q.correctAnswer = q.correctAnswer || '';
        }
      }
    }

    const title = `Generated Quiz`;

    // If no items returned by Python, fallback to local generator rather than erroring.
    if (!questions.length) {
      const fallback = generateFallbackQuestions(context, mcq, text);
      return NextResponse.json({ title: 'Generated Quiz (fallback)', questions: fallback }, { status: 200 });
    }

    return NextResponse.json({ title, questions });
  } catch (error: any) {
    console.error('Generate quiz error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz.' },
      { status: 500 },
    );
  }
}

// Simple, deterministic fallback generator used when Python AI service is unavailable.
function generateFallbackQuestions(context: string, numMcq: number, numText: number) {
  const out: any[] = [];
  const lines = context.split(/\n+/).map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < numMcq; i++) {
    const seed = lines[i % lines.length] || context.slice(0, 120);
    out.push({
      id: `fallback-mcq-${i + 1}`,
      type: 'mcq',
      content: `${seed} — (fallback MCQ ${i + 1})`,
      options: [
        'Option A (fallback)',
        'Option B (fallback)',
        'Option C (fallback)'
      ],
      correctAnswer: 'Option A (fallback)',
      maxScore: 10,
    });
  }
  for (let j = 0; j < numText; j++) {
    const idx = j % lines.length;
    const seed = lines[idx] || context.slice(0, 120);
    out.push({
      id: `fallback-text-${j + 1}`,
      type: 'text',
      content: `${seed} — (fallback text question ${j + 1})`,
      correctAnswer: 'Reference answer (fallback)',
      maxScore: 10,
    });
  }
  return out;
}
