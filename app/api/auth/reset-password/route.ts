import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/database';

export async function POST(request: NextRequest) {
  let connection;
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { message: 'Token, email and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          message: 'Password does not meet requirements',
          requirements: {
            minLength: passwordValidation.minLength,
            hasUpperCase: passwordValidation.hasUpperCase,
            hasLowerCase: passwordValidation.hasLowerCase,
            hasNumbers: passwordValidation.hasNumbers,
            hasSpecialChar: passwordValidation.hasSpecialChar
          }
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const [users] = await connection.execute(
      `SELECT id, email 
       FROM users 
       WHERE email = ? AND reset_token = ? AND reset_token_expiry > NOW()`,
      [email, tokenHash]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const user = users[0] as { id: number; email: string };

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and clear reset token
    await connection.execute(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    // Log the password reset action
    await connection.execute(
      `INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
       VALUES (?, 'CHANGE_PASSWORD', 'users', ?, ?)`,
      [user.id, user.id, `Password reset via reset link for ${email}`]
    );

    return NextResponse.json(
      { 
        message: 'Password reset successful. You can now log in with your new password.',
        success: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

function validatePassword(password: string) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
  };
}