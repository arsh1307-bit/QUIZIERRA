import { NextRequest, NextResponse } from 'next/server';

// Proxy to Python AI service to generate key answers/explanations from content
const PYTHON_AI_BASE = process.env.PYTHON_AI_BASE || 'http://127.0.0.1:8000';

export type KeyAnswer = {
  id: string;
  topic: string;
  explanation: string;
  sourceSnippet?: string; // Optional excerpt from the original content
};

export type GenerateKeyAnswersResponse = {
  keyAnswers: KeyAnswer[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid `text`. Provide content to generate key answers from.' },
        { status: 400 },
      );
    }

    // Call Python AI endpoint to generate key concepts/answers
    // For now, we'll use a simple prompt-based approach
    // In production, this could use a dedicated endpoint for concept extraction
    
    const prompt = `Extract and summarize the key concepts, definitions, and important answers from the following content. 
For each key concept, provide:
1. A clear topic/heading
2. A concise explanation (2-3 sentences)
3. A relevant snippet from the source text (if applicable)

Format as JSON array with: {id, topic, explanation, sourceSnippet}

Content:
${text.substring(0, 8000)}`; // Limit to avoid token limits

    // For now, we'll generate a simple response structure
    // In production, integrate with your AI service for better extraction
    const response = await fetch(`${PYTHON_AI_BASE}/ai/from_text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.substring(0, 8000),
        num_questions: 5, // We'll extract concepts from question generation
        use_structured: true,
      }),
    });

    if (!response.ok) {
      // Fallback: generate simple key answers from text chunks
      const keyAnswers = generateFallbackKeyAnswers(text);
      return NextResponse.json({ keyAnswers }, { status: 200 });
    }

    const json = await response.json();
    const generated = (json.generated || []) as any[];

    // Convert generated questions into key answer format
    // Each question's explanation/topic becomes a key answer
    const keyAnswers: KeyAnswer[] = generated.map((g, idx) => ({
      id: g.id || `key-${idx}`,
      topic: g.topic || g.explanation?.split('.')[0] || `Concept ${idx + 1}`,
      explanation: g.explanation || g.answer || 'Key concept from the material.',
      sourceSnippet: g.question ? `Related to: ${g.question}` : undefined,
    }));

    // If no answers generated, create fallback
    if (keyAnswers.length === 0) {
      const fallback = generateFallbackKeyAnswers(text);
      return NextResponse.json({ keyAnswers: fallback }, { status: 200 });
    }

    return NextResponse.json({ keyAnswers });
  } catch (error: any) {
    console.error('Generate key answers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate key answers.' },
      { status: 500 },
    );
  }
}

// Fallback generator for when AI service is unavailable
function generateFallbackKeyAnswers(text: string): KeyAnswer[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyAnswers: KeyAnswer[] = [];
  
  // Extract up to 5 key concepts from sentences
  for (let i = 0; i < Math.min(5, sentences.length); i++) {
    const sentence = sentences[i].trim();
    if (sentence.length > 0) {
      keyAnswers.push({
        id: `fallback-${i + 1}`,
        topic: sentence.substring(0, 50) + (sentence.length > 50 ? '...' : ''),
        explanation: sentence,
        sourceSnippet: sentence,
      });
    }
  }
  
  return keyAnswers.length > 0 ? keyAnswers : [{
    id: 'fallback-1',
    topic: 'Key Concept',
    explanation: 'Review the uploaded material to understand the main concepts.',
    sourceSnippet: text.substring(0, 200),
  }];
}

