
import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }
        
        let text = '';
        const arrayBuffer = await file.arrayBuffer();

        if (file.type === 'application/pdf') {
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdf(buffer);
            text = data.text;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ arrayBuffer });
            text = result.value;
        } else if (file.type === 'text/plain') {
            text = new TextDecoder().decode(arrayBuffer);
        } else {
            return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
        }

        if (!text || !text.trim()) {
            return NextResponse.json({ error: 'Could not extract any text from the file. It may be empty or corrupted.' }, { status: 400 });
        }

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error('File parsing error:', error);
        return NextResponse.json({ error: `Failed to parse file: ${error.message}` }, { status: 500 });
    }
}
