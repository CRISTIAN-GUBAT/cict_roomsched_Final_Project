import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, hashPassword, verifyToken } from '@/lib/auth';
import { pool } from '@/lib/database';
import { UserRow, QueryResult } from '@/types';

interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export async function PUT(request: NextRequest) {
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
    let userId: number;
    try {
      const decoded = verifyToken(token);
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ChangePasswordRequest = await request.json();
    const { current_password, new_password, confirm_password } = body;

    // Validate required fields
    if (!current_password || !new_password || !confirm_password) {
      return NextResponse.json(
        { error: 'All password fields are required' },
        { status: 400 }
      );
    }

    // Check if new passwords match
    if (new_password !== confirm_password) {
      return NextResponse.json(
        { error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Check password length
    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    try {
      // Get user current password with proper typing
      const [users] = await connection.execute(
        'SELECT id, password FROM users WHERE id = ?',
        [userId]
      );

      const userRows = users as UserRow[];
      if (userRows.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const user = userRows[0];

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(current_password, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(new_password);

      // Update password in database
      const [result] = await connection.execute(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, userId]
      );

      const updateResult = result as QueryResult;

      if (updateResult.affectedRows === 0) {
        return NextResponse.json(
          { error: 'Failed to update password' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Password changed successfully'
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}