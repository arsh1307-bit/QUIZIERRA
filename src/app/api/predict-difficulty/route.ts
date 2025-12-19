import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

function runPythonPredict(text: string): Promise<{ label?: string; classes?: string[]; probs?: number[]; error?: string }> {
  return new Promise((resolve, reject) => {
    const projectRoot = process.cwd();
    const scriptPath = path.join(projectRoot, 'src', 'train', 'predict_difficulty.py');

    const proc = spawn('python', [scriptPath, text], {
      cwd: projectRoot,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    proc.on('error', err => {
      reject(err);
    });

    proc.on('close', code => {
      if (code !== 0) {
        return resolve({ error: stderr || `Python exited with code ${code}` });
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (e: any) {
        resolve({ error: `Failed to parse Python output: ${e?.message || String(e)}` });
      }
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null as any);
    const text = body?.text;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing "text" (string) in request body.' }, { status: 400 });
    }

    const result = await runPythonPredict(text);

    if (result.error) {
      console.error('predict_difficulty error:', result.error);
      return NextResponse.json({ error: 'Difficulty prediction failed.' }, { status: 500 });
    }

    return NextResponse.json({
      label: result.label,
      classes: result.classes,
      probs: result.probs,
    });
  } catch (error: any) {
    console.error('Difficulty API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
