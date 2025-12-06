import mysql from 'mysql2/promise';
import { hashPassword } from './auth';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cict_roomsched',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

export const pool = mysql.createPool(dbConfig);

export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful');
    connection.release();
    return true;
  } catch (error: unknown) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

interface UserData {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  student_id?: string;
  department?: string;
  year?: string;
  block?: string;
}

interface RoomData {
  room_number: string;
  building: string;
  capacity: number;
  type: 'classroom' | 'lab' | 'conference';
  equipment: string;
  is_available: boolean;
}

interface ClassScheduleData {
  room_id: number;
  instructor_id: number;
  course_code: string;
  course_name: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  start_time: string;
  end_time: string;
}

export async function initDB(): Promise<void> {
  console.log('🔄 Starting database initialization...');
  
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to database. Please check if MySQL is running.');
    }
    const connection = await pool.getConnection();
    
    try {
      console.log('🗑️ Dropping existing tables and triggers...');
      
      // Use raw queries for DROP TRIGGER since they don't support prepared statements
      await connection.query(`DROP TRIGGER IF EXISTS after_users_insert`);
      await connection.query(`DROP TRIGGER IF EXISTS after_users_update`);
      await connection.query(`DROP TRIGGER IF EXISTS after_users_delete`);
      await connection.query(`DROP TRIGGER IF EXISTS after_rooms_insert`);
      await connection.query(`DROP TRIGGER IF EXISTS after_rooms_update`);
      await connection.query(`DROP TRIGGER IF EXISTS after_rooms_delete`);
      await connection.query(`DROP TRIGGER IF EXISTS after_reservations_insert`);
      await connection.query(`DROP TRIGGER IF EXISTS after_reservations_update`);
      await connection.query(`DROP TRIGGER IF EXISTS after_reservations_delete`);
      
      // Drop tables
      await connection.execute(`DROP TABLE IF EXISTS class_schedules`);
      await connection.execute(`DROP TABLE IF EXISTS reservations`);
      await connection.execute(`DROP TABLE IF EXISTS rooms`);
      await connection.execute(`DROP TABLE IF EXISTS account_status`);
      await connection.execute(`DROP TABLE IF EXISTS users`);
      await connection.execute(`DROP TABLE IF EXISTS user_log`);
      await connection.execute(`DROP TABLE IF EXISTS notifications`);
      await connection.execute(`DROP VIEW IF EXISTS user_activity_view`);
      console.log('✅ Existing tables and triggers dropped');
      
      // Create users table
      console.log('👥 Creating users table...');
      await connection.execute(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          role ENUM('student', 'instructor', 'admin') NOT NULL,
          student_id VARCHAR(50) NULL,
          department VARCHAR(255) NULL,
          year VARCHAR(10) NULL,
          block VARCHAR(10) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Users table created');
      
      // Create account_status table
      console.log('📊 Creating account_status table...');
      await connection.execute(`
        CREATE TABLE account_status (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL UNIQUE,
          user_type ENUM('student', 'instructor', 'admin') NOT NULL,
          status ENUM('active', 'inactive') DEFAULT 'active',
          is_online BOOLEAN DEFAULT FALSE,
          last_login TIMESTAMP NULL,
          last_logout TIMESTAMP NULL,
          login_count INT DEFAULT 0,
          last_activity TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_type (user_type),
          INDEX idx_is_online (is_online),
          INDEX idx_last_activity (last_activity)
        )
      `);
      console.log('✅ Account_status table created');
      
      // Create rooms table
      console.log('🏫 Creating rooms table...');
      await connection.execute(`
        CREATE TABLE rooms (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_number VARCHAR(50) UNIQUE NOT NULL,
          building VARCHAR(255) NOT NULL,
          capacity INT NOT NULL,
          type ENUM('classroom', 'lab', 'conference') DEFAULT 'classroom',
          equipment TEXT,
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Rooms table created');
      
      // Create reservations table with course, year, block
      console.log('📅 Creating reservations table...');
      await connection.execute(`
        CREATE TABLE reservations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_id INT NOT NULL,
          user_id INT NOT NULL,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          purpose VARCHAR(255) NOT NULL,
          status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
          admin_notes TEXT NULL,
          course VARCHAR(255) NULL,
          year VARCHAR(10) NULL,
          block VARCHAR(10) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Reservations table created');
      
      // Create class_schedules table
      console.log('📚 Creating class_schedules table...');
      await connection.execute(`
        CREATE TABLE class_schedules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_id INT NOT NULL,
          instructor_id INT NOT NULL,
          course_code VARCHAR(50) NOT NULL,
          course_name VARCHAR(255) NOT NULL,
          day ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ Class schedules table created');
      
      // Create user_log table
      console.log('📝 Creating user_log table...');
      await connection.execute(`
        CREATE TABLE user_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          action_type ENUM('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'CANCEL', 'RESET_PASSWORD', 'CHANGE_PASSWORD') NOT NULL,
          table_name VARCHAR(50) NOT NULL,
          record_id INT NULL,
          description TEXT NOT NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_action_time (action_time),
          INDEX idx_action_type (action_type),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      console.log('✅ User_log table created');
      
      // Create notifications table
      console.log('🔔 Creating notifications table...');
      await connection.execute(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          sender_id INT NULL,
          type ENUM('room_created', 'room_updated', 'room_available', 'room_unavailable', 
                   'room_deleted', 'reservation_created', 'reservation_approved', 
                   'reservation_rejected', 'reservation_cancelled', 'reservation_updated',
                   'user_created', 'user_updated', 'user_deleted', 'system_alert') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          related_table VARCHAR(50) NULL,
          related_id INT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          is_important BOOLEAN DEFAULT FALSE,
          expires_at TIMESTAMP NULL,
          read_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at),
          INDEX idx_expires_at (expires_at),
          INDEX idx_type (type),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
          CHECK (expires_at IS NULL OR expires_at > created_at)
        )
      `);
      console.log('✅ Notifications table created');
      
      // Create user_activity_view
      console.log('👁️ Creating user_activity_view...');
      await connection.execute(`
        CREATE VIEW user_activity_view AS
        SELECT 
          ul.id,
          ul.action_time,
          ul.action_type,
          ul.table_name,
          ul.record_id,
          ul.description,
          ul.ip_address,
          ul.user_agent,
          u.name as user_name,
          u.email as user_email,
          u.role as user_role
        FROM user_log ul
        LEFT JOIN users u ON ul.user_id = u.id
        ORDER BY ul.action_time DESC
      `);
      console.log('✅ User_activity_view created');
      
      await insertSampleData(connection);
      await createTriggers(connection);
      console.log('🎉 Database initialization completed successfully!');
      
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    throw error;
  }
}

async function createTriggers(connection: mysql.PoolConnection): Promise<void> {
  console.log('⚡ Creating database triggers...');
  
  // USERS TABLE TRIGGERS
  // Create account_status when user is created
  await connection.query(`
    CREATE TRIGGER create_account_status_on_user
    AFTER INSERT ON users
    FOR EACH ROW
    BEGIN
      INSERT INTO account_status (user_id, user_type) 
      VALUES (NEW.id, NEW.role);
    END
  `);
  
  // Update account_status user_type when user role is updated
  await connection.query(`
    CREATE TRIGGER update_account_status_user_type
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      IF OLD.role != NEW.role THEN
        UPDATE account_status 
        SET user_type = NEW.role
        WHERE user_id = NEW.id;
      END IF;
    END
  `);
  
  // Existing user triggers (keep these)
  await connection.query(`
    CREATE TRIGGER after_users_insert 
    AFTER INSERT ON users 
    FOR EACH ROW 
    INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
    VALUES (NEW.id, 'INSERT', 'users', NEW.id, CONCAT('User created: ', NEW.name, ' (', NEW.email, ')'))
  `);
  
  await connection.query(`
    CREATE TRIGGER after_users_update 
    AFTER UPDATE ON users 
    FOR EACH ROW 
    INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
    VALUES (NEW.id, 'UPDATE', 'users', NEW.id, CONCAT('User updated: ', NEW.name, ' (', NEW.email, ')'))
  `);
  
  await connection.query(`
    CREATE TRIGGER after_users_delete 
    AFTER DELETE ON users 
    FOR EACH ROW 
    INSERT INTO user_log (action_type, table_name, record_id, description) 
    VALUES ('DELETE', 'users', OLD.id, CONCAT('User deleted: ', OLD.name, ' (', OLD.email, ')'))
  `);
  
  // ROOMS TABLE TRIGGERS (keep these)
  await connection.query(`
    CREATE TRIGGER after_rooms_insert 
    AFTER INSERT ON rooms 
    FOR EACH ROW 
    INSERT INTO user_log (action_type, table_name, record_id, description) 
    VALUES ('INSERT', 'rooms', NEW.id, CONCAT('Room created: ', NEW.room_number, ' - ', NEW.building))
  `);
  
  await connection.query(`
    CREATE TRIGGER after_rooms_update 
    AFTER UPDATE ON rooms 
    FOR EACH ROW 
    INSERT INTO user_log (action_type, table_name, record_id, description) 
    VALUES ('UPDATE', 'rooms', NEW.id, CONCAT('Room updated: ', NEW.room_number, ' - ', NEW.building))
  `);
  
  await connection.query(`
    CREATE TRIGGER after_rooms_delete 
    AFTER DELETE ON rooms 
    FOR EACH ROW 
    INSERT INTO user_log (action_type, table_name, record_id, description) 
    VALUES ('DELETE', 'rooms', OLD.id, CONCAT('Room deleted: ', OLD.room_number, ' - ', OLD.building))
  `);
  
  // RESERVATIONS TABLE TRIGGERS (keep these)
  await connection.query(`
    CREATE TRIGGER after_reservations_insert 
    AFTER INSERT ON reservations 
    FOR EACH ROW 
    INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
    VALUES (NEW.user_id, 'INSERT', 'reservations', NEW.id, 
      CONCAT('Reservation created: Room #', 
      (SELECT room_number FROM rooms WHERE id = NEW.room_id), 
      ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time))
  `);
  
  await connection.query(`
    CREATE TRIGGER after_reservations_update 
    AFTER UPDATE ON reservations 
    FOR EACH ROW 
    BEGIN
      DECLARE action_type_val VARCHAR(50);
      DECLARE description_val TEXT;
      DECLARE room_num VARCHAR(50);
      
      SELECT room_number INTO room_num FROM rooms WHERE id = NEW.room_id;
      
      IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        SET action_type_val = 'CANCEL';
        SET description_val = CONCAT('Reservation cancelled: Room #', room_num, 
          ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time);
      ELSEIF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        SET action_type_val = 'APPROVE';
        SET description_val = CONCAT('Reservation approved: Room #', room_num, 
          ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time);
      ELSEIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        SET action_type_val = 'REJECT';
        SET description_val = CONCAT('Reservation rejected: Room #', room_num, 
          ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time);
      ELSE
        SET action_type_val = 'UPDATE';
        SET description_val = CONCAT('Reservation updated: Room #', room_num, 
          ' for ', NEW.date, ' ', NEW.start_time, '-', NEW.end_time);
      END IF;
      
      INSERT INTO user_log (user_id, action_type, table_name, record_id, description) 
      VALUES (NEW.user_id, action_type_val, 'reservations', NEW.id, description_val);
    END
  `);
  
  await connection.query(`
    CREATE TRIGGER after_reservations_delete 
    AFTER DELETE ON reservations 
    FOR EACH ROW 
    BEGIN
      DECLARE room_num VARCHAR(50);
      SELECT room_number INTO room_num FROM rooms WHERE id = OLD.room_id;
      
      INSERT INTO user_log (action_type, table_name, record_id, description) 
      VALUES ('DELETE', 'reservations', OLD.id, 
        CONCAT('Reservation deleted: Room #', room_num, 
        ' for ', OLD.date, ' ', OLD.start_time, '-', OLD.end_time));
    END
  `);
  
  console.log('✅ All triggers created');
}

// Helper function to manually log specific actions
export async function logUserAction(
  userId: number | null,
  actionType: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'RESET_PASSWORD' | 'CHANGE_PASSWORD',
  tableName: string,
  recordId: number | null,
  description: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO user_log (user_id, action_type, table_name, record_id, description, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, actionType, tableName, recordId, description, ipAddress || null, userAgent || null]
    );
  } catch (error) {
    console.error('Error logging user action:', error);
  }
}

// Function to get user activity logs
export async function getUserActivityLogs(
  limit: number = 100,
  offset: number = 0,
  userId?: number,
  actionType?: string
): Promise<unknown[]> {
  try {
    let query = `SELECT * FROM user_activity_view WHERE 1=1`;
    const params: unknown[] = [];
    
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    
    if (actionType) {
      query += ` AND action_type = ?`;
      params.push(actionType);
    }
    
    query += ` ORDER BY action_time DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const [rows] = await pool.execute(query, params);
    return rows as unknown[];
  } catch (error) {
    console.error('Error getting user activity logs:', error);
    return [];
  }
}

// NEW FUNCTION: Get users with online status
export async function getUsersWithStatus(): Promise<unknown[]> {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.student_id,
        u.department,
        u.year,
        u.block,
        COALESCE(as.status, 'active') as status,
        COALESCE(as.is_online, FALSE) as is_online,
        as.last_login,
        as.last_activity,
        TIMESTAMPDIFF(MINUTE, as.last_activity, NOW()) as minutes_inactive
      FROM users u
      LEFT JOIN account_status as ON u.id = as.user_id
      WHERE u.role IN ('student', 'instructor')
      ORDER BY 
        CASE 
          WHEN as.is_online = TRUE AND (TIMESTAMPDIFF(MINUTE, as.last_activity, NOW()) < 5 OR as.last_activity IS NULL) THEN 1
          WHEN COALESCE(as.status, 'active') = 'active' THEN 2
          ELSE 3
        END,
        as.last_activity DESC
    `);
    return rows as unknown[];
  } catch (error) {
    console.error('Error getting users with status:', error);
    return [];
  }
}

// NEW FUNCTION: Update user online status
export async function updateUserOnlineStatus(
  userId: number,
  isOnline: boolean
): Promise<boolean> {
  try {
    if (isOnline) {
      await pool.execute(
        `INSERT INTO account_status (user_id, user_type, is_online, last_activity, status)
         SELECT id, role, TRUE, NOW(), 'active'
         FROM users 
         WHERE id = ?
         ON DUPLICATE KEY UPDATE
         is_online = TRUE,
         last_activity = NOW(),
         status = 'active'`,
        [userId]
      );
    } else {
      await pool.execute(
        `UPDATE account_status 
         SET is_online = FALSE,
             last_logout = NOW()
         WHERE user_id = ?`,
        [userId]
      );
    }
    return true;
  } catch (error) {
    console.error('Error updating user online status:', error);
    return false;
  }
}

// NEW FUNCTION: Get user status
export async function getUserStatus(userId: number): Promise<unknown> {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        as.status,
        as.is_online,
        as.last_login,
        as.last_activity,
        TIMESTAMPDIFF(MINUTE, as.last_activity, NOW()) as minutes_inactive
       FROM account_status as
       WHERE as.user_id = ?`,
      [userId]
    );
    
    const results = rows as unknown[];
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting user status:', error);
    return null;
  }
}

async function insertSampleData(connection: mysql.PoolConnection): Promise<void> {
  try {
    const hashedPassword = await hashPassword('password');
    
    // Insert sample users
    const sampleUsers: UserData[] = [
      { 
        email: 'admin@cict.edu.ph', 
        password: hashedPassword, 
        name: 'System Administrator', 
        role: 'admin' 
      },
      { 
        email: 'instructor@cict.edu.ph', 
        password: hashedPassword, 
        name: 'Instructor One', 
        role: 'instructor', 
        department: 'CICT' 
      },
      { 
        email: 'student@student.cict.edu.ph', 
        password: hashedPassword, 
        name: 'Student One', 
        role: 'student', 
        student_id: '2025-001', 
        department: 'BS in Computer Science',
        year: '1',
        block: '1'
      },
      { 
        email: 'student2@student.cict.edu.ph', 
        password: hashedPassword, 
        name: 'Student Two', 
        role: 'student', 
        student_id: '2025-002', 
        department: 'BS in Information Technology',
        year: '2',
        block: '3'
      },
      { 
        email: 'chan.forest@cict.edu.ph', 
        password: hashedPassword, 
        name: 'Prof. Chan Forest', 
        role: 'instructor', 
        department: 'CICT' 
      },
    ];
    
    console.log('👤 Inserting sample users...');
    for (const user of sampleUsers) {
      await connection.execute(
        'INSERT INTO users (email, password, name, role, student_id, department, year, block) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [user.email, user.password, user.name, user.role, user.student_id || null, user.department || null, user.year || null, user.block || null]
      );
    }
    
    // Insert sample rooms - ICT Building and CCB
    const rooms: RoomData[] = [
      // ICT Building Classrooms
      { room_number: 'ICT RM-07', building: 'ICT Building', capacity: 40, type: 'classroom', equipment: 'Projector, Whiteboard, Aircon', is_available: true },
      { room_number: 'ICT RM-08', building: 'ICT Building', capacity: 35, type: 'classroom', equipment: 'Projector, Whiteboard, Aircon', is_available: true },
      { room_number: 'ICT RM-09', building: 'ICT Building', capacity: 40, type: 'classroom', equipment: 'Smart Board, Aircon', is_available: true },
      { room_number: 'ICT RM-10', building: 'ICT Building', capacity: 30, type: 'classroom', equipment: 'Projector, Whiteboard, Aircon', is_available: true },
      { room_number: 'ICT RM-11', building: 'ICT Building', capacity: 35, type: 'classroom', equipment: 'Smart Board, Aircon', is_available: true },
      
      // CCB Classrooms
      { room_number: 'CCB RM-01', building: 'Computer Center Building', capacity: 45, type: 'classroom', equipment: 'Projector, Whiteboard, Aircon', is_available: true },
      { room_number: 'CCB RM-02', building: 'Computer Center Building', capacity: 40, type: 'classroom', equipment: 'Projector, Whiteboard, Aircon', is_available: true },
      { room_number: 'CCB RM-03', building: 'Computer Center Building', capacity: 35, type: 'classroom', equipment: 'Smart Board, Aircon', is_available: true },
      { room_number: 'CCB RM-04', building: 'Computer Center Building', capacity: 30, type: 'classroom', equipment: 'Projector, Whiteboard, Aircon', is_available: true },
      { room_number: 'CCB RM-05', building: 'Computer Center Building', capacity: 40, type: 'classroom', equipment: 'Smart Board, Aircon', is_available: true },
      { room_number: 'CCB RM-06', building: 'Computer Center Building', capacity: 35, type: 'classroom', equipment: 'Projector, Whiteboard, Aircon', is_available: true },
      { room_number: 'CCB RM-07', building: 'Computer Center Building', capacity: 30, type: 'classroom', equipment: 'Smart Board, Aircon', is_available: true },
      
      // CCB Labs
      { room_number: 'CCB LAB-01', building: 'Computer Center Building', capacity: 25, type: 'lab', equipment: '25 Computers, Projector, Aircon', is_available: true },
      { room_number: 'CCB LAB-02', building: 'Computer Center Building', capacity: 25, type: 'lab', equipment: '25 Computers, Projector, Aircon', is_available: true },
      { room_number: 'CCB LAB-03', building: 'Computer Center Building', capacity: 30, type: 'lab', equipment: '30 Computers, Smart Board, Aircon', is_available: true },
      { room_number: 'CCB LAB-04', building: 'Computer Center Building', capacity: 20, type: 'lab', equipment: '20 Computers, Projector, Aircon', is_available: true }
    ];
    
    console.log('🏫 Inserting sample rooms...');
    for (const room of rooms) {
      await connection.execute(
        'INSERT INTO rooms (room_number, building, capacity, type, equipment, is_available) VALUES (?, ?, ?, ?, ?, ?)',
        [room.room_number, room.building, room.capacity, room.type, room.equipment, room.is_available]
      );
    }
    
    // Insert sample reservations with course, year, block
    console.log('📅 Inserting sample reservations...');
    const reservations = [
      // BSIT 3-3 reservations
      { room_id: 1, user_id: 2, date: '2024-12-20', start_time: '14:00:00', end_time: '15:30:00', 
        purpose: 'BSIT 3-3 Final Exam', status: 'approved', course: 'BS in Information Technology', year: '3', block: '3' },
      { room_id: 2, user_id: 2, date: '2024-12-21', start_time: '10:00:00', end_time: '12:00:00', 
        purpose: 'BSIT 3-3 Project Consultation', status: 'approved', course: 'BS in Information Technology', year: '3', block: '3' },
      
      // BSCS 2-2 reservations
      { room_id: 3, user_id: 2, date: '2024-12-22', start_time: '09:00:00', end_time: '11:00:00', 
        purpose: 'BSCS 2-2 Programming Lab', status: 'approved', course: 'BS in Computer Science', year: '2', block: '2' },
      
      // Pending reservation
      { room_id: 4, user_id: 2, date: '2024-12-23', start_time: '13:00:00', end_time: '15:00:00', 
        purpose: 'BSIS 4-1 Thesis Defense', status: 'pending', course: 'BS in Information Systems', year: '4', block: '1' },
      
      // Instructor's personal meeting (no course specified)
      { room_id: 5, user_id: 2, date: '2024-12-24', start_time: '16:00:00', end_time: '17:00:00', 
        purpose: 'Faculty Meeting', status: 'approved', course: null, year: null, block: null }
    ];
    
    for (const reservation of reservations) {
      await connection.execute(
        'INSERT INTO reservations (room_id, user_id, date, start_time, end_time, purpose, status, course, year, block) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [reservation.room_id, reservation.user_id, reservation.date, reservation.start_time, reservation.end_time, 
         reservation.purpose, reservation.status, reservation.course, reservation.year, reservation.block]
      );
    }
    
    // Insert sample class schedules
    console.log('📚 Inserting sample class schedules...');
    const classSchedules: ClassScheduleData[] = [
      // BSIT 3-3 classes
      { room_id: 1, instructor_id: 2, course_code: 'IT101', course_name: 'Introduction to Programming', 
        day: 'monday', start_time: '08:00:00', end_time: '10:00:00' },
      { room_id: 2, instructor_id: 2, course_code: 'IT202', course_name: 'Database Management', 
        day: 'wednesday', start_time: '10:00:00', end_time: '12:00:00' },
      
      // BSCS 2-2 classes
      { room_id: 3, instructor_id: 2, course_code: 'CS201', course_name: 'Data Structures', 
        day: 'tuesday', start_time: '13:00:00', end_time: '15:00:00' },
      { room_id: 4, instructor_id: 2, course_code: 'CS301', course_name: 'Algorithms', 
        day: 'thursday', start_time: '09:00:00', end_time: '11:00:00' }
    ];
    
    for (const schedule of classSchedules) {
      await connection.execute(
        'INSERT INTO class_schedules (room_id, instructor_id, course_code, course_name, day, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [schedule.room_id, schedule.instructor_id, schedule.course_code, schedule.course_name, 
         schedule.day, schedule.start_time, schedule.end_time]
      );
    }
    
    // Insert some sample log entries
    console.log('📝 Inserting sample log entries...');
    await connection.execute(`
      INSERT INTO user_log (user_id, action_type, table_name, record_id, description, action_time) 
      VALUES 
      (1, 'LOGIN', 'users', 1, 'Admin logged in', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
      (1, 'APPROVE', 'reservations', 1, 'Approved reservation for ICT RM-07', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
      (1, 'UPDATE', 'users', 2, 'Updated user: Instructor One', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
      (2, 'INSERT', 'reservations', 5, 'Created new reservation for CCB RM-05', DATE_SUB(NOW(), INTERVAL 15 MINUTE))
    `);
    
    // Insert sample notifications
    console.log('🔔 Inserting sample notifications...');
    await connection.execute(`
      INSERT INTO notifications (user_id, sender_id, type, title, message, related_table, related_id, is_read, created_at) 
      VALUES 
      (2, 1, 'room_created', 'New Room Available: ICT RM-07', 'A new room has been added to the system: ICT RM-07 in ICT Building. Capacity: 40 students.', 'rooms', 1, FALSE, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
      (3, 1, 'room_created', 'New Room Available: ICT RM-07', 'A new room has been added to the system: ICT RM-07 in ICT Building. Capacity: 40 students.', 'rooms', 1, FALSE, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
      (4, 1, 'room_created', 'New Room Available: ICT RM-07', 'A new room has been added to the system: ICT RM-07 in ICT Building. Capacity: 40 students.', 'rooms', 1, TRUE, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
      (2, 1, 'reservation_approved', 'Reservation Approved: ICT RM-07', 'Your reservation for ICT RM-07 on 2024-12-20 has been approved.', 'reservations', 1, FALSE, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
      (1, 2, 'reservation_created', 'New Reservation Request: CCB RM-05', 'Instructor One requested CCB RM-05 on 2024-12-24 (16:00 - 17:00) for: Faculty Meeting', 'reservations', 5, FALSE, DATE_SUB(NOW(), INTERVAL 15 MINUTE))
    `);
    
    // NEW: Mark some users as online for testing
    console.log('💡 Setting sample online statuses...');
    await connection.execute(`
      UPDATE account_status 
      SET is_online = TRUE, 
          last_activity = NOW(),
          last_login = DATE_SUB(NOW(), INTERVAL 30 MINUTE)
      WHERE user_id IN (1, 2, 3)
    `);
    
    await connection.execute(`
      UPDATE account_status 
      SET is_online = FALSE,
          last_logout = DATE_SUB(NOW(), INTERVAL 1 HOUR)
      WHERE user_id = 4
    `);
    
    console.log('📊 Sample data inserted successfully!');
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    throw error;
  }
}