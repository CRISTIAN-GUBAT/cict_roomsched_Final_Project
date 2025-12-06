import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// Define TypeScript types
type UserStatusRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  student_id: string | null;
  department: string | null;
  year: string | null;
  block: string | null;
  status: 'active' | 'inactive';
  is_online: number;
  last_login: string | null;
  last_activity: string | null;
  minutes_inactive: number | null;
};

type ProcessedUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  student_id: string | null;
  department: string | null;
  year: string | null;
  block: string | null;
  status: 'active' | 'inactive';
  is_online: boolean;
  last_login: string | null;
  last_activity: string | null;
  minutes_inactive: number;
};

type ApiResponse = {
  users: ProcessedUser[];
  total: number;
  online_count: number;
};

export async function GET(request: NextRequest) {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(`
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

      const userRows = rows as UserStatusRow[];
      
      if (!Array.isArray(userRows)) {
        throw new Error('Invalid response from database');
      }

      const processedUsers: ProcessedUser[] = userRows.map(row => {
        const isOnlineBoolean = row.is_online === 1;
        const minutesInactive = row.minutes_inactive ?? 999;
        
        const isCurrentlyOnline = isOnlineBoolean && 
          (minutesInactive < 5 || row.last_activity === null);
        
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          student_id: row.student_id,
          department: row.department,
          year: row.year,
          block: row.block,
          status: row.status,
          is_online: isCurrentlyOnline,
          last_login: row.last_login,
          last_activity: row.last_activity,
          minutes_inactive: minutesInactive
        };
      });

      const onlineCount = processedUsers.filter(u => u.is_online).length;

      const response: ApiResponse = {
        users: processedUsers,
        total: processedUsers.length,
        online_count: onlineCount
      };

      return NextResponse.json(response);
      
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Get users with status error:', error);
    
    const errorResponse: ApiResponse = {
      users: [],
      total: 0,
      online_count: 0
    };
    
    return NextResponse.json(errorResponse);
  }
}