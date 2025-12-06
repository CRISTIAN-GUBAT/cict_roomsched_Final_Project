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
    const decoded = verifyToken(token);
    
    const connection = await pool.getConnection();
    
    try {
      // Get student details
      const [students] = await connection.execute(
        'SELECT department, year, block FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      const studentArray = students as Array<{ department: string; year: string; block: string }>;
      if (studentArray.length === 0) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      
      const student = studentArray[0];
      
      // Get instructors for student's course, year, and block
      const [instructors] = await connection.execute(`
        SELECT DISTINCT u.id, u.name, u.email, u.role, u.department, u.year, u.block
        FROM users u
        WHERE u.role = 'instructor'
          AND u.department = ?
          AND u.year = ?
          AND u.block = ?
        ORDER BY u.name
      `, [student.department, student.year, student.block]);

      // Get schedules for these instructors
      const [instructorSchedules] = await connection.execute(`
        SELECT cs.*, 
               rm.room_number, rm.building, rm.capacity, rm.type, rm.equipment, rm.is_available,
               u.name as instructor_name, u.email as instructor_email, u.role as instructor_role,
               u.department as instructor_department, u.year as instructor_year, u.block as instructor_block
        FROM class_schedules cs
        JOIN rooms rm ON cs.room_id = rm.id
        JOIN users u ON cs.instructor_id = u.id
        WHERE u.department = ? 
          AND u.year = ? 
          AND u.block = ?
        UNION
        SELECT 
          NULL as id,
          r.room_id,
          r.user_id as instructor_id,
          r.purpose as course_code,
          r.purpose as course_name,
          DAYNAME(r.date) as day,
          r.start_time,
          r.end_time,
          r.created_at,
          rm.room_number, rm.building, rm.capacity, rm.type, rm.equipment, rm.is_available,
          u.name as instructor_name, u.email as instructor_email, u.role as instructor_role,
          u.department as instructor_department, u.year as instructor_year, u.block as instructor_block
        FROM reservations r
        JOIN rooms rm ON r.room_id = rm.id
        JOIN users u ON r.user_id = u.id
        WHERE r.course = ? 
          AND r.year = ? 
          AND r.block = ?
          AND r.status = 'approved'
          AND r.date >= CURDATE()
        ORDER BY day, start_time
      `, [
        student.department, student.year, student.block,
        student.department, student.year, student.block
      ]);

      return NextResponse.json({ 
        data: {
          instructors,
          schedules: instructorSchedules
        }
      });
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