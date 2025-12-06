import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

interface UpdateResult {
  affectedRows: number;
}

interface DeleteResult {
  affectedRows: number;
}

interface ReservationRow {
  id: number;
  room_id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: string;
  admin_notes: string | null;
  course: string | null;
  year: string | null;
  block: string | null;
  created_at: Date;
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
  user_year?: string;  // User's year
  user_block?: string; // User's block
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
    const reservationId = parseInt(id);
    
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid reservation ID' }, { status: 400 });
    }

    const updateData = await request.json();
    const connection = await pool.getConnection();
    
    try {
      // First, check if the reservation exists and belongs to the user
      const [reservations] = await connection.execute(
        'SELECT id, user_id, status, course, year, block FROM reservations WHERE id = ?',
        [reservationId]
      );

      const reservationArray = reservations as Array<{ 
        id: number; 
        user_id: number; 
        status: string; 
        course: string | null;
        year: string | null;
        block: string | null;
      }>;
      
      if (reservationArray.length === 0) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      const reservation = reservationArray[0];

      // Check if the reservation belongs to the current user
      // Only allow users to edit their own reservations unless they're admin
      if (reservation.user_id !== decoded.userId && decoded.role !== 'admin') {
        return NextResponse.json(
          { error: 'You can only edit your own reservations' },
          { status: 403 }
        );
      }

      // Check if reservation can be edited (only pending reservations can be edited by users)
      if (reservation.status !== 'pending' && decoded.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only pending reservations can be edited' },
          { status: 400 }
        );
      }

      // Build dynamic update query for instructor edits
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      // Fields that instructors can update
      if (updateData.room_id !== undefined) {
        updateFields.push('room_id = ?');
        updateValues.push(updateData.room_id);
      }

      if (updateData.date !== undefined) {
        updateFields.push('date = ?');
        updateValues.push(updateData.date);
      }

      if (updateData.start_time !== undefined) {
        updateFields.push('start_time = ?');
        updateValues.push(updateData.start_time);
      }

      if (updateData.end_time !== undefined) {
        updateFields.push('end_time = ?');
        updateValues.push(updateData.end_time);
      }

      if (updateData.purpose !== undefined) {
        updateFields.push('purpose = ?');
        updateValues.push(updateData.purpose);
      }

      // Course, year, block fields - only instructors can update these
      if (updateData.course !== undefined && decoded.role === 'instructor') {
        updateFields.push('course = ?');
        updateValues.push(updateData.course);
      }

      if (updateData.year !== undefined && decoded.role === 'instructor') {
        updateFields.push('year = ?');
        updateValues.push(updateData.year);
      }

      if (updateData.block !== undefined && decoded.role === 'instructor') {
        updateFields.push('block = ?');
        updateValues.push(updateData.block);
      }

      // Admin-only fields
      if (decoded.role === 'admin') {
        if (updateData.status !== undefined) {
          updateFields.push('status = ?');
          updateValues.push(updateData.status);
        }

        if (updateData.admin_notes !== undefined) {
          updateFields.push('admin_notes = ?');
          updateValues.push(updateData.admin_notes);
        }
        
        // Admin can also update course, year, block
        if (updateData.course !== undefined) {
          updateFields.push('course = ?');
          updateValues.push(updateData.course);
        }

        if (updateData.year !== undefined) {
          updateFields.push('year = ?');
          updateValues.push(updateData.year);
        }

        if (updateData.block !== undefined) {
          updateFields.push('block = ?');
          updateValues.push(updateData.block);
        }
      }

      if (updateFields.length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      updateValues.push(reservationId);
      const query = `UPDATE reservations SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      const [result] = await connection.execute(query, updateValues);
      const updateResult = result as UpdateResult;

      if (updateResult.affectedRows === 0) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      // Get updated reservation details
      const [updatedReservations] = await connection.execute(`
        SELECT r.*, 
               rm.room_number, rm.building, rm.capacity, rm.type, rm.equipment, rm.is_available,
               u.name as user_name, u.email as user_email, u.role as user_role, 
               u.student_id, u.department, u.year as user_year, u.block as user_block
        FROM reservations r
        JOIN rooms rm ON r.room_id = rm.id
        JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [reservationId]);
      
      const updatedArray = updatedReservations as ReservationRow[];
      if (updatedArray.length === 0) {
        return NextResponse.json({ error: 'Reservation not found after update' }, { status: 404 });
      }
      
      const updatedReservation = updatedArray[0];
      
      const transformedReservation = {
        id: updatedReservation.id,
        room_id: updatedReservation.room_id,
        user_id: updatedReservation.user_id,
        date: updatedReservation.date,
        start_time: updatedReservation.start_time,
        end_time: updatedReservation.end_time,
        purpose: updatedReservation.purpose,
        status: updatedReservation.status,
        admin_notes: updatedReservation.admin_notes,
        created_at: updatedReservation.created_at,
        course: updatedReservation.course,
        year: updatedReservation.year,
        block: updatedReservation.block,
        room: {
          id: updatedReservation.room_id,
          room_number: updatedReservation.room_number,
          building: updatedReservation.building,
          capacity: updatedReservation.capacity,
          type: updatedReservation.type,
          equipment: updatedReservation.equipment,
          is_available: updatedReservation.is_available,
          created_at: updatedReservation.created_at
        },
        user: {
          id: updatedReservation.user_id,
          name: updatedReservation.user_name,
          email: updatedReservation.user_email,
          role: updatedReservation.user_role,
          student_id: updatedReservation.student_id,
          department: updatedReservation.department,
          year: updatedReservation.user_year,
          block: updatedReservation.user_block,
          created_at: updatedReservation.created_at
        }
      };

      return NextResponse.json({ 
        message: 'Reservation updated successfully',
        data: transformedReservation
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update reservation error:', error);
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
    const reservationId = parseInt(id);
    
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid reservation ID' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      // First, check if the reservation exists and belongs to the user
      const [reservations] = await connection.execute(
        'SELECT id, user_id, status FROM reservations WHERE id = ?',
        [reservationId]
      );

      const reservationArray = reservations as Array<{ id: number; user_id: number; status: string }>;
      
      if (reservationArray.length === 0) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      const reservation = reservationArray[0];

      // Check if the reservation belongs to the current user
      // Only allow users to delete their own reservations unless they're admin
      if (reservation.user_id !== decoded.userId && decoded.role !== 'admin') {
        return NextResponse.json(
          { error: 'You can only delete your own reservations' },
          { status: 403 }
        );
      }

      // Allow deletion of completed, cancelled, and rejected reservations for history cleanup
      const allowedHistoryStatuses = ['completed', 'cancelled', 'rejected'];
      
      // For pending reservations, only allow deletion if user is owner or admin
      if (reservation.status === 'pending') {
        if (decoded.role !== 'admin') {
          return NextResponse.json(
            { error: 'Pending reservations cannot be deleted. Please cancel them first.' },
            { status: 400 }
          );
        }
      }

      // For approved reservations, check if they can be deleted
      if (reservation.status === 'approved' && decoded.role !== 'admin') {
        // Check if the reservation is in the past (completed)
        const [reservationDetails] = await connection.execute(
          'SELECT date, end_time FROM reservations WHERE id = ?',
          [reservationId]
        );
        
        const detailsArray = reservationDetails as Array<{ date: string; end_time: string }>;
        if (detailsArray.length > 0) {
          const detail = detailsArray[0];
          const reservationDateTime = new Date(`${detail.date}T${detail.end_time}`);
          const now = new Date();
          
          // Only allow deletion if reservation has ended
          if (reservationDateTime > now) {
            return NextResponse.json(
              { error: 'Upcoming approved reservations cannot be deleted. Please cancel them first.' },
              { status: 400 }
            );
          }
        }
      }

      const [result] = await connection.execute(
        'DELETE FROM reservations WHERE id = ?',
        [reservationId]
      );

      const deleteResult = result as DeleteResult;

      if (deleteResult.affectedRows === 0) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        message: 'Reservation deleted successfully' 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete reservation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}