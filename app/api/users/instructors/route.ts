import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    verifyToken(token);
    
    const connection = await pool.getConnection();
    
    try {
      const [instructors] = await connection.execute(`
        SELECT id, email, name, role, department, created_at, updated_at
        FROM users 
        WHERE role = 'instructor'
        ORDER BY name
      `);
      
      return NextResponse.json({ data: instructors });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get instructors error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}