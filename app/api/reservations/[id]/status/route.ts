import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';
import { sendReservationNotification } from '@/lib/notifications';

interface UpdateResult {
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
    const reservationId = parseInt(id);
    
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid reservation ID' }, { status: 400 });
    }

    const { status, admin_notes } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, approved, rejected, cancelled' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      // Check if reservation exists and get current status
      const [reservations] = await connection.execute(
        'SELECT id, user_id, status, room_id, date, start_time, end_time FROM reservations WHERE id = ?',
        [reservationId]
      );

      const reservationArray = reservations as Array<{ 
        id: number; 
        user_id: number; 
        status: string;
        room_id: number;
        date: string;
        start_time: string;
        end_time: string;
      }>;
      
      if (reservationArray.length === 0) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      const reservation = reservationArray[0];

      // Get user role from database to ensure we have the most current role
      const [users] = await connection.execute(
        'SELECT role, name FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      const userArray = users as Array<{ role: string; name: string }>;
      if (userArray.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      const userRole = userArray[0].role;
      const adminName = userArray[0].name;

      // Authorization checks - only allow admin to approve/reject
      // Users can only cancel their own reservations
      if (status === 'cancelled') {
        if (reservation.user_id !== decoded.userId && userRole !== 'admin') {
          return NextResponse.json(
            { error: 'You can only cancel your own reservations' },
            { status: 403 }
          );
        }
        if (!['pending', 'approved'].includes(reservation.status)) {
          return NextResponse.json(
            { error: 'Only pending or approved reservations can be cancelled' },
            { status: 400 }
          );
        }
      } else if (['approved', 'rejected'].includes(status)) {
        // Only admin can approve or reject reservations
        if (userRole !== 'admin') {
          return NextResponse.json(
            { error: 'Only administrators can approve or reject reservations' },
            { status: 403 }
          );
        }
      }

      // Update the reservation status
      const [result] = await connection.execute(
        'UPDATE reservations SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, admin_notes || null, reservationId]
      );

      const updateResult = result as UpdateResult;

      if (updateResult.affectedRows === 0) {
        return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
      }

      // Send notifications based on the status change
      try {
        if (status === 'approved') {
          await sendReservationNotification(
            reservationId,
            reservation.user_id,
            decoded.userId, // adminId - who approved it
            'approved'
          );
          console.log(`📢 Notification sent for approved reservation ID: ${reservationId} by admin ID: ${decoded.userId}`);
        } else if (status === 'rejected') {
          await sendReservationNotification(
            reservationId,
            reservation.user_id,
            decoded.userId, // adminId - who rejected it
            'rejected'
          );
          console.log(`📢 Notification sent for rejected reservation ID: ${reservationId} by admin ID: ${decoded.userId}`);
        } else if (status === 'cancelled') {
          // If admin cancels someone else's reservation
          if (userRole === 'admin' && reservation.user_id !== decoded.userId) {
            await sendReservationNotification(
              reservationId,
              reservation.user_id,
              decoded.userId, // adminId - who cancelled it
              'cancelled'
            );
            console.log(`📢 Notification sent for admin-cancelled reservation ID: ${reservationId}`);
          } else if (reservation.user_id === decoded.userId) {
            // If user cancels their own reservation
            await sendReservationNotification(
              reservationId,
              reservation.user_id,
              null, // No admin involved
              'cancelled'
            );
            console.log(`📢 Notification sent for user-cancelled reservation ID: ${reservationId}`);
          }
        }
      } catch (notificationError) {
        // Don't fail the whole request if notification fails
        console.error('Notification error:', notificationError);
      }

      // Get updated reservation with room info for response
      const [updatedRes] = await connection.execute(
        `SELECT r.*, 
                rm.room_number, rm.building,
                u.name as user_name, u.email as user_email,
                a.name as admin_name
         FROM reservations r
         JOIN rooms rm ON r.room_id = rm.id
         JOIN users u ON r.user_id = u.id
         LEFT JOIN users a ON a.id = ?
         WHERE r.id = ?`,
        [decoded.userId, reservationId]
      );

      const updatedResArray = updatedRes as Array<unknown>;
      
      return NextResponse.json({ 
        success: true,
        message: `Reservation ${status} successfully`,
        data: updatedResArray[0] || null,
        admin_name: adminName // Include admin name in response if needed
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update reservation status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}