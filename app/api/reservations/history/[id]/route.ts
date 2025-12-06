import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

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

    const { id } = await params;
    const reservationId = parseInt(id);
    
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid reservation ID' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      // Check if reservation exists and belongs to the user
      const [reservations] = await connection.execute(
        'SELECT id, user_id, status, date, end_time FROM reservations WHERE id = ?',
        [reservationId]
      );

      const reservationArray = reservations as Array<{ 
        id: number; 
        user_id: number; 
        status: string; 
        date: string;
        end_time: string;
      }>;
      
      if (reservationArray.length === 0) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      const reservation = reservationArray[0];

      // Check if the reservation belongs to the current user
      if (reservation.user_id !== decoded.userId && decoded.role !== 'admin') {
        return NextResponse.json(
          { error: 'You can only delete your own reservations' },
          { status: 403 }
        );
      }

      // Allow deletion of completed, cancelled, and rejected reservations
      const allowedHistoryStatuses = ['completed', 'cancelled', 'rejected'];
      
      // For pending reservations, don't allow deletion
      if (reservation.status === 'pending') {
        return NextResponse.json(
          { error: 'Pending reservations cannot be deleted from history. Please cancel them first.' },
          { status: 400 }
        );
      }

      // For approved reservations, check if they are in the past (completed)
      if (reservation.status === 'approved') {
        const reservationDateTime = new Date(`${reservation.date}T${reservation.end_time}`);
        const now = new Date();
        
        // Only allow deletion if reservation has ended
        if (reservationDateTime > now) {
          return NextResponse.json(
            { error: 'Upcoming approved reservations cannot be deleted. Please cancel them first.' },
            { status: 400 }
          );
        }
      }

      // Check if status is allowed for history deletion
      if (!allowedHistoryStatuses.includes(reservation.status) && reservation.status !== 'approved') {
        return NextResponse.json(
          { error: 'Only completed, cancelled, rejected, or past approved reservations can be deleted from history.' },
          { status: 400 }
        );
      }

      const [result] = await connection.execute(
        'DELETE FROM reservations WHERE id = ?',
        [reservationId]
      );

      const deleteResult = result as { affectedRows: number };

      if (deleteResult.affectedRows === 0) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        message: 'Reservation deleted from history successfully' 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Delete reservation history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}