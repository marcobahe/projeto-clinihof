export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// This endpoint has been replaced by the sales API
export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint has been replaced by /api/sales' },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'This endpoint has been replaced by /api/sales' },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'This endpoint has been replaced by /api/sales' },
    { status: 410 }
  );
}
