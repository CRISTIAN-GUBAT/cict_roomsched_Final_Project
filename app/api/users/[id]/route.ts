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

interface UpdateResult {
  affectedRows: number;
}

interface DeleteResult {
  affectedRows: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    verifyToken(token);

    // Await the params
    const { id } = await params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const userData = await request.json();
    const connection = await pool.getConnection();
    
    try {
      // First, check if user exists and get current data
      const [existingUsers] = await connection.execute(
        'SELECT id, email, role, student_id FROM users WHERE id = ?',
        [userId]
      );

      const existingUserArray = existingUsers as UserRow[];
      if (existingUserArray.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const currentUser = existingUserArray[0];

      // Check for duplicate email if email is being updated
      if (userData.email !== undefined && userData.email !== currentUser.email) {
        const [existingEmail] = await connection.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [userData.email, userId]
        );

        if (Array.isArray(existingEmail) && existingEmail.length > 0) {
          return NextResponse.json(
            { error: 'Email address is already registered' },
            { status: 409 }
          );
        }

        // Validate email domain based on role
        const roleToCheck = userData.role || currentUser.role;
        if (roleToCheck === 'student' && !userData.email.endsWith('@student.cict.edu.ph')) {
          return NextResponse.json(
            { error: 'Student email must be from @student.cict.edu.ph domain' },
            { status: 400 }
          );
        }

        if (roleToCheck === 'instructor' && !userData.email.endsWith('@cict.edu.ph')) {
          return NextResponse.json(
            { error: 'Instructor email must be from @cict.edu.ph domain' },
            { status: 400 }
          );
        }
      }

      // Check for duplicate student_id if provided and for student role
      if (userData.student_id !== undefined) {
        const roleToCheck = userData.role || currentUser.role;
        
        if (roleToCheck === 'student' && userData.student_id) {
          // Check if student_id is being changed or is different from current
          const currentStudentId = currentUser.student_id || '';
          if (userData.student_id !== currentStudentId) {
            const [existingStudentId] = await connection.execute(
              'SELECT id FROM users WHERE student_id = ? AND id != ?',
              [userData.student_id, userId]
            );

            if (Array.isArray(existingStudentId) && existingStudentId.length > 0) {
              return NextResponse.json(
                { error: 'Student ID is already registered' },
                { status: 409 }
              );
            }
          }
        }
      }

      // Prevent role change for admin users
      if (userData.role !== undefined && currentUser.role === 'admin' && userData.role !== 'admin') {
        return NextResponse.json(
          { error: 'Cannot change role of administrator accounts' },
          { status: 403 }
        );
      }

      // Validate student-specific fields if role is being changed to student
      if (userData.role === 'student' || (userData.role === undefined && currentUser.role === 'student')) {
        if (userData.student_id !== undefined && !userData.student_id && !currentUser.student_id) {
          return NextResponse.json(
            { error: 'Student ID is required for student accounts' },
            { status: 400 }
          );
        }
        if (userData.department !== undefined && !userData.department && !currentUser.department) {
          return NextResponse.json(
            { error: 'Course is required for student accounts' },
            { status: 400 }
          );
        }
        if (userData.year !== undefined && !userData.year && !currentUser.year) {
          return NextResponse.json(
            { error: 'Year level is required for student accounts' },
            { status: 400 }
          );
        }
        if (userData.block !== undefined && !userData.block && !currentUser.block) {
          return NextResponse.json(
            { error: 'Block is required for student accounts' },
            { status: 400 }
          );
        }
      }

      // Build dynamic update query based on provided fields
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (userData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(userData.name);
      }

      if (userData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(userData.email);
      }

      if (userData.role !== undefined) {
        updateFields.push('role = ?');
        updateValues.push(userData.role);
      }

      if (userData.student_id !== undefined) {
        updateFields.push('student_id = ?');
        updateValues.push(userData.student_id || null);
      }

      if (userData.department !== undefined) {
        updateFields.push('department = ?');
        updateValues.push(userData.department || null);
      }

      if (userData.year !== undefined) {
        updateFields.push('year = ?');
        updateValues.push(userData.year || null);
      }

      if (userData.block !== undefined) {
        updateFields.push('block = ?');
        updateValues.push(userData.block || null);
      }

      if (userData.password !== undefined && userData.password.trim() !== '') {
        const hashedPassword = await hashPassword(userData.password);
        updateFields.push('password = ?');
        updateValues.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      updateValues.push(userId);

      const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      const [result] = await connection.execute(query, updateValues);
      const updateResult = result as UpdateResult;

      if (updateResult.affectedRows === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Fetch and return the updated user
      const [users] = await connection.execute(
        'SELECT id, email, name, role, student_id, department, year, block, created_at FROM users WHERE id = ?',
        [userId]
      );

      const userArray = users as UserRow[];
      return NextResponse.json({ data: userArray[0] });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    verifyToken(token);

    // Await the params
    const { id } = await params;
    const userId = parseInt(id);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      // First, check if the user exists
      const [users] = await connection.execute(
        'SELECT id, role FROM users WHERE id = ?',
        [userId]
      );

      const userArray = users as UserRow[];
      if (userArray.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Prevent deletion of admin users
      if (userArray[0].role === 'admin') {
        return NextResponse.json({ error: 'Cannot delete administrator accounts' }, { status: 403 });
      }

      const [result] = await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );

      const deleteResult = result as DeleteResult;

      if (deleteResult.affectedRows === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'User deleted successfully' });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}