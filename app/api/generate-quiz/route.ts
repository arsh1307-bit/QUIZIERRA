import { NextRequest, NextResponse } from 'next/server';
import { generateQuiz } from '@/ai/flows/instructor-generates-quiz-from-topic';

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

    const result = await generateQuiz({ 
      context, 
      numMcq: mcq, 
      numText: text,
      educationalLevel,
      educationalYear,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Generate quiz error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz.' },
      { status: 500 },
    );
  }
}
