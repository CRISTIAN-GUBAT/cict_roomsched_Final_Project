import { pool } from './database';
import { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2';

export interface NotificationData {
  id: number;
  user_id: number;
  sender_id: number | null;
  type: string;
  title: string;
  message: string;
  related_table: string | null;
  related_id: number | null;
  is_read: boolean;
  is_important: boolean;
  expires_at: string | null;
  created_at: string;
  read_at: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_role: string | null;
}

export interface NotificationCreateData {
  userIds: number[] | 'all' | 'instructors' | 'students' | 'admin';
  senderId: number | null;
  type: string;
  title: string;
  message: string;
  relatedTable?: string;
  relatedId?: number;
  isImportant?: boolean;
  expiresInHours?: number;
}

interface UserRow extends RowDataPacket {
  id: number;
}

// Helper function to convert 24-hour time to 12-hour format with AM/PM
function formatTimeToAMPM(time24: string): string {
  if (!time24) return '';
  
  try {
    // Split time string (e.g., "13:15:00")
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convert 0 or 24 to 12
    
    // Format minutes with leading zero if needed
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${hours12}:${formattedMinutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error, time24);
    return time24; // Return original if error
  }
}

// Helper function to format date in a readable format (e.g., "December 6, 2025")
function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error, dateStr);
    return dateStr; // Return original if error
  }
}

export async function createNotification(data: NotificationCreateData): Promise<number[]> {
  const connection = await pool.getConnection();
  
  try {
    // Get user IDs based on the target type
    let userIds: number[] = [];
    
    if (typeof data.userIds === 'string') {
      if (data.userIds === 'all') {
        const [allUsers] = await connection.execute<UserRow[]>(
          'SELECT id FROM users WHERE role IN ("student", "instructor", "admin")'
        );
        userIds = allUsers.map(u => u.id);
      } else if (data.userIds === 'instructors') {
        const [instructors] = await connection.execute<UserRow[]>(
          'SELECT id FROM users WHERE role = "instructor"'
        );
        userIds = instructors.map(u => u.id);
      } else if (data.userIds === 'students') {
        const [students] = await connection.execute<UserRow[]>(
          'SELECT id FROM users WHERE role = "student"'
        );
        userIds = students.map(u => u.id);
      } else if (data.userIds === 'admin') {
        const [admins] = await connection.execute<UserRow[]>(
          'SELECT id FROM users WHERE role = "admin"'
        );
        userIds = admins.map(u => u.id);
      }
    } else {
      // It's already an array of user IDs
      userIds = data.userIds;
    }
    
    if (userIds.length === 0) return [];
    
    // Calculate expires_at if provided
    const expiresAt = data.expiresInHours 
      ? `DATE_ADD(NOW(), INTERVAL ${data.expiresInHours} HOUR)`
      : 'NULL';
    
    // Create notifications for each user
    const notificationIds: number[] = [];
    for (const userId of userIds) {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO notifications 
         (user_id, sender_id, type, title, message, related_table, related_id, is_important, expires_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${expiresAt})`,
        [
          userId,
          data.senderId,
          data.type,
          data.title,
          data.message,
          data.relatedTable || null,
          data.relatedId || null,
          data.isImportant || false
        ]
      );
      
      if (result.insertId) {
        notificationIds.push(result.insertId);
      }
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Error creating notifications:', error);
    return [];
  } finally {
    connection.release();
  }
}

export async function getUserNotifications(userId: number, limit: number = 50): Promise<NotificationData[]> {
  try {
    const [rows] = await pool.execute<NotificationData[] & RowDataPacket[]>(
      `SELECT 
        n.*,
        u.name as sender_name,
        u.email as sender_email,
        u.role as sender_role
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.user_id = ? 
         AND (n.expires_at IS NULL OR n.expires_at > NOW())
       ORDER BY 
         CASE WHEN n.is_read = FALSE THEN 0 ELSE 1 END,
         CASE WHEN n.is_important = TRUE THEN 0 ELSE 1 END,
         n.created_at DESC
       LIMIT ?`,
      [userId, limit]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
  try {
    const [result] = await pool.execute<OkPacket>(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: number): Promise<boolean> {
  try {
    const [result] = await pool.execute<OkPacket>(
      `UPDATE notifications 
       SET is_read = TRUE, read_at = NOW() 
       WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

export async function deleteNotification(notificationId: number, userId: number): Promise<boolean> {
  try {
    const [result] = await pool.execute<OkPacket>(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

export async function getUnreadCount(userId: number): Promise<number> {
  try {
    const [rows] = await pool.execute<(RowDataPacket & { count: number })[]>(
      `SELECT COUNT(*) as count 
       FROM notifications 
       WHERE user_id = ? 
         AND is_read = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );
    
    return rows[0]?.count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

interface ReservationRow extends RowDataPacket {
  room_number: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  user_id: number;
}

interface UserNameRow extends RowDataPacket {
  name: string;
  email: string;
}

interface AdminRow extends RowDataPacket {
  name: string;
}

interface RoomRow extends RowDataPacket {
  room_number: string;
  building: string;
  capacity: number;
}

// Helper function to send notifications for reservation events
export async function sendReservationNotification(
  reservationId: number,
  userId: number,
  adminId: number | null,
  type: 'created' | 'approved' | 'rejected' | 'cancelled' | 'updated'
): Promise<void> {
  try {
    const connection = await pool.getConnection();
    try {
      const [reservationResult] = await connection.execute<ReservationRow[]>(
        `SELECT r.room_number, res.date, res.start_time, res.end_time, res.purpose, res.user_id 
         FROM reservations res 
         JOIN rooms r ON res.room_id = r.id 
         WHERE res.id = ?`,
        [reservationId]
      );
      
      const [userResult] = await connection.execute<UserNameRow[]>(
        'SELECT name, email FROM users WHERE id = ?',
        [userId]
      );
      
      // Get admin info if adminId is provided
      let adminName = 'Admin';
      if (adminId) {
        const [adminResult] = await connection.execute<AdminRow[]>(
          'SELECT name FROM users WHERE id = ?',
          [adminId]
        );
        if (adminResult.length > 0) {
          adminName = adminResult[0].name;
        }
      }
      
      if (reservationResult.length > 0 && userResult.length > 0) {
        const reservation = reservationResult[0];
        const user = userResult[0];
        
        let title = '';
        let message = '';
        let notificationType = '';
        let targetUsers: number[] | 'admin' | 'all' = [];
        let isImportant = false;
        
        // Format time and date
        const formattedDate = formatDateReadable(reservation.date);
        const startTimeAMPM = formatTimeToAMPM(reservation.start_time);
        const endTimeAMPM = formatTimeToAMPM(reservation.end_time);
        const timeRange = `${startTimeAMPM} - ${endTimeAMPM}`;
        
        switch (type) {
          case 'created':
            title = `New Reservation Request: ${reservation.room_number}`;
            message = `${user.name} (${user.email}) requested ${reservation.room_number} on ${formattedDate} (${timeRange}) for: ${reservation.purpose}`;
            notificationType = 'reservation_created';
            targetUsers = 'admin'; // Notify admin only
            isImportant = true;
            break;
            
          case 'approved':
            title = `Reservation Approved: ${reservation.room_number}`;
            message = `Your reservation for ${reservation.room_number} on ${formattedDate} (${timeRange}) has been approved by ${adminName}.`;
            notificationType = 'reservation_approved';
            targetUsers = [userId]; // Notify the specific user
            break;
            
          case 'rejected':
            title = `Reservation Rejected: ${reservation.room_number}`;
            message = `Your reservation for ${reservation.room_number} on ${formattedDate} (${timeRange}) was rejected by ${adminName}.`;
            notificationType = 'reservation_rejected';
            targetUsers = [userId]; // Notify the specific user
            isImportant = true;
            break;
            
          case 'cancelled':
            if (adminId) {
              title = `Reservation Cancelled: ${reservation.room_number}`;
              message = `${adminName} cancelled your reservation for ${reservation.room_number} on ${formattedDate}`;
              notificationType = 'reservation_cancelled';
              targetUsers = [userId]; // Notify the user
            } else {
              title = `Reservation Cancelled: ${reservation.room_number}`;
              message = `${user.name} cancelled their reservation for ${reservation.room_number} on ${formattedDate}`;
              notificationType = 'reservation_cancelled';
              targetUsers = 'admin'; // Notify admin
            }
            isImportant = true;
            break;
            
          case 'updated':
            title = `Reservation Updated: ${reservation.room_number}`;
            message = `Your reservation for ${reservation.room_number} on ${formattedDate} (${timeRange}) has been updated.`;
            notificationType = 'reservation_updated';
            targetUsers = [userId]; // Notify the specific user
            break;
        }
        
        await createNotification({
          userIds: targetUsers,
          senderId: adminId || userId, // Send as admin if admin action, otherwise as user
          type: notificationType,
          title,
          message,
          relatedTable: 'reservations',
          relatedId: reservationId,
          isImportant,
          expiresInHours: type === 'created' ? 72 : 48 // Expire in 3 days for new requests, 2 days for others
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error sending reservation notification:', error);
  }
}

// Helper function to send user-related notifications
export async function sendUserNotification(
  userId: number,
  adminId: number,
  type: 'created' | 'updated' | 'deleted' | 'password_reset',
  userName: string,
  userEmail: string
): Promise<void> {
  try {
    let title = '';
    let message = '';
    let notificationType = '';
    let targetUsers: number[] | 'admin' = [];
    let isImportant = false;
    
    switch (type) {
      case 'created':
        title = `New User Account Created: ${userName}`;
        message = `A new user account has been created for ${userName} (${userEmail})`;
        notificationType = 'user_created';
        targetUsers = 'admin';
        isImportant = false;
        break;
        
      case 'updated':
        title = `User Account Updated: ${userName}`;
        message = `The account for ${userName} (${userEmail}) has been updated`;
        notificationType = 'user_updated';
        targetUsers = 'admin';
        isImportant = false;
        break;
        
      case 'deleted':
        title = `User Account Deleted: ${userName}`;
        message = `The account for ${userName} (${userEmail}) has been deleted from the system`;
        notificationType = 'user_deleted';
        targetUsers = 'admin';
        isImportant = true;
        break;
        
      case 'password_reset':
        title = `Password Reset: ${userName}`;
        message = `Your password has been reset by the administrator. Please use "password" to login and change your password immediately.`;
        notificationType = 'system_alert';
        targetUsers = [userId];
        isImportant = true;
        break;
    }
    
    await createNotification({
      userIds: targetUsers,
      senderId: adminId,
      type: notificationType,
      title,
      message,
      relatedTable: 'users',
      relatedId: userId,
      isImportant,
      expiresInHours: type === 'password_reset' ? 24 : 48
    });
  } catch (error) {
    console.error('Error sending user notification:', error);
  }
}

// Helper function to send room-related notifications
export async function sendRoomCreatedNotification(roomId: number, adminId: number): Promise<void> {
  try {
    const connection = await pool.getConnection();
    try {
      const [roomResult] = await connection.execute<RoomRow[]>(
        'SELECT room_number, building, capacity FROM rooms WHERE id = ?',
        [roomId]
      );
      
      if (roomResult.length > 0) {
        const room = roomResult[0];
        await createNotification({
          userIds: 'all',
          senderId: adminId,
          type: 'room_created',
          title: `New Room Available: ${room.room_number}`,
          message: `A new room has been added to the system: ${room.room_number} in ${room.building}. Capacity: ${room.capacity} students.`,
          relatedTable: 'rooms',
          relatedId: roomId,
          isImportant: false
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error sending room created notification:', error);
  }
}

export async function sendRoomUpdatedNotification(roomId: number, adminId: number, isAvailable: boolean): Promise<void> {
  try {
    const connection = await pool.getConnection();
    try {
      const [roomResult] = await connection.execute<RoomRow[]>(
        'SELECT room_number, building FROM rooms WHERE id = ?',
        [roomId]
      );
      
      if (roomResult.length > 0) {
        const room = roomResult[0];
        const type = isAvailable ? 'room_available' : 'room_unavailable';
        const title = isAvailable 
          ? `Room Now Available: ${room.room_number}`
          : `Room Unavailable: ${room.room_number}`;
        const message = isAvailable
          ? `${room.room_number} in ${room.building} is now available for reservation.`
          : `${room.room_number} in ${room.building} is temporarily unavailable.`;
        
        await createNotification({
          userIds: 'all',
          senderId: adminId,
          type,
          title,
          message,
          relatedTable: 'rooms',
          relatedId: roomId,
          isImportant: false
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error sending room updated notification:', error);
  }
}