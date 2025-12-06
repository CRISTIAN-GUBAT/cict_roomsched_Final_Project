'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import { Room, Reservation, TimeConflict, User } from '@/types';
import {
  Calendar as CalendarIcon,
  LogOut,
  User as UserIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  RefreshCw} from 'lucide-react';

interface ReservationFormData {
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  course: string;
  year: string;
  block: string;
}

interface FilterData {
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
}

interface ApiErrorResponse {
  response?: {
    data?: {
      error?: string;
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  message?: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface CalendarReservation {
  id: number;
  room_number: string;
  building: string;
  date: string;
  start_time: string;
  end_time: string;
  user_name: string;
  user_role: string;
  department: string;
  year: string;
  block: string;
  purpose: string;
  status: string;
}

interface TimeSlot {
  time: string;
  hour: number;
  display: string;
  timeLabel: string;
}

interface RoomSchedule {
  [roomNumber: string]: {
    [hour: number]: CalendarReservation[];
  };
}

// Toast Component
const Toast = ({ 
  message, 
  type = 'success', 
  onClose 
}: { 
  message: string; 
  type?: 'success' | 'error' | 'warning' | 'info'; 
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-gradient-to-r from-green-500 to-emerald-600',
    error: 'bg-gradient-to-r from-red-500 to-rose-600',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-600',
    info: 'bg-gradient-to-r from-blue-500 to-cyan-600'
  }[type];

  const icon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[type];

  return (
    <div className={`fixed top-6 right-6 ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-right-8 duration-300 backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg">{icon}</span>
          <span className="font-medium">{message}</span>
        </div>
        <button 
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 text-xl font-bold transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const formatTime = (time: string): string => {
  try {
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
};

const formatDisplayDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateString;
  }
};

// Course options with block configurations
const COURSE_OPTIONS = [
  {
    value: 'BS in Information Technology',
    label: 'BS in Information Technology',
    blocks: {
      year1: ['1', '2', '3', '4', '5'],
      year2: ['1', '2', '3', '4', '5'],
      year3: ['1', '2', '3', '4', '5'],
      year4: ['1', '2', '3', '4', '5']
    }
  },
  {
    value: 'BS in Computer Science',
    label: 'BS in Computer Science',
    blocks: {
      year1: ['1', '2'],
      year2: ['1', '2'],
      year3: ['1', '2'],
      year4: ['1', '2']
    }
  },
  {
    value: 'BS in Information Systems',
    label: 'BS in Information Systems',
    blocks: {
      year1: ['1', '2'],
      year2: ['1', '2'],
      year3: ['1', '2'],
      year4: ['1', '2']
    }
  },
  {
    value: 'BTVTED - Computer System Servicing',
    label: 'BTVTED - Computer System Servicing',
    blocks: {
      year1: ['1', '2'],
      year2: ['1', '2'],
      year3: ['1', '2'],
      year4: ['1', '2']
    }
  }
];

// Enhanced status calculation functions
const isReservationActive = (reservation: Reservation): boolean => {
  try {
    const reservationDate = new Date(reservation.date);
    const now = new Date();
    
    // Check if it's the same day
    const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (reservationDay.getTime() !== today.getTime()) {
      return false;
    }
    
    // Check if current time is between start and end time
    const [startHours, startMinutes] = reservation.start_time.split(':').map(Number);
    const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
    
    const startTime = new Date(reservationDate);
    startTime.setHours(startHours, startMinutes, 0, 0);
    
    const endTime = new Date(reservationDate);
    endTime.setHours(endHours, endMinutes, 0, 0);
    
    return now >= startTime && now <= endTime;
  } catch (error) {
    console.error('Error checking reservation activity:', error);
    return false;
  }
};

const isReservationCompleted = (reservation: Reservation): boolean => {
  try {
    const reservationDate = new Date(reservation.date);
    const now = new Date();
    
    // Check if reservation date is in the past
    const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (reservationDay < today) {
      return true;
    }
    
    // Check if it's today but end time has passed
    if (reservationDay.getTime() === today.getTime()) {
      const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
      const reservationEndTime = new Date(reservationDate);
      reservationEndTime.setHours(endHours, endMinutes, 0, 0);
      
      return now > reservationEndTime;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking reservation completion:', error);
    return false;
  }
};

const calculateReservationStatus = (reservation: Reservation): string => {
  // If it's manually set to cancelled, rejected, or completed, keep that status
  if (['cancelled', 'rejected', 'completed'].includes(reservation.status)) {
    return reservation.status;
  }
  
  // Auto-calculate status for approved reservations
  if (reservation.status === 'approved') {
    if (isReservationActive(reservation)) {
      return 'active';
    } else if (isReservationCompleted(reservation)) {
      return 'completed';
    }
  }
  
  return reservation.status;
};

const TimeConflictAlert = ({ conflicts }: { conflicts: TimeConflict[] }) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-red-50 to-rose-100 border border-red-200 rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-red-500 text-xl">⚠️</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-red-800">
            Time Conflict Detected!
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p className="mb-2 font-medium">The selected time conflicts with:</p>
            <ul className="list-disc list-inside space-y-1">
              {conflicts.map((conflict, index) => (
                <li key={index}>
                  <span className="font-semibold">{conflict.title}</span> 
                  {' '}({conflict.type === 'class' ? 'Class' : `${conflict.status} Reservation`})
                  {' '}at {conflict.time.split('-').map(t => formatTime(t.trim())).join(' - ')} by {conflict.instructor}
                </li>
              ))}
            </ul>
            <p className="mt-3 font-semibold">Please choose a different time or room.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// All Rooms View Modal - FIXED to show ALL reservations with working filters
const AllRoomsModal = ({ 
  isOpen, 
  onClose,
  rooms,
  allReservations
}: { 
  isOpen: boolean; 
  onClose: () => void;
  rooms: Room[];
  allReservations: Reservation[];
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [allReservationsList, setAllReservationsList] = useState<Reservation[]>(allReservations);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Load all reservations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAllReservations();
    }
  }, [isOpen]);

  // Fetch ALL reservations from all users
  const fetchAllReservations = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: Reservation[] }>('/api/reservations/all');
      setAllReservationsList(response.data || []);
    } catch (error) {
      console.error('Error fetching all reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get all unique room numbers
  const allRooms = Array.from(new Set(rooms.map(room => room.room_number))).sort();

  // Calculate room availability status based on current reservations
  const getRoomStatus = (room: Room): { status: 'available' | 'occupied' | 'scheduled'; reservation?: Reservation } => {
    const today = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
    
    // Find active reservation for this room today from ALL reservations
    const activeReservation = allReservationsList.find(res => {
      if (res.room?.room_number !== room.room_number) return false;
      
      const reservationDate = new Date(res.date);
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Check if it's today
      if (reservationDay.getTime() !== todayDay.getTime()) return false;
      
      // Check reservation status
      const status = calculateReservationStatus(res);
      if (status === 'cancelled' || status === 'rejected') return false;
      
      // Check if current time is within reservation time
      const [startHours, startMinutes] = res.start_time.split(':').map(Number);
      const [endHours, endMinutes] = res.end_time.split(':').map(Number);
      
      const startTime = startHours * 60 + startMinutes;
      const endTime = endHours * 60 + endMinutes;
      
      return currentTime >= startTime && currentTime <= endTime;
    });

    // Find scheduled future reservation for this room today
    const scheduledReservation = allReservationsList.find(res => {
      if (res.room?.room_number !== room.room_number) return false;
      
      const reservationDate = new Date(res.date);
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Check if it's today
      if (reservationDay.getTime() !== todayDay.getTime()) return false;
      
      // Check reservation status
      const status = calculateReservationStatus(res);
      if (status === 'cancelled' || status === 'rejected') return false;
      
      // Check if reservation is in the future today
      const [startHours, startMinutes] = res.start_time.split(':').map(Number);
      const startTime = startHours * 60 + startMinutes;
      
      return currentTime < startTime;
    });

    if (activeReservation) {
      return { status: 'occupied', reservation: activeReservation };
    } else if (scheduledReservation) {
      return { status: 'scheduled', reservation: scheduledReservation };
    } else {
      return { status: 'available' };
    }
  };

  // Filter reservations based on selected room and date - FIXED
  const filteredReservations = allReservationsList.filter(res => {
    // Filter by room number
    if (selectedRoom && res.room?.room_number !== selectedRoom) return false;
    
    // Filter by date - exact match
    if (selectedDate) {
      // Handle both string and Date comparisons
      const reservationDate = new Date(res.date);
      const filterDate = new Date(selectedDate);
      
      // Compare dates (ignore time)
      const reservationDateOnly = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
      
      if (reservationDateOnly.getTime() !== filterDateOnly.getTime()) return false;
    }
    
    return true;
  });

  // Filter rooms based on selected room - FIXED
  const filteredRooms = rooms.filter(room => {
    if (selectedRoom && room.room_number !== selectedRoom) return false;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-black">All Rooms & Reservations</h2>
            <p className="text-gray-600 mt-1 font-medium">View all rooms and reservations from all users</p>
            <p className="text-sm text-gray-500 font-semibold mt-1">
              Current time: {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-sm text-blue-600 font-semibold mt-1">
              Showing {filteredReservations.length} reservations | {filteredRooms.length} rooms
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={fetchAllReservations}
              variant="outline"
              size="sm"
              disabled={loading}
              className="font-semibold border-gray-300 text-black hover:border-gray-400"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Filter by Room</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
            >
              <option value="">All Rooms</option>
              {allRooms.map(room => (
                <option key={room} value={room}>
                  Room {room}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-2">Filter by Date</label>
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSelectedRoom('');
                setSelectedDate('');
              }}
              variant="outline"
              className="w-full border-gray-300 hover:border-gray-400 text-black font-semibold"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-black mb-4">Room Status ({filteredRooms.length} rooms)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map(room => {
              const { status, reservation } = getRoomStatus(room);
              const statusConfig = {
                available: {
                  color: 'from-green-100 to-emerald-100 text-green-800 border-green-200',
                  text: 'Available',
                  icon: '✅'
                },
                occupied: {
                  color: 'from-red-100 to-rose-100 text-red-800 border-red-200',
                  text: 'Occupied',
                  icon: '🚫'
                },
                scheduled: {
                  color: 'from-blue-100 to-cyan-100 text-blue-800 border-blue-200',
                  text: 'Scheduled',
                  icon: '⏰'
                }
              }[status];

              return (
                <div 
                  key={room.id} 
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-black text-lg">
                        Room {room.room_number}
                      </h3>
                      <p className="text-sm text-black font-semibold">{room.building}</p>
                    </div>
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border bg-gradient-to-r ${statusConfig.color}`}>
                      {statusConfig.icon} {statusConfig.text}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-black mb-3">
                    <div className="font-semibold">
                      <span className="text-gray-500">Capacity:</span> {room.capacity} seats
                    </div>
                    <div className="font-semibold">
                      <span className="text-gray-500">Type:</span> 
                      <span className="capitalize"> {room.type}</span>
                    </div>
                    {room.equipment && (
                      <div className="font-semibold">
                        <span className="text-gray-500">Equipment:</span> {room.equipment}
                      </div>
                    )}
                  </div>

                  {reservation && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                      <p className="text-sm font-semibold text-black">
                        {status === 'occupied' ? 'Currently occupied by:' : 'Scheduled for:'}
                      </p>
                      <p className="text-sm text-gray-700 font-medium">
                        {reservation.user?.name} • {reservation.course} Y{reservation.year} Block {reservation.block}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        Purpose: {reservation.purpose}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        Status: <span className={`font-semibold ${calculateReservationStatus(reservation) === 'pending' ? 'text-amber-600' : 'text-green-600'}`}>
                          {calculateReservationStatus(reservation).toUpperCase()}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reservations Table - Show ALL reservations */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-black">All Reservations ({filteredReservations.length})</h3>
              <span className="text-sm font-semibold text-gray-600 bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1.5 rounded-full">
                Showing reservations from all users
                {selectedRoom && ` | Room: ${selectedRoom}`}
                {selectedDate && ` | Date: ${formatDisplayDate(selectedDate)}`}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <th className="py-3 px-4 text-left text-sm font-semibold text-black">Room</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-black">Date</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-black">Time</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-black">Instructor</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-black">Course & Block</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-black">Purpose</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-black">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500 font-semibold">
                      {loading ? 'Loading reservations...' : 'No reservations found for the selected filters'}
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map(reservation => {
                    const status = calculateReservationStatus(reservation);
                    const statusColor = {
                      approved: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200',
                      pending: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200',
                      rejected: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200',
                      cancelled: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200',
                      active: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200',
                      completed: 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-200'
                    }[status] || 'bg-gradient-to-r from-gray-100 to-blue-100 text-gray-800 border-gray-200';

                    return (
                      <tr key={reservation.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-black">
                          Room {reservation.room?.room_number || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {formatDisplayDate(reservation.date)}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {reservation.user?.name || 'N/A'}
                          {reservation.user?.email && (
                            <div className="text-xs text-gray-500">
                              {reservation.user.email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {reservation.course && reservation.year && reservation.block 
                            ? `${reservation.course} Y${reservation.year} Block ${reservation.block}`
                            : 'N/A'
                          }
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {reservation.purpose}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusColor}`}>
                            {status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Legend - INCLUDES PENDING STATUS */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-black mb-2">Status Legend:</h4>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Available - Room is free</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-red-100 to-rose-100 border border-red-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Occupied - Currently in use</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Scheduled - Reservation today</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Approved - Reservation confirmed</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Pending - Awaiting approval</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-red-100 to-rose-100 border border-red-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Rejected - Reservation denied</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Active - Currently in use</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-100 to-violet-100 border border-purple-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Completed - Past reservation</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gradient-to-r from-gray-100 to-slate-100 border border-gray-200 rounded"></div>
              <span className="text-xs text-gray-600 font-medium">Cancelled - Reservation cancelled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Calendar View Component with Room Schedule Grid (7AM to 8PM)
const CalendarView = ({ 
  isOpen, 
  onClose,
  reservations
}: { 
  isOpen: boolean; 
  onClose: () => void;
  reservations: CalendarReservation[];
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDateReservations, setSelectedDateReservations] = useState<CalendarReservation[]>([]);
  const [roomSchedule, setRoomSchedule] = useState<RoomSchedule>({});
  const [allRooms, setAllRooms] = useState<string[]>([]);

  // Time slots from 7AM to 8PM
  const timeSlots: TimeSlot[] = [
    { time: '7AM', hour: 7, display: '07:00 AM', timeLabel: '07:00 AM' },
    { time: '8AM', hour: 8, display: '08:00 AM', timeLabel: '08:00 AM' },
    { time: '9AM', hour: 9, display: '09:00 AM', timeLabel: '09:00 AM' },
    { time: '10AM', hour: 10, display: '10:00 AM', timeLabel: '10:00 AM' },
    { time: '11AM', hour: 11, display: '11:00 AM', timeLabel: '11:00 AM' },
    { time: '12PM', hour: 12, display: '12:00 PM', timeLabel: '12:00 PM' },
    { time: '1PM', hour: 13, display: '01:00 PM', timeLabel: '01:00 PM' },
    { time: '2PM', hour: 14, display: '02:00 PM', timeLabel: '02:00 PM' },
    { time: '3PM', hour: 15, display: '03:00 PM', timeLabel: '03:00 PM' },
    { time: '4PM', hour: 16, display: '04:00 PM', timeLabel: '04:00 PM' },
    { time: '5PM', hour: 17, display: '05:00 PM', timeLabel: '05:00 PM' },
    { time: '6PM', hour: 18, display: '06:00 PM', timeLabel: '06:00 PM' },
    { time: '7PM', hour: 19, display: '07:00 PM', timeLabel: '07:00 PM' },
    { time: '8PM', hour: 20, display: '08:00 PM', timeLabel: '08:00 PM' },
  ];

  // Generate ALL room numbers from reservations
  const generateAllRooms = () => {
    const roomsSet = new Set<string>();
    
    // Add rooms from reservations
    reservations.forEach(res => {
      const roomName = `${res.room_number} - ${res.building}`;
      roomsSet.add(roomName);
    });
    
    // Sort rooms by building and room number
    const roomsArray = Array.from(roomsSet).sort((a, b) => {
      // Extract building and room number
      const [roomA, buildingA] = a.split(' - ');
      const [roomB, buildingB] = b.split(' - ');
      
      // Sort by building first
      if (buildingA !== buildingB) {
        return buildingA.localeCompare(buildingB);
      }
      
      // Then by room number
      return roomA.localeCompare(roomB, undefined, { numeric: true });
    });
    
    return roomsArray;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    
    // Filter ALL reservations for the selected date (not just approved)
    const filteredReservations = reservations.filter(res => {
      const reservationDate = new Date(res.date);
      const selectedDateObj = new Date(date);
      
      // Compare dates ignoring time
      return reservationDate.toDateString() === selectedDateObj.toDateString();
    });
    
    setSelectedDateReservations(filteredReservations);
    
    // Get all rooms for this date
    const roomsForDate = generateAllRooms();
    setAllRooms(roomsForDate);
    
    // Create room schedule structure
    const schedule: RoomSchedule = {};
    
    // Initialize schedule structure for all rooms
    roomsForDate.forEach(room => {
      schedule[room] = {};
      timeSlots.forEach(slot => {
        schedule[room][slot.hour] = [];
      });
    });
    
    // Fill schedule with ALL reservations (not just approved)
    filteredReservations.forEach(res => {
      const room = `${res.room_number} - ${res.building}`;
      const startHour = parseInt(res.start_time.split(':')[0]);
      const endHour = parseInt(res.end_time.split(':')[0]);
      
      // Add reservation to all hours it spans
      for (let hour = startHour; hour < endHour; hour++) {
        if (schedule[room] && schedule[room][hour]) {
          schedule[room][hour].push(res);
        }
      }
    });
    
    setRoomSchedule(schedule);
  };

  // Get reservation for a specific room and hour
  const getReservationForRoom = (room: string, hour: number): CalendarReservation | null => {
    const reservations = roomSchedule[room]?.[hour];
    return reservations && reservations.length > 0 ? reservations[0] : null;
  };

  // Check if this is the first hour of a reservation (to avoid duplicate displays)
  const isFirstHourOfReservation = (room: string, hour: number, reservation: CalendarReservation): boolean => {
    const startHour = parseInt(reservation.start_time.split(':')[0]);
    return hour === startHour;
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i));
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-black">Calendar View</h2>
            <p className="text-gray-600 mt-1 font-medium">View all room reservations at a glance</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevMonth}
                  className="flex items-center font-semibold border-gray-300 hover:border-gray-400 text-black"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <h3 className="text-xl font-bold text-black">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextMonth}
                  className="flex items-center font-semibold border-gray-300 hover:border-gray-400 text-black"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {days.map(day => (
                  <div key={day} className="text-center font-semibold text-gray-600 py-2 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-20" />;
                  }
                  
                  const dateStr = formatDate(date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dateToCheck = new Date(date);
                  dateToCheck.setHours(0, 0, 0, 0);
                  const dayReservations = reservations.filter(res => {
                    const reservationDate = new Date(res.date);
                    reservationDate.setHours(0, 0, 0, 0);
                    return reservationDate.getTime() === dateToCheck.getTime();
                  });
                  
                  const isToday = today.getTime() === dateToCheck.getTime();
                  const isSelected = selectedDate === dateStr;
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateClick(dateStr)}
                      className={`
                        h-20 p-2 border rounded-xl transition-all duration-200 flex flex-col
                        ${isToday ? 'bg-gradient-to-br from-maroon-50 to-maroon-100 border-maroon-200' : 'border-gray-200 hover:border-gray-300'}
                        ${isSelected ? 'ring-2 ring-maroon-600 ring-offset-2 bg-gradient-to-br from-maroon-50 to-white' : ''}
                        hover:bg-gray-50
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`
                          font-semibold text-lg
                          ${isToday ? 'text-maroon-800' : 'text-black'}
                          ${date.getDay() === 0 ? 'text-red-500' : ''}
                          ${date.getDay() === 6 ? 'text-blue-500' : ''}
                        `}>
                          {date.getDate()}
                        </span>
                        {dayReservations.length > 0 && (
                          <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 px-2 py-1 rounded-full font-semibold">
                            {dayReservations.length}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-1 overflow-hidden flex-1">
                        {dayReservations.slice(0, 2).map(res => {
                          const statusColor = res.status === 'approved' 
                            ? 'from-green-100 to-emerald-100 text-green-800' 
                            : res.status === 'pending'
                            ? 'from-amber-100 to-orange-100 text-amber-800'
                            : res.status === 'rejected'
                            ? 'from-red-100 to-rose-100 text-red-800'
                            : 'from-gray-100 to-blue-100 text-gray-800';
                          
                          return (
                            <div 
                              key={res.id} 
                              className={`text-xs bg-gradient-to-r ${statusColor} px-1 py-0.5 rounded truncate font-medium`}
                              title={`${res.room_number}: ${res.start_time}-${res.end_time} (${res.status})`}
                            >
                              {res.room_number}
                            </div>
                          );
                        })}
                        {dayReservations.length > 2 && (
                          <div className="text-xs text-gray-500 font-medium">
                            +{dayReservations.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Date Details */}
          <div>
            <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 rounded-2xl border border-maroon-200 p-6 h-full shadow-lg">
              <h3 className="text-xl font-bold text-black mb-6">
                {selectedDate ? (
                  <>
                    Reservations for{' '}
                    <span className="text-maroon-800">
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </>
                ) : 'Select a date'}
              </h3>
              
              {!selectedDate ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-black font-semibold">Click on a date to view reservations</p>
                </div>
              ) : selectedDateReservations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 text-green-500">✅</div>
                  <p className="text-lg font-semibold text-black mb-2">No reservations</p>
                  <p className="text-sm text-gray-600 font-medium">No bookings for this date</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {selectedDateReservations.map(reservation => {
                    const statusColor = reservation.status === 'approved' 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' 
                      : reservation.status === 'pending'
                      ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200'
                      : reservation.status === 'rejected'
                      ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200'
                      : 'bg-gradient-to-r from-gray-100 to-blue-100 text-gray-800 border-gray-200';
                    
                    return (
                      <div 
                        key={reservation.id} 
                        className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-black">
                              {reservation.room_number} - {reservation.building}
                            </h4>
                            <p className="text-sm text-gray-600 font-medium">
                              {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded capitalize ${statusColor}`}>
                            {reservation.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-black">
                            {reservation.user_name}
                          </p>
                          {reservation.department && (
                            <p className="text-xs text-gray-600 font-medium">
                              {reservation.department}
                              {reservation.year && reservation.block && 
                                ` • Year ${reservation.year} Block ${reservation.block}`
                              }
                            </p>
                          )}
                          <p className="text-sm text-gray-700 font-medium">
                            Purpose: {reservation.purpose}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Room Schedule Grid - Show ALL rooms (7AM to 8PM) */}
        {selectedDate && selectedDateReservations.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-black">
                  Room Schedule for {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 font-semibold bg-gradient-to-r from-blue-50 to-maroon-50 px-3 py-1.5 rounded-full">
                    {selectedDateReservations.length} reservations
                  </span>
                  <span className="text-sm text-gray-600 font-semibold bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1.5 rounded-full">
                    7:00 AM - 8:00 PM
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-32 min-w-[8rem] p-3 bg-gradient-to-r from-blue-50 to-blue-100 text-center font-bold text-blue-900 text-sm border-b-2 border-blue-200 sticky left-0 z-10">
                        Time Slot
                      </th>
                      {allRooms.map(room => (
                        <th 
                          key={room}
                          className="flex-1 min-w-[16rem] p-3 bg-gradient-to-r from-blue-50 to-blue-100 text-center font-bold text-blue-900 text-sm border-b-2 border-blue-200"
                        >
                          {room}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  <tbody>
                    {timeSlots.map((slot) => {
                      // Get all reservations for this time slot
                      const slotReservations: {[key: string]: CalendarReservation | null} = {};
                      
                      allRooms.forEach(room => {
                        slotReservations[room] = getReservationForRoom(room, slot.hour);
                      });
                      
                      // Check if this slot has any reservations
                      const hasReservations = Object.values(slotReservations).some(res => res !== null);
                      
                      return (
                        <tr key={slot.time} className="border-b border-gray-200">
                          <td className="w-32 min-w-[8rem] p-3 bg-gradient-to-r from-gray-50 to-gray-100 text-center font-semibold text-black align-top sticky left-0 z-10">
                            {slot.timeLabel}
                          </td>
                          
                          {allRooms.map(room => {
                            const reservation = slotReservations[room];
                            
                            // Only show reservation if it starts at this hour
                            if (!reservation || !isFirstHourOfReservation(room, slot.hour, reservation)) {
                              return (
                                <td key={`${room}-${slot.hour}`} className="flex-1 min-w-[16rem] p-3 align-top">
                                  <div className="h-24"></div>
                                </td>
                              );
                            }
                            
                            const statusColor = reservation.status === 'approved' 
                              ? 'from-green-50 to-emerald-50 border-green-200' 
                              : reservation.status === 'pending'
                              ? 'from-amber-50 to-orange-50 border-amber-200'
                              : reservation.status === 'rejected'
                              ? 'from-red-50 to-rose-50 border-red-200'
                              : 'from-gray-50 to-blue-50 border-gray-200';
                            
                            const textColor = reservation.status === 'approved' 
                              ? 'text-green-900' 
                              : reservation.status === 'pending'
                              ? 'text-amber-900'
                              : reservation.status === 'rejected'
                              ? 'text-red-900'
                              : 'text-gray-900';
                            
                            // Calculate end hour for display
                            const startHour = parseInt(reservation.start_time.split(':')[0]);
                            const endHour = parseInt(reservation.end_time.split(':')[0]);
                            const durationHours = endHour - startHour;
                            
                            return (
                              <td 
                                key={`${room}-${slot.hour}`} 
                                className="flex-1 min-w-[16rem] p-3 align-top"
                                rowSpan={durationHours}
                              >
                                <div className={`bg-gradient-to-r ${statusColor} border ${textColor} rounded-lg p-3 shadow-sm min-h-[5rem]`}>
                                  <div className="space-y-1.5">
                                    <div className={`font-bold text-xs ${textColor} leading-tight`}>
                                      {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                    </div>
                                    {reservation.year && reservation.block && (
                                      <div className={`text-xs font-bold ${textColor} leading-tight`}>
                                        Block {reservation.block}
                                      </div>
                                    )}
                                    <div className={`text-xs font-semibold ${textColor} leading-tight truncate`}>
                                      {reservation.user_name}
                                    </div>
                                    {reservation.purpose && (
                                      <div className={`text-xs ${textColor} font-medium leading-tight line-clamp-2`} 
                                           title={reservation.purpose}>
                                        {reservation.purpose}
                                      </div>
                                    )}
                                    <div className={`text-xs ${textColor} font-bold mt-1`}>
                                      Status: {reservation.status.toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-black">Status Legend:</h4>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded"></div>
                        <span className="text-xs text-gray-600 font-medium">Approved</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded"></div>
                        <span className="text-xs text-gray-600 font-medium">Pending</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded"></div>
                        <span className="text-xs text-gray-600 font-medium">Rejected</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                        <span className="text-xs text-gray-600 font-medium">Available</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">
                      Showing schedule from 7:00 AM to 8:00 PM
                    </p>
                    <p className="text-xs text-gray-600 font-medium mt-1">
                      {selectedDateReservations.length} total reservations shown
                    </p>
                    <p className="text-xs text-gray-600 font-medium mt-1">
                      Note: Multi-hour reservations span across time slots
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Delete All Confirmation Modal
const DeleteAllConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  count
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  count: number;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex items-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mr-4 shadow-md">
            <span className="text-red-600 text-2xl">🗑️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Delete All History</h2>
            <p className="text-gray-600 mt-1 font-medium">This action cannot be undone.</p>
          </div>
        </div>
        
        <p className="mb-6 text-black text-lg font-medium bg-red-50 p-4 rounded-xl border border-red-100">
          Are you sure you want to delete all <strong>{count}</strong> history reservations? This will permanently remove all your reservation history.
        </p>

        <div className="flex space-x-4 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="px-6 py-3 font-semibold border-gray-300 hover:border-gray-400 text-black"
          >
            Cancel
          </Button>
          <Button 
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg"
          >
            Delete All
          </Button>
        </div>
      </div>
    </div>
  );
};

// Cancel Reservation Confirmation Modal
const CancelReservationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  reservationDetails
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  reservationDetails?: { roomNumber: string; date: string; time: string; courseInfo: string };
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex items-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center mr-4 shadow-md">
            <span className="text-amber-600 text-2xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Cancel Reservation</h2>
            <p className="text-gray-600 mt-1 font-medium">This action cannot be undone.</p>
          </div>
        </div>
        
        {reservationDetails && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <p className="font-bold text-lg text-black">{reservationDetails.roomNumber}</p>
            <p className="text-sm text-gray-600 font-medium">{reservationDetails.date} at {reservationDetails.time}</p>
            {reservationDetails.courseInfo && (
              <p className="text-sm text-blue-600 font-medium mt-1">
                📚 {reservationDetails.courseInfo}
              </p>
            )}
          </div>
        )}

        <p className="mb-6 text-black text-lg font-medium">
          Are you sure you want to cancel this reservation?
        </p>

        <div className="flex space-x-4 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="px-6 py-3 font-semibold border-gray-300 hover:border-gray-400 text-black"
          >
            Keep Reservation
          </Button>
          <Button 
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg"
          >
            Cancel Reservation
          </Button>
        </div>
      </div>
    </div>
  );
};

// Edit Reservation Modal
const EditReservationModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  rooms,
  reservation,
  error,
  saving,
  onCheckConflict
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: ReservationFormData, reservationId: number) => void; 
  rooms: Room[];
  reservation?: Reservation;
  error: string;
  saving: boolean;
  onCheckConflict: (data: ReservationFormData) => Promise<TimeConflict[]>;
}) => {
  const [formData, setFormData] = useState<ReservationFormData>({
    room_id: reservation?.room_id || 0,
    date: reservation?.date || '',
    start_time: reservation?.start_time || '',
    end_time: reservation?.end_time || '',
    purpose: reservation?.purpose || '',
    course: reservation?.course || '',
    year: reservation?.year || '',
    block: reservation?.block || ''
  });
  const [conflicts, setConflicts] = useState<TimeConflict[]>([]);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);

  useEffect(() => {
    if (reservation && isOpen) {
      setFormData({
        room_id: reservation.room_id,
        date: reservation.date,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        purpose: reservation.purpose,
        course: reservation.course || '',
        year: reservation.year || '',
        block: reservation.block || ''
      });
      setConflicts([]);
      
      // Set available blocks based on course and year
      if (reservation.course && reservation.year) {
        const selectedCourse = COURSE_OPTIONS.find(c => c.value === reservation.course);
        if (selectedCourse) {
          const blocks = selectedCourse.blocks[`year${reservation.year}` as keyof typeof selectedCourse.blocks] || [];
          setAvailableBlocks(blocks);
        }
      }
    }
  }, [reservation, isOpen]);

  // Handle course change
  const handleCourseChange = (course: string) => {
    setFormData(prev => ({
      ...prev,
      course,
      year: '',
      block: ''
    }));
    setAvailableBlocks([]);
  };

  // Handle year change
  const handleYearChange = (year: string) => {
    const selectedCourse = COURSE_OPTIONS.find(c => c.value === formData.course);
    if (selectedCourse) {
      const blocks = selectedCourse.blocks[`year${year}` as keyof typeof selectedCourse.blocks] || [];
      setAvailableBlocks(blocks);
    }
    setFormData(prev => ({
      ...prev,
      year,
      block: ''
    }));
  };

  // Handle block change
  const handleBlockChange = (block: string) => {
    setFormData(prev => ({
      ...prev,
      block
    }));
  };

  useEffect(() => {
    const checkConflicts = async () => {
      if (formData.room_id && formData.date && formData.start_time && formData.end_time) {
        setCheckingConflict(true);
        try {
          const detectedConflicts = await onCheckConflict(formData);
          // Filter out conflicts with the current reservation (if editing)
          const filteredConflicts = detectedConflicts.filter(conflict => 
            !(reservation && conflict.type === 'reservation' && conflict.reservationId === reservation.id)
          );
          setConflicts(filteredConflicts);
        } catch (error) {
          console.error('Error checking conflicts:', error);
          setConflicts([]);
        } finally {
          setCheckingConflict(false);
        }
      } else {
        setConflicts([]);
      }
    };

    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [formData, onCheckConflict, reservation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.room_id || !formData.date || !formData.start_time || !formData.end_time || !formData.purpose) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (!formData.course || !formData.year || !formData.block) {
      alert('Please select course, year, and block');
      return;
    }
    
    if (formData.start_time >= formData.end_time) {
      alert('End time must be after start time');
      return;
    }

    if (conflicts.length > 0) {
      alert('Please resolve the time conflicts before submitting.');
      return;
    }
    
    if (reservation) {
      onSave(formData, reservation.id);
    }
  };

  if (!isOpen || !reservation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-black">
          Edit Reservation - {reservation.room.room_number}
        </h2>
        
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-semibold">
            {error}
          </div>
        )}

        <TimeConflictAlert conflicts={conflicts} />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Room *</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.room_id}
              onChange={(e) => setFormData({ ...formData, room_id: parseInt(e.target.value) })}
              required
            >
              <option value={0}>Select a room</option>
              {rooms.filter(room => room.is_available).map(room => (
                <option key={room.id} value={room.id}>
                  {room.room_number} - {room.building} ({room.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          {/* Course Selection */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Course *</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.course}
              onChange={(e) => handleCourseChange(e.target.value)}
              required
            >
              <option value="">Select course</option>
              {COURSE_OPTIONS.map(course => (
                <option key={course.value} value={course.value}>
                  {course.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year and Block Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Year *</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.year}
                onChange={(e) => handleYearChange(e.target.value)}
                required
                disabled={!formData.course}
              >
                <option value="">Select year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Block *</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.block}
                onChange={(e) => handleBlockChange(e.target.value)}
                required
                disabled={!formData.year || availableBlocks.length === 0}
              >
                <option value="">Select block</option>
                {availableBlocks.map(block => (
                  <option key={block} value={block}>
                    Block {block}
                  </option>
                ))}
              </select>
              {formData.course && formData.year && availableBlocks.length > 0 && (
                <p className="text-xs text-gray-600 mt-2 font-semibold bg-gradient-to-r from-gray-50 to-maroon-50 p-2 rounded-lg">
                  {formData.course === 'BS in Information Technology'
                    ? `BSIT Year ${formData.year} has ${availableBlocks.length} blocks`
                    : `${formData.course} Year ${formData.year} has ${availableBlocks.length} blocks`
                  }
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-3">Date *</label>
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Start Time *</label>
              <input
                type="time"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">End Time *</label>
              <input
                type="time"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {checkingConflict && (
            <div className="text-sm text-blue-600 flex items-center font-semibold">
              <span className="animate-spin mr-2">⏳</span>
              Checking for time conflicts...
            </div>
          )}

          {!checkingConflict && conflicts.length === 0 && formData.room_id && formData.date && formData.start_time && formData.end_time && (
            <div className="text-sm text-green-600 flex items-center font-semibold">
              <span className="mr-2">✅</span>
              No time conflicts detected
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-black mb-3">Purpose *</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              required
            >
              <option value="">Select purpose</option>
              <option value="Lecture">Lecture</option>
              <option value="Activity">Activity</option>
              <option value="Recitation">Recitation</option>
              <option value="Project Defense">Project Defense</option>
              <option value="Meeting">Meeting</option>
              <option value="Examination">Examination</option>
              <option value="Quiz">Quiz</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Display course info */}
          {formData.course && formData.year && formData.block && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <p className="text-sm font-semibold text-blue-800">
                📚 Reservation Details:
              </p>
              <p className="text-sm text-blue-700 font-medium">
                {formData.course} • Year {formData.year} • Block {formData.block}
              </p>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                This reservation will be visible only to students in {formData.course} Year {formData.year} Block {formData.block}
              </p>
            </div>
          )}

          <div className="flex space-x-3 justify-end pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 font-semibold border-gray-300 hover:border-gray-400 text-black"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={saving || conflicts.length > 0 || !formData.course || !formData.year || !formData.block}
              className="px-6 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
            >
              {saving ? 'Updating...' : 'Update Reservation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Profile Modal Component 
const ProfileModal = ({ 
  isOpen, 
  onClose, 
  user,
  onChangePassword
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: UserProfile | null;
  onChangePassword: (data: ChangePasswordData) => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      await onChangePassword(passwordData);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-black">My Profile</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex space-x-3 mb-8 bg-gradient-to-r from-gray-100 to-maroon-50 p-1 rounded-xl">
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 font-semibold ${activeTab === 'profile' ? 'bg-gradient-to-r from-maroon-800 to-maroon-900 text-white shadow-md' : 'text-black hover:text-maroon-800'}`}
          >
            👤 Profile Info
          </Button>
          <Button
            variant={activeTab === 'password' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('password')}
            className={`flex-1 font-semibold ${activeTab === 'password' ? 'bg-gradient-to-r from-maroon-800 to-maroon-900 text-white shadow-md' : 'text-black hover:text-maroon-800'}`}
          >
            🔒 Change Password
          </Button>
        </div>

        {activeTab === 'profile' ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-5">
              <div className="w-20 h-20 bg-gradient-to-br from-maroon-600 to-maroon-800 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-black">{user.name}</h3>
                <p className="text-gray-600 font-medium">{user.email}</p>
                <p className="text-sm bg-gradient-to-r from-maroon-100 to-maroon-200 text-maroon-800 font-semibold px-3 py-1 rounded-full inline-block mt-1">
                  CICT Instructor
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Role</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black capitalize font-semibold">
                  {user.role}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Department</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {user.department}
                </div>
              </div>
            </div>

            {user.created_at && (
              <div className="pt-6 border-t border-gray-200">
                <label className="block text-sm font-semibold text-black mb-2">Member Since</label>
                <p className="text-gray-600 font-semibold bg-gradient-to-r from-gray-50 to-maroon-50 p-3 rounded-xl border border-gray-200">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-5">
            {passwordError && (
              <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-semibold">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-black mb-3">Current Password *</label>
              <input
                type="password"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-black mb-3">New Password *</label>
              <input
                type="password"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-black mb-3">Confirm New Password *</label>
              <input
                type="password"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="flex space-x-3 justify-end pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="px-6 py-3 font-semibold border-gray-300 hover:border-gray-400 text-black"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={changingPassword}
                className="px-6 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const ReservationModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  rooms,
  selectedRoom,
  error,
  saving,
  onCheckConflict,
  user
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: ReservationFormData) => void; 
  rooms: Room[];
  selectedRoom?: Room;
  error: string;
  saving: boolean;
  onCheckConflict: (data: ReservationFormData) => Promise<TimeConflict[]>;
  user: User | null;
}) => {
  const [formData, setFormData] = useState<ReservationFormData>({
    room_id: selectedRoom?.id || 0,
    date: '',
    start_time: '',
    end_time: '',
    purpose: '',
    course: '',
    year: '',
    block: ''
  });
  
  const [conflicts, setConflicts] = useState<TimeConflict[]>([]);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);

  useEffect(() => {
    if (selectedRoom) {
      setFormData(prev => ({
        ...prev,
        room_id: selectedRoom.id
      }));
    }
  }, [selectedRoom, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        room_id: selectedRoom?.id || 0,
        date: '',
        start_time: '',
        end_time: '',
        purpose: '',
        course: '',
        year: '',
        block: ''
      });
      setConflicts([]);
      setAvailableBlocks([]);
    }
  }, [isOpen, selectedRoom]);

  // Handle course change
  const handleCourseChange = (course: string) => {
    setFormData(prev => ({
      ...prev,
      course,
      year: '',
      block: ''
    }));
    setAvailableBlocks([]);
  };

  // Handle year change
  const handleYearChange = (year: string) => {
    const selectedCourse = COURSE_OPTIONS.find(c => c.value === formData.course);
    if (selectedCourse) {
      const blocks = selectedCourse.blocks[`year${year}` as keyof typeof selectedCourse.blocks] || [];
      setAvailableBlocks(blocks);
    }
    setFormData(prev => ({
      ...prev,
      year,
      block: ''
    }));
  };

  // Handle block change
  const handleBlockChange = (block: string) => {
    setFormData(prev => ({
      ...prev,
      block
    }));
  };

  useEffect(() => {
    const checkConflicts = async () => {
      if (formData.room_id && formData.date && formData.start_time && formData.end_time) {
        setCheckingConflict(true);
        try {
          const detectedConflicts = await onCheckConflict(formData);
          setConflicts(detectedConflicts);
        } catch (error) {
          console.error('Error checking conflicts:', error);
          setConflicts([]);
        } finally {
          setCheckingConflict(false);
        }
      } else {
        setConflicts([]);
      }
    };

    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [formData, onCheckConflict]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.room_id || !formData.date || !formData.start_time || !formData.end_time || !formData.purpose) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (!formData.course || !formData.year || !formData.block) {
      alert('Please select course, year, and block');
      return;
    }
    
    if (formData.start_time >= formData.end_time) {
      alert('End time must be after start time');
      return;
    }

    if (conflicts.length > 0) {
      alert('Please resolve the time conflicts before submitting.');
      return;
    }
    
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-black">
          {selectedRoom ? `Reserve ${selectedRoom.room_number}` : 'Make Reservation'}
        </h2>
        
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-semibold">
            {error}
          </div>
        )}

        <TimeConflictAlert conflicts={conflicts} />

        <form onSubmit={handleSubmit} className="space-y-5">
          {!selectedRoom && (
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Room *</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: parseInt(e.target.value) })}
                required
              >
                <option value={0}>Select a room</option>
                {rooms.filter(room => room.is_available).map(room => (
                  <option key={room.id} value={room.id}>
                    {room.room_number} - {room.building} ({room.capacity} seats)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Course Selection */}
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Course *</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.course}
              onChange={(e) => handleCourseChange(e.target.value)}
              required
            >
              <option value="">Select course</option>
              {COURSE_OPTIONS.map(course => (
                <option key={course.value} value={course.value}>
                  {course.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year and Block Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Year Level *</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.year}
                onChange={(e) => handleYearChange(e.target.value)}
                required
                disabled={!formData.course}
              >
                <option value="">Select year</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Block *</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.block}
                onChange={(e) => handleBlockChange(e.target.value)}
                required
                disabled={!formData.year || availableBlocks.length === 0}
              >
                <option value="">Select block</option>
                {availableBlocks.map(block => (
                  <option key={block} value={block}>
                    Block {block}
                  </option>
                ))}
              </select>
              {formData.course && formData.year && availableBlocks.length > 0 && (
                <p className="text-xs text-gray-600 mt-2 font-semibold bg-gradient-to-r from-gray-50 to-maroon-50 p-2 rounded-lg">
                  {formData.course === 'BS in Information Technology'
                    ? `BSIT Year ${formData.year} has ${availableBlocks.length} blocks`
                    : `${formData.course} Year ${formData.year} has ${availableBlocks.length} blocks`
                  }
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-3">Date *</label>
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Start Time *</label>
              <input
                type="time"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">End Time *</label>
              <input
                type="time"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          {checkingConflict && (
            <div className="text-sm text-blue-600 flex items-center font-semibold">
              <span className="animate-spin mr-2">⏳</span>
              Checking for time conflicts...
            </div>
          )}

          {!checkingConflict && conflicts.length === 0 && formData.room_id && formData.date && formData.start_time && formData.end_time && (
            <div className="text-sm text-green-600 flex items-center font-semibold">
              <span className="mr-2">✅</span>
              No time conflicts detected
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-black mb-3">Purpose *</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              required
            >
              <option value="">Select purpose</option>
              <option value="Lecture">Lecture</option>
              <option value="Activity">Activity</option>
              <option value="Recitation">Recitation</option>
              <option value="Project Defense">Project Defense</option>
              <option value="Meeting">Meeting</option>
              <option value="Examination">Examination</option>
              <option value="Quiz">Quiz</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Display course info */}
          {formData.course && formData.year && formData.block && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <p className="text-sm font-semibold text-blue-800">
                📚 Reservation Details:
              </p>
              <p className="text-sm text-blue-700 font-medium">
                {formData.course} • Year {formData.year} • Block {formData.block}
              </p>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                This reservation will be visible only to students in {formData.course} Year {formData.year} Block {formData.block}
              </p>
            </div>
          )}

          <div className="flex space-x-3 justify-end pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 font-semibold border-gray-300 hover:border-gray-400 text-black"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={saving || conflicts.length > 0 || !formData.course || !formData.year || !formData.block}
              className="px-6 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
            >
              {saving ? 'Reserving...' : 'Make Reservation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RoomFilterModal = ({ 
  isOpen, 
  onClose, 
  onFilter,
  filterData
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onFilter: (data: FilterData) => void;
  filterData: FilterData;
}) => {
  const [formData, setFormData] = useState<FilterData>(filterData);

  useEffect(() => {
    setFormData(filterData);
  }, [filterData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter(formData);
  };

  const handleClear = () => {
    const clearedData: FilterData = {
      date: '',
      start_time: '',
      end_time: '',
      capacity: 0
    };
    setFormData(clearedData);
    onFilter(clearedData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-black">Filter Available Rooms</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Date</label>
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Start Time</label>
              <input
                type="time"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">End Time</label>
              <input
                type="time"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-3">Minimum Capacity</label>
            <input
              type="number"
              min="1"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.capacity || ''}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              placeholder="Any capacity"
            />
          </div>

          <div className="flex space-x-3 justify-end pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClear}
              className="px-4 py-3 font-semibold border-gray-300 hover:border-gray-400 text-black"
            >
              Clear Filters
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="px-4 py-3 font-semibold border-gray-300 hover:border-gray-400 text-black"
            >
              Cancel
            </Button>
            <Button type="submit" className="px-6 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg">
              Apply Filters
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function InstructorDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showEditReservationForm, setShowEditReservationForm] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showAllRoomsModal, setShowAllRoomsModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reservationToCancel, setReservationToCancel] = useState<Reservation | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reservationError, setReservationError] = useState('');
  const [editError, setEditError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [filterData, setFilterData] = useState<FilterData>({
    date: '',
    start_time: '',
    end_time: '',
    capacity: 0
  });
  const [calendarReservations, setCalendarReservations] = useState<CalendarReservation[]>([]);
  const [now, setNow] = useState(new Date());

  const { user, logout } = useAuth();
  const router = useRouter();

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Convert AuthContext user to UserProfile type
  const userProfile: UserProfile | null = user ? {
    id: user.id || 0,
    name: user.name || '',
    email: user.email || '',
    department: user.department || '',
    role: user.role || '',
    created_at: user.created_at,
    updated_at: user.updated_at
  } : null;

  useEffect(() => {
    fetchReservations();
    fetchAvailableRooms();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [availableRooms, filterData]);

  // Auto-refresh status every minute to update active/completed statuses
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReservations();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const fetchReservations = async () => {
    try {
      // Fetch instructor's reservations
      const response = await api.get<{ data: Reservation[] }>('/api/reservations');
      
      // Calculate dynamic statuses for each reservation
      const reservationsWithCalculatedStatus = (response.data || []).map(reservation => ({
        ...reservation,
        calculatedStatus: calculateReservationStatus(reservation)
      }));
      
      setReservations(reservationsWithCalculatedStatus);
      
      // Fetch ALL reservations for calendar (including other users)
      const allReservationsResponse = await api.get<{ data: Reservation[] }>('/api/reservations/all');
      
      // Store all reservations for AllRoomsModal
      setAllReservations(allReservationsResponse.data || []);
      
      // Transform ALL reservations for calendar
      const calendarRes = (allReservationsResponse.data || []).map((res: Reservation) => ({
        id: res.id,
        room_number: res.room?.room_number || '',
        building: res.room?.building || '',
        date: res.date,
        start_time: res.start_time,
        end_time: res.end_time,
        user_name: res.user?.name || '',
        user_role: res.user?.role || '',
        department: res.user?.department || '',
        year: res.year || '',
        block: res.block || '',
        purpose: res.purpose,
        status: calculateReservationStatus(res)
      }));
      
      setCalendarReservations(calendarRes);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      showToast('Failed to load reservations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      const response = await api.get<{ data: Room[] }>('/api/rooms');
      setAvailableRooms(response.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      showToast('Failed to load available rooms', 'error');
    }
  };

  const applyFilters = () => {
    let filtered = availableRooms.filter(room => room.is_available);
    
    if (filterData.capacity > 0) {
      filtered = filtered.filter(room => room.capacity >= filterData.capacity);
    }
    
    if (filterData.date && filterData.start_time && filterData.end_time) {
      console.log('Filtering by date/time:', filterData);
    }
    
    setFilteredRooms(filtered);
  };

  const handleFilter = (newFilterData: FilterData) => {
    setFilterData(newFilterData);
    setShowFilterModal(false);
    showToast('Filters applied successfully');
  };

  const handleMakeReservation = (room?: Room) => {
    setSelectedRoom(room || null);
    setReservationError('');
    setShowReservationForm(true);
  };

  const handleEditReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setEditError('');
    setShowEditReservationForm(true);
  };

  const checkTimeConflict = async (reservationData: ReservationFormData): Promise<TimeConflict[]> => {
    try {
      const response = await api.post<{ conflicts: TimeConflict[] }>('/api/reservations/check-conflict', reservationData);
      return response.conflicts || [];
    } catch (error) {
      console.error('Error checking time conflict:', error);
      return [];
    }
  };

  const handleSaveReservation = async (reservationData: ReservationFormData) => {
    setSaving(true);
    try {
      setReservationError('');
      
      const conflicts = await checkTimeConflict(reservationData);
      
      if (conflicts.length > 0) {
        setReservationError('Time conflict detected with existing reservations or classes. Please choose a different time.');
        showToast('Time conflict detected! Please choose a different time.', 'error');
        return;
      }
      
      await api.post('/api/reservations', reservationData);
      setShowReservationForm(false);
      setSelectedRoom(null);
      showToast('Reservation submitted successfully! Waiting for admin approval.', 'success');
      fetchReservations();
      fetchAvailableRooms();
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      const errorData = apiError.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Failed to create reservation. Please try again.';
      
      if (errorMessage.includes('Time conflict')) {
        setReservationError('This time slot is already booked. Please choose a different time.');
        showToast('Time conflict detected! Please choose a different time.', 'error');
      } else {
        setReservationError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReservation = async (reservationData: ReservationFormData, reservationId: number) => {
    setEditing(true);
    try {
      setEditError('');
      
      const conflicts = await checkTimeConflict(reservationData);
      
      // Filter out conflicts with the current reservation being edited
      const filteredConflicts = conflicts.filter(conflict => 
        !(selectedReservation && conflict.type === 'reservation' && conflict.reservationId === selectedReservation.id)
      );
      
      if (filteredConflicts.length > 0) {
        setEditError('Time conflict detected with existing reservations or classes. Please choose a different time.');
        showToast('Time conflict detected! Please choose a different time.', 'error');
        return;
      }
      
      await api.patch(`/api/reservations/${reservationId}`, reservationData);
      setShowEditReservationForm(false);
      setSelectedReservation(null);
      showToast('Reservation updated successfully! Waiting for admin approval.', 'success');
      fetchReservations();
      fetchAvailableRooms();
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      const errorData = apiError.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Failed to update reservation. Please try again.';
      
      if (errorMessage.includes('Time conflict')) {
        setEditError('This time slot is already booked. Please choose a different time.');
        showToast('Time conflict detected! Please choose a different time.', 'error');
      } else {
        setEditError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } finally {
      setEditing(false);
    }
  };

  const handleCancelReservation = async (reservationId: number) => {
    try {
      await api.patch(`/api/reservations/${reservationId}/status`, { 
        status: 'cancelled',
        admin_notes: 'Cancelled by instructor'
      });
      showToast('Reservation cancelled successfully', 'success');
      fetchReservations();
      fetchAvailableRooms();
      setShowCancelModal(false);
      setReservationToCancel(null);
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      showToast('Failed to cancel reservation', 'error');
    }
  };

  const handleDeleteAllHistory = async () => {
    try {
      // Only delete completed and cancelled reservations from history
      const historyReservationsToDelete = historyReservations.filter(res => 
        ['completed', 'cancelled', 'rejected'].includes(calculateReservationStatus(res))
      );
      
      // Delete each reservation individually
      for (const reservation of historyReservationsToDelete) {
        await api.delete(`/api/reservations/${reservation.id}`);
      }
      
      showToast('All history reservations deleted successfully', 'success');
      fetchReservations();
      setShowDeleteAllModal(false);
    } catch (error) {
      console.error('Error deleting all history:', error);
      showToast('Failed to delete history reservations', 'error');
    }
  };

  const handleChangePassword = async (passwordData: ChangePasswordData) => {
    try {
      await api.put('/api/auth/change-password', passwordData);
      showToast('Password changed successfully', 'success');
      setShowProfileModal(false);
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      const errorMessage = apiError.response?.data?.message || 'Failed to change password';
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login?logout=success');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Logout failed', 'error');
    }
  };

  // Enhanced status display functions with color coding
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200';
      case 'active':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-200';
      case 'pending':
        return 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-blue-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'cancelled':
        return '🛑';
      case 'active':
        return '🔵';
      case 'completed':
        return '🟣';
      case 'pending':
        return '⚡';
      default:
        return '📋';
    }
  };

  const getStatusDisplayText = (status: string) => {
    switch (status) {
      case 'active':
        return 'ACTIVE NOW';
      case 'completed':
        return 'COMPLETED';
      case 'cancelled':
        return 'CANCELLED';
      case 'approved':
        return 'APPROVED';
      case 'rejected':
        return 'REJECTED';
      case 'pending':
        return 'PENDING';
      default:
        return status.toUpperCase();
    }
  };

  const canCancelReservation = (reservation: Reservation) => {
    const status = calculateReservationStatus(reservation);
    return status === 'pending' || status === 'approved';
  };

  const canEditReservation = (reservation: Reservation) => {
    const status = calculateReservationStatus(reservation);
    return status === 'pending';
  };

  // Filter reservations for current and history tabs
  const currentReservations = reservations.filter(res => {
    const status = calculateReservationStatus(res);
    return ['pending', 'approved', 'active'].includes(status);
  });

  const historyReservations = reservations.filter(res => {
    const status = calculateReservationStatus(res);
    return ['completed', 'cancelled', 'rejected'].includes(status);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-gray-100/[0.02] bg-[size:60px_60px]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-maroon-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-maroon-100 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-black font-semibold">Loading instructor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-100/[0.02] bg-[size:60px_60px]" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-maroon-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-maroon-100 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      
      <div className="relative z-10">
        {/* Fixed Header - Stays on top when scrolling */}
        <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-maroon-800 to-maroon-900 backdrop-blur-lg border-b border-maroon-700 shadow-lg z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 bg-gradient-to-r from-maroon-700 to-maroon-800 rounded-xl shadow-lg" />
                  <div className="absolute inset-1 bg-white rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <span className="text-maroon-800 font-bold text-lg">CICT</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Instructor <span className="text-white">Portal</span>
                  </h1>
                  <p className="text-sm text-maroon-100 font-semibold">Room Scheduling Dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right hidden md:block">
                  <p className="font-bold text-white text-lg">{user?.name || 'Instructor'}</p>
                  <p className="text-sm text-maroon-100 capitalize font-semibold">instructor</p>
                  <p className="text-xs bg-gradient-to-r from-white/20 to-white/10 text-white font-semibold px-2 py-1 rounded-full">
                    CICT Instructor
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Calendar Button */}
                  <Button 
                    onClick={() => setShowCalendarModal(true)}
                    variant="outline"
                    size="sm"
                    className="border-maroon-200 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold shadow-sm"
                    title="View Calendar"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Calendar
                  </Button>

                  {/* Profile Button */}
                  <Button 
                    onClick={() => setShowProfileModal(true)}
                    variant="outline"
                    size="sm"
                    className="border-maroon-200 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold hidden sm:flex shadow-sm"
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                    {/* 🔔 NOTIFICATION BELL HERE  */}
          <NotificationBell userId={user?.id || 0} />
                  {/* Logout Button */}
                  <Button 
                    onClick={handleLogout}
                    variant="outline"
                    size="icon"
                    className="border-maroon-200 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold shadow-sm w-10 h-10"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - Add padding-top to account for fixed header */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pt-24">
          {/* Welcome Card */}
          <div className="mb-8 bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-8 relative">
              <div className="flex items-center justify-between">
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold text-black mb-3">
                    Welcome back, {user?.name || 'Instructor'}! 👋
                  </h2>
                  <p className="text-gray-600 text-lg font-semibold">
                    Manage your classroom reservations and view available rooms in CICT.
                  </p>
                </div>
                <div className="text-6xl opacity-20 absolute right-8 top-4 text-maroon-100">🏢</div>
                <div className="relative z-10 text-5xl text-maroon-600">📊</div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-maroon-800 mb-2">
                  {reservations.length}
                </div>
                <div className="text-sm text-black font-semibold">Total Reservations</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">All statuses</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-maroon-800 mb-2">
                  {reservations.filter(r => calculateReservationStatus(r) === 'approved').length}
                </div>
                <div className="text-sm text-black font-semibold">Approved</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Ready for use</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-green-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {reservations.filter(r => calculateReservationStatus(r) === 'pending').length}
                </div>
                <div className="text-sm text-black font-semibold">Pending</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Awaiting approval</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-orange-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {filteredRooms.length}
                </div>
                <div className="text-sm text-black font-semibold">Available Rooms</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Ready for booking</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Schedule & History Card */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="bg-gradient-to-r from-maroon-50 to-maroon-100 border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-black text-xl font-bold">
                    <span className="mr-3 text-2xl">📅</span>
                    My Schedule & History
                  </div>
                  <div className="flex space-x-2 bg-gradient-to-r from-maroon-100 to-maroon-200 p-1 rounded-xl">
                    <Button
                      variant={activeTab === 'current' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('current')}
                      className={`font-semibold ${activeTab === 'current' ? 'bg-gradient-to-r from-maroon-800 to-maroon-900 text-white shadow-md' : 'text-black hover:text-maroon-800'}`}
                    >
                      Current ({currentReservations.length})
                    </Button>
                    <Button
                      variant={activeTab === 'history' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('history')}
                      className={`font-semibold ${activeTab === 'history' ? 'bg-gradient-to-r from-maroon-800 to-maroon-900 text-white shadow-md' : 'text-black hover:text-maroon-800'}`}
                    >
                      History ({historyReservations.length})
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {activeTab === 'current' ? (
                  currentReservations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-6xl mb-4">📋</div>
                      <p className="text-lg font-semibold mb-2 text-black">No current reservations</p>
                      <p className="text-sm font-semibold mb-6">Start by making your first reservation</p>
                      <Button 
                        onClick={() => handleMakeReservation()}
                        className="bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
                      >
                        Make Your First Reservation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {currentReservations.map((reservation) => {
                        const calculatedStatus = calculateReservationStatus(reservation);
                        const courseInfo = reservation.course && reservation.year && reservation.block 
                          ? `${reservation.course} • Year ${reservation.year} • Block ${reservation.block}`
                          : '';
                        
                        return (
                          <div 
                            key={reservation.id} 
                            className="bg-gradient-to-r from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-bold text-black text-lg">
                                  {reservation.room.room_number}
                                </h3>
                                <p className="text-sm text-black font-semibold">
                                  {reservation.room.building} • {reservation.room.type}
                                </p>
                                {/* Display course info */}
                                {courseInfo && (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700">
                                      📚 {courseInfo}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(calculatedStatus)}`}>
                                {getStatusIcon(calculatedStatus)} {getStatusDisplayText(calculatedStatus)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm text-black mb-3">
                              <div className="font-semibold">
                                <span className="text-gray-500">Date:</span> {formatDisplayDate(reservation.date)}
                              </div>
                              <div className="font-semibold">
                                <span className="text-gray-500">Time:</span> {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                              </div>
                            </div>
                            
                            <p className="text-sm text-black font-semibold">
                              <span className="text-gray-500">Purpose:</span> {reservation.purpose}
                            </p>
                            
                            {reservation.admin_notes && (
                              <p className="text-sm text-gray-500 mt-2 font-semibold">
                                <span className="text-gray-600">Notes:</span> {reservation.admin_notes}
                              </p>
                            )}
                            
                            <div className="flex space-x-2 mt-4">
                              {canEditReservation(reservation) && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditReservation(reservation)}
                                  className="font-semibold border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400 shadow-sm"
                                >
                                  <Edit className="h-4 w-4 mr-2" /> Edit
                                </Button>
                              )}
                              {canCancelReservation(reservation) && (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => {
                                    setReservationToCancel(reservation);
                                    setShowCancelModal(true);
                                  }}
                                  className="font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md"
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {historyReservations.length > 0 && (
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-gray-600 font-semibold">
                          Showing {historyReservations.length} completed/rejected/cancelled reservations
                        </p>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => setShowDeleteAllModal(true)}
                          disabled={historyReservations.length === 0}
                          className="font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete All History
                        </Button>
                      </div>
                    )}
                    
                    {historyReservations.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-6xl mb-4">📜</div>
                        <p className="text-lg font-semibold mb-2 text-black">No reservation history</p>
                        <p className="text-sm font-semibold">Completed, rejected, and cancelled reservations will appear here</p>
                    </div>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {historyReservations.map((reservation) => {
                          const calculatedStatus = calculateReservationStatus(reservation);
                          const courseInfo = reservation.course && reservation.year && reservation.block 
                            ? `${reservation.course} • Year ${reservation.year} • Block ${reservation.block}`
                            : '';
                          
                          return (
                            <div 
                              key={reservation.id} 
                              className="bg-gradient-to-r from-gray-50 to-maroon-50 border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-bold text-black text-lg">
                                    {reservation.room.room_number}
                                  </h3>
                                  <p className="text-sm text-black font-semibold">
                                    {reservation.room.building} • {reservation.room.type}
                                  </p>
                                  {/* Display course info */}
                                  {courseInfo && (
                                    <div className="mt-2">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700">
                                        📚 {courseInfo}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(calculatedStatus)}`}>
                                  {getStatusIcon(calculatedStatus)} {getStatusDisplayText(calculatedStatus)}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm text-black mb-3">
                                <div className="font-semibold">
                                  <span className="text-gray-500">Date:</span> {formatDisplayDate(reservation.date)}
                                </div>
                                <div className="font-semibold">
                                  <span className="text-gray-500">Time:</span> {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </div>
                              </div>
                              
                              <p className="text-sm text-black font-semibold">
                                <span className="text-gray-500">Purpose:</span> {reservation.purpose}
                              </p>
                              
                              {reservation.admin_notes && (
                                <p className="text-sm text-gray-500 mt-2 font-semibold">
                                  <span className="text-gray-600">Notes:</span> {reservation.admin_notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Available Rooms Card */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-black text-xl font-bold">
                    <span className="mr-3 text-2xl">🏠</span>
                    Available Rooms
                    <span className="ml-3 text-sm font-semibold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-3 py-1.5 rounded-full border border-blue-200">
                      {filteredRooms.length} available
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {(filterData.date || filterData.capacity > 0) && (
                      <span className="text-xs text-green-600 bg-gradient-to-r from-green-100 to-emerald-100 px-3 py-1.5 rounded-full font-semibold border border-green-200">
                        Filtered
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6">
                {/* Filter and View All Rooms Buttons */}
                <div className="flex space-x-3 mb-6">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowFilterModal(true)}
                    className="border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400 font-semibold shadow-sm flex-1"
                  >
                    <Filter className="h-4 w-4 mr-2" /> Filter Rooms
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAllRoomsModal(true)}
                    className="border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400 font-semibold shadow-sm"
                    title="View All Rooms & Reservations"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {filteredRooms.map((room) => (
                    <div 
                      key={room.id} 
                      className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-black text-lg">
                            {room.room_number}
                          </h3>
                          <p className="text-sm text-black font-semibold">{room.building}</p>
                        </div>
                        <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
                          Available
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-black mb-3">
                        <div className="font-semibold">
                          <span className="text-gray-500">Capacity:</span> {room.capacity} seats
                        </div>
                        <div className="font-semibold">
                          <span className="text-gray-500">Type:</span> 
                          <span className="capitalize"> {room.type}</span>
                        </div>
                      </div>
                      
                      {room.equipment && (
                        <p className="text-sm text-black font-semibold">
                          <span className="text-gray-500">Equipment:</span> {room.equipment}
                        </p>
                      )}
                      
                      <Button 
                        size="sm" 
                        className="mt-4 w-full bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
                        onClick={() => handleMakeReservation(room)}
                      >
                        Reserve This Room
                      </Button>
                    </div>
                  ))}
                </div>
                
                {filteredRooms.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">😔</div>
                    <p className="text-lg font-semibold mb-2 text-black">No available rooms match your criteria</p>
                    <Button 
                      variant="outline" 
                      className="mt-4 font-semibold border-gray-300 hover:border-gray-400 text-black"
                      onClick={() => {
                        setFilterData({ date: '', start_time: '', end_time: '', capacity: 0 });
                        setShowFilterModal(false);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Floating Action Button */}
          <div className="fixed bottom-8 right-8 z-40">
            <Button 
              onClick={() => handleMakeReservation()}
              size="lg"
              className="rounded-full w-16 h-16 shadow-2xl hover:shadow-3xl transition-all duration-300 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-bold text-2xl"
            >
              +
            </Button>
          </div>
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Modals */}
      <CalendarView
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        reservations={calendarReservations}
      />

      {/* Updated AllRoomsModal with ALL reservations and working filters */}
      <AllRoomsModal
        isOpen={showAllRoomsModal}
        onClose={() => setShowAllRoomsModal(false)}
        rooms={availableRooms}
        allReservations={allReservations}
      />

      <ReservationModal
        isOpen={showReservationForm}
        onClose={() => {
          setShowReservationForm(false);
          setSelectedRoom(null);
        }}
        onSave={handleSaveReservation}
        rooms={availableRooms}
        selectedRoom={selectedRoom || undefined}
        error={reservationError}
        saving={saving}
        onCheckConflict={checkTimeConflict}
        user={user}
      />

      <EditReservationModal
        isOpen={showEditReservationForm}
        onClose={() => {
          setShowEditReservationForm(false);
          setSelectedReservation(null);
        }}
        onSave={handleUpdateReservation}
        rooms={availableRooms}
        reservation={selectedReservation || undefined}
        error={editError}
        saving={editing}
        onCheckConflict={checkTimeConflict}
      />

      <RoomFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onFilter={handleFilter}
        filterData={filterData}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={userProfile}
        onChangePassword={handleChangePassword}
      />

      <CancelReservationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setReservationToCancel(null);
        }}
        onConfirm={() => reservationToCancel && handleCancelReservation(reservationToCancel.id)}
        reservationDetails={reservationToCancel ? {
          roomNumber: reservationToCancel.room.room_number,
          date: formatDisplayDate(reservationToCancel.date),
          time: `${formatTime(reservationToCancel.start_time)} - ${formatTime(reservationToCancel.end_time)}`,
          courseInfo: reservationToCancel.course && reservationToCancel.year && reservationToCancel.block 
            ? `${reservationToCancel.course} • Year ${reservationToCancel.year} • Block ${reservationToCancel.block}`
            : ''
        } : undefined}
      />

      <DeleteAllConfirmationModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleDeleteAllHistory}
        count={historyReservations.length}
      />
    </div>
  );
}