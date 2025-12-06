import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';
import { verifyToken } from '@/lib/auth';
import { OkPacket } from 'mysql2';

interface Params {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const notificationId = parseInt(params.id);
    const data = await request.json();

    let query = '';
    const queryParams: (string | number)[] = [];

    if (data.action === 'mark_read') {
      query = 'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?';
      queryParams.push(notificationId, payload.userId);
    } else if (data.action === 'mark_unread') {
      query = 'UPDATE notifications SET is_read = FALSE, read_at = NULL WHERE id = ? AND user_id = ?';
      queryParams.push(notificationId, payload.userId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const [result] = await pool.execute<OkPacket>(query, queryParams);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    const notificationId = parseInt(params.id);

    const [result] = await pool.execute<OkPacket>(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, payload.userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}