import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { hashPassword, generateToken } from '@/lib/auth';

interface InsertResult {
  insertId: number;
}

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  student_id?: string;
  department?: string;
  year?: string;
  block?: string;
  created_at: Date;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, password_confirmation, role, student_id, course, year, block } = await request.json();

    if (!name || !email || !password || !password_confirmation || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password !== password_confirmation) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (role === 'student' && !email.endsWith('@student.cict.edu.ph')) {
      return NextResponse.json(
        { error: 'Student email must be from @student.cict.edu.ph domain' },
        { status: 400 }
      );
    }

    if (role === 'instructor' && !email.endsWith('@cict.edu.ph')) {
      return NextResponse.json(
        { error: 'Instructor email must be from @cict.edu.ph domain' },
        { status: 400 }
      );
    }

    if (role === 'student' && !student_id) {
      return NextResponse.json(
        { error: 'Student ID is required for student registration' },
        { status: 400 }
      );
    }

    if (role === 'student' && !course) {
      return NextResponse.json(
        { error: 'Course selection is required for student registration' },
        { status: 400 }
      );
    }

    if (role === 'student' && !year) {
      return NextResponse.json(
        { error: 'Year is required for student registration' },
        { status: 400 }
      );
    }

    if (role === 'student' && !block) {
      return NextResponse.json(
        { error: 'Block is required for student registration' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      if ((existingUsers as UserRow[]).length > 0) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 400 }
        );
      }

      // Check for duplicate student_id if provided
      if (role === 'student' && student_id) {
        const [existingStudentIds] = await connection.execute(
          'SELECT id FROM users WHERE student_id = ?',
          [student_id]
        );
        
        if ((existingStudentIds as UserRow[]).length > 0) {
          return NextResponse.json(
            { error: 'Student ID already registered' },
            { status: 400 }
          );
        }
      }

      const hashedPassword = await hashPassword(password);
      
      const [result] = await connection.execute(
        'INSERT INTO users (name, email, password, role, student_id, department, year, block) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, role, student_id || null, course || null, year || null, block || null]
      );

      const insertResult = result as InsertResult;
      const userId = insertResult.insertId;

      const [users] = await connection.execute(
        'SELECT id, email, name, role, student_id, department, year, block, created_at FROM users WHERE id = ?',
        [userId]
      );

      const userArray = users as UserRow[];
      const user = userArray[0];
      
      const token = generateToken(user.id, user.role);
      
      return NextResponse.json({
        user,
        token
      }, { status: 201 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}