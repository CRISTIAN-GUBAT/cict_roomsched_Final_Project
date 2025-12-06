import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

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
  user_department: string;
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
      // Get all approved reservations (for students to see)
      const [reservations] = await connection.execute(`
        SELECT r.*, 
               rm.room_number, rm.building, rm.capacity, rm.type, rm.equipment, rm.is_available,
               u.name as user_name, u.email as user_email, u.role as user_role, 
               u.department as user_department
        FROM reservations r
        JOIN rooms rm ON r.room_id = rm.id
        JOIN users u ON r.user_id = u.id
        WHERE r.status = 'approved'
          AND r.date >= CURDATE()
        ORDER BY r.date, r.start_time
      `);
      
      // Transform the data
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
          department: res.user_department
        }
      }));

      return NextResponse.json({ data: transformedReservations });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get all reservations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}