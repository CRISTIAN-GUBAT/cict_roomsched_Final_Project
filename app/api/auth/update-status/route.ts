
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    
    if (!action || (action !== 'login' && action !== 'logout')) {
      return NextResponse.json(
        { error: 'Invalid action. Use "login" or "logout"' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      if (action === 'login') {
        await connection.execute('CALL user_login(?)', [decoded.userId]);
      } else if (action === 'logout') {
        await connection.execute('CALL user_logout(?)', [decoded.userId]);
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Status updated to ${action === 'login' ? 'online' : 'offline'}`
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}