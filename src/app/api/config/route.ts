import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    config: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
        hasKey: !!process.env.OPENAI_API_KEY,
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set',
        hasKey: !!process.env.ANTHROPIC_API_KEY,
      },
      huggingface: {
        apiKey: process.env.HUGGINGFACE_API_KEY ? 'Set' : 'Not set',
        hasKey: !!process.env.HUGGINGFACE_API_KEY,
      },
      sam: {
        apiKey: process.env.SAM_API_KEY ? 'Set' : 'Not set',
        hasKey: !!process.env.SAM_API_KEY,
      },
    },
    timestamp: Date.now(),
  }, { status: 200 });
} 