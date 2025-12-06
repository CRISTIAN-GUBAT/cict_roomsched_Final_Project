import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

interface ClassScheduleRow {
  id: number;
  room_id: number;
  instructor_id: number;
  course_code: string;
  course_name: string;
  day: string;
  start_time: string;
  end_time: string;
  created_at: Date;
  room_number: string;
  building: string;
  capacity: number;
  type: string;
  equipment: string;
  is_available: boolean;
  instructor_name: string;
  instructor_email: string;
  instructor_role: string;
  instructor_department: string;
  instructor_year: string | null;
  instructor_block: string | null;
}

interface ReservationRow {
  id: number;
  room_id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: Date;
  course: string | null;
  year: string | null;
  block: string | null;
  room_number: string;
  building: string;
  capacity: number;
  type: string;
  equipment: string;
  is_available: boolean;
  user_name: string;
  user_email: string;
  user_role: string;
  user_department: string;
  user_year: string | null;
  user_block: string | null;
}

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
      // Get student details (department, year, block)
      const [students] = await connection.execute(
        'SELECT department, year, block FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      const studentArray = students as Array<{ department: string; year: string; block: string }>;
      if (studentArray.length === 0) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      
      const student = studentArray[0];
      
      console.log(`📊 Student Info: ${student.department} - Year ${student.year} - Block ${student.block}`);
      
      // Get class schedules for the student's department, year, and block
      const [classSchedules] = await connection.execute(`
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
        ORDER BY 
          FIELD(cs.day, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
          cs.start_time
      `, [student.department, student.year, student.block]);

      console.log(`📚 Found ${(classSchedules as ClassScheduleRow[]).length} class schedules for student`);

      // Get reservations for the student's department, year, and block (only approved)
      const [reservations] = await connection.execute(`
        SELECT r.*, 
               rm.room_number, rm.building, rm.capacity, rm.type, rm.equipment, rm.is_available,
               u.name as user_name, u.email as user_email, u.role as user_role,
               u.department as user_department, u.year as user_year, u.block as user_block
        FROM reservations r
        JOIN rooms rm ON r.room_id = rm.id
        JOIN users u ON r.user_id = u.id
        WHERE r.course = ? 
          AND r.year = ? 
          AND r.block = ?
          AND r.status = 'approved'
          AND (r.date >= CURDATE() OR r.date IS NULL)
        ORDER BY r.date, r.start_time
      `, [student.department, student.year, student.block]);

      console.log(`📅 Found ${(reservations as ReservationRow[]).length} reservations for student`);

      // Combine and transform class schedules
      const transformedClassSchedules = (classSchedules as ClassScheduleRow[]).map(schedule => ({
        uniqueKey: `class-${schedule.id}`,
        id: schedule.id,
        room_id: schedule.room_id,
        instructor_id: schedule.instructor_id,
        course_code: schedule.course_code,
        course_name: schedule.course_name,
        day: schedule.day,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        created_at: schedule.created_at,
        is_reservation: false,
        reservation_date: null,
        reservation_purpose: null,
        course: schedule.course_name,
        year: student.year,
        block: student.block,
        room: {
          id: schedule.room_id,
          room_number: schedule.room_number,
          building: schedule.building,
          capacity: schedule.capacity,
          type: schedule.type,
          equipment: schedule.equipment,
          is_available: schedule.is_available,
          created_at: schedule.created_at
        },
        instructor: {
          id: schedule.instructor_id,
          name: schedule.instructor_name,
          email: schedule.instructor_email,
          role: schedule.instructor_role,
          department: schedule.instructor_department,
          year: schedule.instructor_year,
          block: schedule.instructor_block
        }
      }));

      // Transform reservations
      const transformedReservations = (reservations as ReservationRow[]).map(res => ({
        uniqueKey: `reservation-${res.id}`,
        id: res.id,
        room_id: res.room_id,
        instructor_id: res.user_id,
        course_code: res.course || 'RESERVATION',
        course_name: res.purpose,
        day: res.date ? new Date(res.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() : 'sunday',
        start_time: res.start_time,
        end_time: res.end_time,
        created_at: res.created_at,
        is_reservation: true,
        reservation_date: res.date,
        reservation_purpose: res.purpose,
        course: res.course,
        year: res.year,
        block: res.block,
        room: {
          id: res.room_id,
          room_number: res.room_number,
          building: res.building,
          capacity: res.capacity,
          type: res.type,
          equipment: res.equipment,
          is_available: res.is_available,
          created_at: res.created_at
        },
        instructor: {
          id: res.user_id,
          name: res.user_name,
          email: res.user_email,
          role: res.user_role,
          department: res.user_department,
          year: res.user_year,
          block: res.user_block
        }
      }));

      // Combine schedules and reservations
      const allSchedules = [...transformedClassSchedules, ...transformedReservations];

      console.log(`📋 Total schedules: ${allSchedules.length}`);

      return NextResponse.json({ 
        data: allSchedules,
        studentInfo: {
          department: student.department,
          year: student.year,
          block: student.block
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get student schedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}