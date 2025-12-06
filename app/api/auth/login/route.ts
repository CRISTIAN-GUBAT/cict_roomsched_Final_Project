// app/api/auth/login/route.ts - Add online status update
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyPassword, generateToken } from '@/lib/auth';

interface UserRow {
  id: number;
  email: string;
  password: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  student_id?: string;
  department?: string;
  created_at: Date;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      const userArray = users as UserRow[];
      
      if (userArray.length === 0) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const user = userArray[0];
      const isValidPassword = await verifyPassword(password, user.password);
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Mark user as online in account_status table
      try {
        await connection.execute(
          `INSERT INTO account_status (user_id, user_type, is_online, last_login, login_count, last_activity, status)
           VALUES (?, ?, TRUE, NOW(), 1, NOW(), 'active')
           ON DUPLICATE KEY UPDATE
           is_online = TRUE,
           last_login = NOW(),
           last_activity = NOW(),
           login_count = login_count + 1,
           status = 'active'`,
          [user.id, user.role]
        );
      } catch (statusError) {
        console.warn('⚠️ Could not update account status:', statusError);
        // Continue with login even if status update fails
      }

      // Pass both userId and role to generateToken
      const token = generateToken(user.id, user.role);
      const { password: _, ...userWithoutPassword } = user;

      return NextResponse.json({
        user: userWithoutPassword,
        token
      });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}