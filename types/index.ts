import { ReactNode } from "react";

export interface User {
  course: ReactNode;
  updated_at: string | undefined;
  id: number;
  email: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  student_id?: string;
  department?: string;
  year?: string;     
  block?: string;     
  created_at: string;
  password?: string; // for auth purposes
}

export interface Room {
  id: number;
  room_number: string;
  building: string;
  capacity: number;
  equipment: string;
  type: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: number;
  user_id: number;
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'active';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  room: Room;
  user: User;
  course?: string;     
  year?: string;      
  block?: string;
  calculatedStatus?: string;
}

export interface ClassSchedule {
  course: string;
  block: string;
  year: string;
  uniqueKey: string;
  id: number;
  room_id: number;
  instructor_id: number;
  course_code: string;
  course_name: string;
  day: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  room: Room;
  instructor: User;
  is_reservation?: boolean;
  reservation_date?: string;
  reservation_purpose?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  response?: {
    status?: number;
    data?: {
      errors?: Record<string, string[]>;
      message?: string;
    };
  };
  message?: string;
}

export interface TimeConflict {
  reservationId: number;
  type: 'reservation' | 'class';
  title: string;
  time: string;
  instructor: string;
  status: string;
}

export interface UserRow {
  id: number;
  password: string;
  role: string;
}

export interface QueryResult {
  affectedRows?: number;
  insertId?: number;
}

export interface ReservationWithDetails {
  id: number;
  room_id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'active';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  room_number: string;
  building: string;
  capacity: number;
  type: string;
  equipment: string;
  user_name: string;
  user_email: string;
  department?: string;
  course?: string;
  year?: string;
  block?: string;
}

export interface Notification {
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
  userIds: number[] | 'all' | 'instructors' | 'students';
  senderId: number | null;
  type: string;
  title: string;
  message: string;
  relatedTable?: string;
  relatedId?: number;
  isImportant?: boolean;
  expiresInHours?: number;
}

export interface UserStatus {
  user_id: number;
  user_type: string;
  status: 'active' | 'inactive';
  is_online: boolean;
  last_login: string | null;
  last_logout: string | null;
  last_activity: string;
  minutes_inactive: number;
}