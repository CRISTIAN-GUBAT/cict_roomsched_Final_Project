import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Only allow instructors and admin
    if (decoded.role !== 'instructor' && decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only instructors can delete their history' },
        { status: 403 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      // Set session variable for trigger
      const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
      await connection.execute(`SET @current_user_id = ?`, [decoded.userId]);
      await connection.execute(`SET @current_ip_address = ?`, [userIp]);

      // For instructors, only delete their own history
      // For admin, they can only delete if they're deleting their own history
      const query = `DELETE r FROM reservations r
                     WHERE r.user_id = ? 
                     AND r.status IN ('completed', 'cancelled', 'rejected')`;
      
      const params = [decoded.userId];

      const [result] = await connection.execute(query, params);
      const deleteResult = result as { affectedRows: number };
      
      return NextResponse.json({ 
        message: `${deleteResult.affectedRows} history reservations deleted successfully`,
        deletedCount: deleteResult.affectedRows
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete instructor history error:', error);
    return NextResponse.json(
      { error: 'Failed to delete history reservations' },
      { status: 500 }
    );
  }
}