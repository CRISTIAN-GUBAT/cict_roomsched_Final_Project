import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';
import { sendReservationNotification } from '@/lib/notifications'; 

interface ReservationRow {
  id: number;
  room_id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
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
  student_id?: string;
  department?: string;
  user_year?: string;  
  user_block?: string; 
}

interface ConflictRow {
  id: number;
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
    const decoded = verifyToken(token);
    
    const connection = await pool.getConnection();
    
    try {
      // First, get user role from database
      const [users] = await connection.execute(
        'SELECT role FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      const userArray = users as Array<{ role: string }>;
      if (userArray.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      const userRole = userArray[0].role;
      
      let query = '';
      let params: unknown[] = [];

      // Admin can see all reservations, users only see their own
      if (userRole === 'admin') {
        query = `
          SELECT r.*, 
                 rm.room_number, rm.building, rm.capacity, rm.type, rm.equipment, rm.is_available,
                 u.name as user_name, u.email as user_email, u.role as user_role, 
                 u.student_id, u.department, u.year as user_year, u.block as user_block
          FROM reservations r
          JOIN rooms rm ON r.room_id = rm.id
          JOIN users u ON r.user_id = u.id
          ORDER BY r.date DESC, r.start_time
        `;
      } else {
        query = `
          SELECT r.*, 
                 rm.room_number, rm.building, rm.capacity, rm.type, rm.equipment, rm.is_available,
                 u.name as user_name, u.email as user_email, u.role as user_role, 
                 u.student_id, u.department, u.year as user_year, u.block as user_block
          FROM reservations r
          JOIN rooms rm ON r.room_id = rm.id
          JOIN users u ON r.user_id = u.id
          WHERE r.user_id = ?
          ORDER BY r.date DESC, r.start_time
        `;
        params = [decoded.userId];
      }

      const [reservations] = await connection.execute(query, params);
      
      // Transform the data to match frontend expectations
      const transformedReservations = (reservations as ReservationRow[]).map(res => ({
        id: res.id,
        room_id: res.room_id,
        user_id: res.user_id,
        date: res.date,
        start_time: res.start_time,
        end_time: res.end_time,
        purpose: res.purpose,
        status: res.status,
        admin_notes: res.admin_notes,
        created_at: res.created_at,
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
        user: {
          id: res.user_id,
          name: res.user_name,
          email: res.user_email,
          role: res.user_role,
          student_id: res.student_id,
          department: res.department,
          year: res.user_year,
          block: res.user_block,
          created_at: res.created_at
        }
      }));

      console.log(`📊 Fetched ${transformedReservations.length} total reservations`);

      return NextResponse.json({ data: transformedReservations });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get reservations error:', error);
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
    const decoded = verifyToken(token);
    const reservationData = await request.json();
    const connection = await pool.getConnection();
    
    try {
      // Check for time conflicts
      const [conflicts] = await connection.execute(`
        SELECT id FROM reservations 
        WHERE room_id = ? 
          AND date = ?
          AND status IN ('approved', 'pending')
          AND (
            (start_time < ? AND end_time > ?) OR
            (start_time < ? AND end_time > ?) OR
            (start_time >= ? AND end_time <= ?) OR
            (start_time <= ? AND end_time >= ?)
          )
      `, [
        reservationData.room_id,
        reservationData.date,
        reservationData.end_time, reservationData.start_time,
        reservationData.start_time, reservationData.end_time,
        reservationData.start_time, reservationData.end_time,
        reservationData.start_time, reservationData.end_time
      ]);

      if ((conflicts as ConflictRow[]).length > 0) {
        return NextResponse.json(
          { error: 'Time conflict with existing reservation' },
          { status: 400 }
        );
      }

      // Validate required fields for instructor reservations
      if (decoded.role === 'instructor') {
        if (!reservationData.course || !reservationData.year || !reservationData.block) {
          return NextResponse.json(
            { error: 'Course, year, and block are required for instructor reservations' },
            { status: 400 }
          );
        }
      }

      // Insert new reservation with course, year, block
      const [result] = await connection.execute(
        'INSERT INTO reservations (room_id, user_id, date, start_time, end_time, purpose, status, course, year, block) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          reservationData.room_id,
          decoded.userId,
          reservationData.date,
          reservationData.start_time,
          reservationData.end_time,
          reservationData.purpose,
          'pending',
          reservationData.course || null,
          reservationData.year || null,
          reservationData.block || null
        ]
      );
      const insertResult = result as InsertResult;
      
      // Send notification for new reservation creation
      try {
        await sendReservationNotification(
          insertResult.insertId, // reservationId
          decoded.userId, // userId - who created it
          null, // no admin involved yet
          'created'
        );
        console.log(`📢 Notification sent for new reservation ID: ${insertResult.insertId}`);
      } catch (notificationError) {
        // Don't fail the whole request if notification fails
        console.error('Notification error:', notificationError);
      }
      
      // Get the complete reservation with room and user details
      const [reservations] = await connection.execute(`
        SELECT r.*, 
               rm.room_number, rm.building, rm.capacity, rm.type, rm.equipment, rm.is_available,
               u.name as user_name, u.email as user_email, u.role as user_role, 
               u.student_id, u.department, u.year as user_year, u.block as user_block
        FROM reservations r
        JOIN rooms rm ON r.room_id = rm.id
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [insertResult.insertId]);
      const reservationArray = reservations as ReservationRow[];
      
      if (reservationArray.length === 0) {
        return NextResponse.json(
          { error: 'Reservation not found after creation' },
          { status: 500 }
        );
      }
      const reservation = reservationArray[0];
      
      // Transform the data to match frontend expectations
      const transformedReservation = {
        id: reservation.id,
        room_id: reservation.room_id,
        user_id: reservation.user_id,
        date: reservation.date,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        purpose: reservation.purpose,
        status: reservation.status,
        admin_notes: reservation.admin_notes,
        created_at: reservation.created_at,
        course: reservation.course,
        year: reservation.year,
        block: reservation.block,
        room: {
          id: reservation.room_id,
          room_number: reservation.room_number,
          building: reservation.building,
          capacity: reservation.capacity,
          type: reservation.type,
          equipment: reservation.equipment,
          is_available: reservation.is_available,
          created_at: reservation.created_at
        },
        user: {
          id: reservation.user_id,
          name: reservation.user_name,
          email: reservation.user_email,
          role: reservation.user_role,
          student_id: reservation.student_id,
          department: reservation.department,
          year: reservation.user_year,
          block: reservation.user_block,
          created_at: reservation.created_at
        }
      };
      return NextResponse.json({ data: transformedReservation }, { status: 201 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create reservation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}