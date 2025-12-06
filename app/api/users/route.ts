import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken, hashPassword } from '@/lib/auth';

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

interface InsertResult {
  insertId: number;
}

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
      const [users] = await connection.execute(
        'SELECT id, email, name, role, student_id, department, year, block, created_at FROM users ORDER BY created_at DESC'
      );

      return NextResponse.json({ data: users });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    verifyToken(token);

    const userData = await request.json();
    const connection = await pool.getConnection();
    
    try {
      // Validate required fields
      if (!userData.name || !userData.email || !userData.password || !userData.role) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Validate email domain based on role
      if (userData.role === 'student' && !userData.email.endsWith('@student.cict.edu.ph')) {
        return NextResponse.json(
          { error: 'Student email must be from @student.cict.edu.ph domain' },
          { status: 400 }
        );
      }

      if (userData.role === 'instructor' && !userData.email.endsWith('@cict.edu.ph')) {
        return NextResponse.json(
          { error: 'Instructor email must be from @cict.edu.ph domain' },
          { status: 400 }
        );
      }

      // Validate student-specific fields
      if (userData.role === 'student') {
        if (!userData.student_id) {
          return NextResponse.json(
            { error: 'Student ID is required for student accounts' },
            { status: 400 }
          );
        }
        if (!userData.department) {
          return NextResponse.json(
            { error: 'Course is required for student accounts' },
            { status: 400 }
          );
        }
        if (!userData.year) {
          return NextResponse.json(
            { error: 'Year level is required for student accounts' },
            { status: 400 }
          );
        }
        if (!userData.block) {
          return NextResponse.json(
            { error: 'Block is required for student accounts' },
            { status: 400 }
          );
        }
      }

      // Check for duplicate email
      const [existingEmail] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [userData.email]
      );

      if (Array.isArray(existingEmail) && existingEmail.length > 0) {
        return NextResponse.json(
          { error: 'Email address is already registered' },
          { status: 409 }
        );
      }

      // Check for duplicate student_id if provided and for student role
      if (userData.role === 'student' && userData.student_id) {
        const [existingStudentId] = await connection.execute(
          'SELECT id FROM users WHERE student_id = ?',
          [userData.student_id]
        );

        if (Array.isArray(existingStudentId) && existingStudentId.length > 0) {
          return NextResponse.json(
            { error: 'Student ID is already registered' },
            { status: 409 }
          );
        }
      }

      // Hash password before storing
      const hashedPassword = await hashPassword(userData.password);

      const [result] = await connection.execute(
        'INSERT INTO users (name, email, password, role, student_id, department, year, block) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userData.name, 
          userData.email, 
          hashedPassword, 
          userData.role, 
          userData.student_id || null, 
          userData.department || null,
          userData.year || null,
          userData.block || null
        ]
      );

      const insertResult = result as InsertResult;
      
      const [users] = await connection.execute(
        'SELECT id, email, name, role, student_id, department, year, block, created_at FROM users WHERE id = ?',
        [insertResult.insertId]
      );

      const userArray = users as UserRow[];
      return NextResponse.json({ data: userArray[0] }, { status: 201 });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}