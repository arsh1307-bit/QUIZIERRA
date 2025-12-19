
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { run_terminal_command } from '@/lib/actions'; // Assuming you have a utility for this

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, currentDifficulty, lastWasCorrect } = body;

    // Path to the Python script
    const scriptPath = path.join(process.cwd(), 'app', 'services', 'adaptive_engine.py');

    // Prepare the command-line arguments
    const args = [
      'python',
      scriptPath,
      'next_question', // Action to perform
      `--user_hash=${userId}`,
      `--current_difficulty=${currentDifficulty}`,
    ];
    if (lastWasCorrect !== null) {
        args.push(`--last_was_correct=${lastWasCorrect}`);
    }

    // Execute the script
    const result = await run_terminal_command(args.join(' '));

    if (result.status !== 'succeeded') {
      throw new Error(result.error || 'Failed to execute adaptive engine script.');
    }

    // The script should output JSON, so parse it
    const nextQuestion = JSON.parse(result.result);

    return NextResponse.json(nextQuestion);

  } catch (error) {
    console.error('Error in adaptive-next-question route:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
