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
    const decoded = verifyToken(token);

    // Await the params
    const { id } = await params;
    const roomId = parseInt(id);
    
    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    const roomData = await request.json();
    const connection = await pool.getConnection();
    
    try {
      // First, get current room info
      const [currentRoomResult] = await connection.execute<RoomRow[]>(
        'SELECT room_number, building, is_available FROM rooms WHERE id = ?',
        [roomId]
      );

      if (currentRoomResult.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const currentRoom = currentRoomResult[0];
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (roomData.room_number !== undefined) {
        updateFields.push('room_number = ?');
        updateValues.push(roomData.room_number);
      }

      if (roomData.building !== undefined) {
        updateFields.push('building = ?');
        updateValues.push(roomData.building);
      }

      if (roomData.capacity !== undefined) {
        updateFields.push('capacity = ?');
        updateValues.push(roomData.capacity);
      }

      if (roomData.type !== undefined) {
        updateFields.push('type = ?');
        updateValues.push(roomData.type);
      }

      if (roomData.equipment !== undefined) {
        updateFields.push('equipment = ?');
        updateValues.push(roomData.equipment);
      }

      if (roomData.is_available !== undefined) {
        updateFields.push('is_available = ?');
        updateValues.push(roomData.is_available);
      }

      if (updateFields.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      updateValues.push(roomId);

      const query = `UPDATE rooms SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      const [result] = await connection.execute(query, updateValues);
      const updateResult = result as UpdateResult;

      if (updateResult.affectedRows === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      // Send notification based on what was changed
      if (roomData.is_available !== undefined && roomData.is_available !== currentRoom.is_available) {
        // Room availability changed
        const notificationType = roomData.is_available ? 'room_available' : 'room_unavailable';
        const title = roomData.is_available 
          ? `Room Now Available: ${roomData.room_number || currentRoom.room_number}`
          : `Room Unavailable: ${roomData.room_number || currentRoom.room_number}`;
        const message = roomData.is_available
          ? `${roomData.room_number || currentRoom.room_number} in ${roomData.building || currentRoom.building} is now available for reservation.`
          : `${roomData.room_number || currentRoom.room_number} in ${roomData.building || currentRoom.building} is temporarily unavailable.`;
        
        await createNotification({
          userIds: 'all',
          senderId: decoded.userId,
          type: notificationType,
          title,
          message,
          relatedTable: 'rooms',
          relatedId: roomId,
          isImportant: false
        });
      } else if (roomData.room_number || roomData.building || roomData.capacity) {
        // Room details were updated
        await createNotification({
          userIds: 'all',
          senderId: decoded.userId,
          type: 'room_updated',
          title: `Room Updated: ${roomData.room_number || currentRoom.room_number}`,
          message: `${roomData.room_number || currentRoom.room_number} has been updated. Check the room details for changes.`,
          relatedTable: 'rooms',
          relatedId: roomId,
          isImportant: false
        });
      }

      // Fetch and return the updated room
      const [rooms] = await connection.execute(
        'SELECT id, room_number, building, capacity, type, equipment, is_available, created_at FROM rooms WHERE id = ?',
        [roomId]
      );

      const roomArray = rooms as RoomRow[];
      return NextResponse.json({ data: roomArray[0] });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update room error:', error);
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
    const decoded = verifyToken(token);

    // Await the params
    const { id } = await params;
    const roomId = parseInt(id);
    
    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      // Check if room exists and get its details
      const [rooms] = await connection.execute<RoomRow[]>(
        'SELECT room_number, building FROM rooms WHERE id = ?',
        [roomId]
      );

      if (rooms.length === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const room = rooms[0];

      // Send notification before deleting
      await createNotification({
        userIds: 'all',
        senderId: decoded.userId,
        type: 'room_deleted',
        title: `Room Deleted: ${room.room_number}`,
        message: `${room.room_number} in ${room.building} has been removed from the system.`,
        relatedTable: 'rooms',
        relatedId: roomId,
        isImportant: true
      });

      const [result] = await connection.execute(
        'DELETE FROM rooms WHERE id = ?',
        [roomId]
      );

      const deleteResult = result as DeleteResult;

      if (deleteResult.affectedRows === 0) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Room deleted successfully' });

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}