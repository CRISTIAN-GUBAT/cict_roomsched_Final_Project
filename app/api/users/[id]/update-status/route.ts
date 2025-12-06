// app/api/users/[id]/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const { is_online } = await request.json();
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      if (is_online === false) {
        // Mark user as offline
        await connection.execute(
          `UPDATE account_status 
           SET is_online = FALSE, 
               last_logout = NOW()
           WHERE user_id = ?`,
          [userId]
        );
      } else {
        // Mark user as online and update activity
        await connection.execute(
          `UPDATE account_status 
           SET is_online = TRUE,
               last_activity = NOW(),
               status = 'active'
           WHERE user_id = ?`,
          [userId]
        );
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'User status updated'
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update user status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}