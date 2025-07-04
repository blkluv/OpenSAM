import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
      NEXT_PUBLIC_OPENAI_API_KEY: process.env.NEXT_PUBLIC_OPENAI_API_KEY ? 'Set' : 'Not set',
      SAM_API_KEY: process.env.SAM_API_KEY ? 'Set' : 'Not set',
    },
    timestamp: Date.now(),
  }, { status: 200 });
} 