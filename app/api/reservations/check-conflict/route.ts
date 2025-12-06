import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

interface ConflictRow {
  id: number;
  start_time: string;
  end_time: string;
  purpose: string;
  status: string;
  user_name: string;
  course_name?: string;
  type: 'reservation' | 'class';
}

interface ClassScheduleRow {
  id: number;
  start_time: string;
  end_time: string;
  course_name: string;
  user_name: string;
  day: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    verifyToken(token);

    const reservationData = await request.json();
    const { room_id, date, start_time, end_time } = reservationData;

    if (!room_id || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      const conflicts: Array<{
        id: number;
        title: string;
        type: 'class' | 'reservation';
        time: string;
        instructor: string;
        status?: string;
      }> = [];

      // Check for conflicting reservations (approved and pending) - FIXED: Only check same date
      const [reservationConflicts] = await connection.execute(`
        SELECT r.id, r.start_time, r.end_time, r.purpose, r.status, u.name as user_name
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        WHERE r.room_id = ? 
          AND r.date = ?  -- Only check same date
          AND r.status IN ('approved', 'pending') -- Check both approved and pending
          AND (
            (r.start_time < ? AND r.end_time > ?) OR      -- New starts during existing
            (r.start_time < ? AND r.end_time > ?) OR      -- New ends during existing
            (r.start_time >= ? AND r.end_time <= ?) OR    -- New completely within existing
            (r.start_time <= ? AND r.end_time >= ?)       -- New completely overlaps existing
          )
      `, [
        room_id,
        date,
        end_time, start_time,    // Condition 1
        start_time, end_time,    // Condition 2  
        start_time, end_time,    // Condition 3
        start_time, end_time     // Condition 4
      ]);

      // Transform reservation conflicts
      (reservationConflicts as ConflictRow[]).forEach(conflict => {
        conflicts.push({
          id: conflict.id,
          title: conflict.purpose,
          type: 'reservation',
          time: `${conflict.start_time} - ${conflict.end_time}`,
          instructor: conflict.user_name,
          status: conflict.status
        });
      });

      // Check for conflicting class schedules - FIXED: Only check if class schedule exists for that day
      const reservationDate = new Date(date);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[reservationDate.getDay()];

      // Only check class conflicts if we have a valid day of week
      if (dayOfWeek) {
        const [classConflicts] = await connection.execute(`
          SELECT cs.id, cs.start_time, cs.end_time, cs.course_name, u.name as user_name, cs.day
          FROM class_schedules cs
          JOIN users u ON cs.instructor_id = u.id
          WHERE cs.room_id = ? 
            AND cs.day = ?
            AND (
              (cs.start_time < ? AND cs.end_time > ?) OR
              (cs.start_time < ? AND cs.end_time > ?) OR
              (cs.start_time >= ? AND end_time <= ?) OR
              (cs.start_time <= ? AND end_time >= ?)
            )
        `, [
          room_id,
          dayOfWeek,
          end_time, start_time,
          start_time, end_time,
          start_time, end_time,
          start_time, end_time
        ]);

        // Transform class schedule conflicts
        (classConflicts as ClassScheduleRow[]).forEach(conflict => {
          conflicts.push({
            id: conflict.id,
            title: conflict.course_name,
            type: 'class',
            time: `${conflict.start_time} - ${conflict.end_time}`,
            instructor: conflict.user_name
          });
        });
      }

      return NextResponse.json({ conflicts });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Check time conflict error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}