import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

interface RoomRow {
  id: number;
  room_number: string;
  building: string;
  capacity: number;
  type: 'classroom' | 'lab' | 'conference';
  equipment: string;
  is_available: boolean;
  created_at: Date;
  active_reservations: number;
}

interface InsertResult {
  insertId: number;
}

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rooms] = await connection.execute(`
        SELECT r.*, 
               COUNT(res.id) as active_reservations
        FROM rooms r
        LEFT JOIN reservations res ON r.id = res.room_id 
          AND res.status = 'approved'
          AND res.date >= CURDATE()
        GROUP BY r.id
        ORDER BY r.building, r.room_number
      `);

      return NextResponse.json({ data: rooms });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get rooms error:', error);
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

    const roomData = await request.json();
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        'INSERT INTO rooms (room_number, building, capacity, type, equipment, is_available) VALUES (?, ?, ?, ?, ?, ?)',
        [roomData.room_number, roomData.building, roomData.capacity, roomData.type, roomData.equipment, roomData.is_available]
      );

      const insertResult = result as InsertResult;
      const roomId = insertResult.insertId;

      // Send notification to all users about new room
      await createNotification({
        userIds: 'all', // Notify both instructors and students
        senderId: decoded.userId,
        type: 'room_created',
        title: `New Room Available: ${roomData.room_number}`,
        message: `A new room has been added to the system: ${roomData.room_number} in ${roomData.building}. Capacity: ${roomData.capacity} students.`,
        relatedTable: 'rooms',
        relatedId: roomId,
        isImportant: false
      });

      const [rooms] = await connection.execute(
        'SELECT * FROM rooms WHERE id = ?',
        [roomId]
      );

      const roomArray = rooms as RoomRow[];
      return NextResponse.json({ data: roomArray[0] }, { status: 201 });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}