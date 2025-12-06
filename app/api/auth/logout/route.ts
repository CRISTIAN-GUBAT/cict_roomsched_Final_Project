import { NextResponse } from 'next/server';

export async function POST() {
  // In a real app, you might blacklist the token
  return NextResponse.json({ message: 'Logged out successfully' });
}