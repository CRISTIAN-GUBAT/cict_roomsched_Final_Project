import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { hashPassword } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';
import { UserRow, QueryResult } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token and get user ID
    let adminId: number;
    try {
      const decoded = verifyToken(token);
      adminId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      // Check if admin user exists and is admin
      const [adminUsers] = await connection.execute(
        'SELECT role FROM users WHERE id = ?',
        [adminId]
      );

      const adminRows = adminUsers as UserRow[];
      if (adminRows.length === 0) {
        return NextResponse.json(
          { error: 'Admin user not found' },
          { status: 404 }
        );
      }

      if (adminRows[0].role !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied. Admin role required.' },
          { status: 403 }
        );
      }

      // Check if target user exists
      const [users] = await connection.execute(
        'SELECT id, role FROM users WHERE id = ?',
        [userId]
      );

      const userRows = users as UserRow[];
      if (userRows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const targetUser = userRows[0];

      // Prevent resetting admin passwords (security measure)
      if (targetUser.role === 'admin') {
        return NextResponse.json(
          { error: 'Cannot reset password for admin users' },
          { status: 403 }
        );
      }

      // Hash the default password "password"
      const hashedPassword = await hashPassword('password');

      // Update user password
      const [result] = await connection.execute(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, userId]
      );

      const updateResult = result as QueryResult;

      if (updateResult.affectedRows === 0) {
        return NextResponse.json(
          { error: 'Failed to reset password' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Password reset successfully',
        user_id: userId
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}