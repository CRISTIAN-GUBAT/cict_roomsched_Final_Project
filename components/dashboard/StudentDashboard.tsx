'use client';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import { Room, ClassSchedule, ApiError } from '@/types';
import {
  Calendar as CalendarIcon,
  LogOut,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  Menu,
  X,
  CalendarRange} from 'lucide-react';

interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  student_id?: string;
  department?: string;
  year?: string;
  block?: string;
  created_at?: string;
  updated_at?: string;
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

interface InstructorInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string;
}

interface FullReservation {
  id: number;
  room_id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  course: string | null;
  year: string | null;
  block: string | null;
  room: Room;
  user: InstructorInfo;
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

  // Format time to 12-hour format with AM/PM
  const formatTimeForDisplay = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

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
    
    reservations.forEach(res => {
      const roomName = `${res.room_number} - ${res.building}`;
      roomsSet.add(roomName);
    });
    
    const roomsArray = Array.from(roomsSet).sort((a, b) => {
      const [roomA, buildingA] = a.split(' - ');
      const [roomB, buildingB] = b.split(' - ');
      
      if (buildingA !== buildingB) {
        return buildingA.localeCompare(buildingB);
      }
      
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
    
    const filteredReservations = reservations.filter(res => {
      const reservationDate = new Date(res.date);
      const selectedDateObj = new Date(date);
      return reservationDate.toDateString() === selectedDateObj.toDateString();
    });
    
    setSelectedDateReservations(filteredReservations);
    
    const roomsForDate = generateAllRooms();
    setAllRooms(roomsForDate);
    
    const schedule: RoomSchedule = {};
    
    roomsForDate.forEach(room => {
      schedule[room] = {};
      timeSlots.forEach(slot => {
        schedule[room][slot.hour] = [];
      });
    });
    
    filteredReservations.forEach(res => {
      const room = `${res.room_number} - ${res.building}`;
      const startHour = parseInt(res.start_time.split(':')[0]);
      const endHour = parseInt(res.end_time.split(':')[0]);
      
      for (let hour = startHour; hour < endHour; hour++) {
        if (schedule[room] && schedule[room][hour]) {
          schedule[room][hour].push(res);
        }
      }
    });
    
    setRoomSchedule(schedule);
  };

  const getReservationForRoom = (room: string, hour: number): CalendarReservation | null => {
    const reservations = roomSchedule[room]?.[hour];
    return reservations && reservations.length > 0 ? reservations[0] : null;
  };

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
                  Prev
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
                              {formatTimeForDisplay(reservation.start_time)} - {formatTimeForDisplay(reservation.end_time)}
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
                                ` • Y${reservation.year} B${reservation.block}`
                              }
                            </p>
                          )}
                          <p className="text-sm text-gray-700 font-medium truncate">
                            {reservation.purpose}
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
                    month: 'short',
                    day: 'numeric'
                  })}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 font-semibold bg-gradient-to-r from-blue-50 to-maroon-50 px-3 py-1.5 rounded-full">
                    {selectedDateReservations.length} reservations
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-28 min-w-[7rem] p-3 bg-gradient-to-r from-blue-50 to-blue-100 text-center font-bold text-blue-900 text-sm border-b-2 border-blue-200 sticky left-0 z-10">
                        Time
                      </th>
                      {allRooms.map(room => (
                        <th 
                          key={room}
                          className="flex-1 min-w-[14rem] p-3 bg-gradient-to-r from-blue-50 to-blue-100 text-center font-bold text-blue-900 text-sm border-b-2 border-blue-200"
                        >
                          {room}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  <tbody>
                    {timeSlots.map((slot) => {
                      const slotReservations: {[key: string]: CalendarReservation | null} = {};
                      
                      allRooms.forEach(room => {
                        slotReservations[room] = getReservationForRoom(room, slot.hour);
                      });
                      
                      return (
                        <tr key={slot.time} className="border-b border-gray-200">
                          <td className="w-28 min-w-[7rem] p-3 bg-gradient-to-r from-gray-50 to-gray-100 text-center font-semibold text-black align-top sticky left-0 z-10">
                            {slot.timeLabel}
                          </td>
                          
                          {allRooms.map(room => {
                            const reservation = slotReservations[room];
                            
                            if (!reservation || !isFirstHourOfReservation(room, slot.hour, reservation)) {
                              return (
                                <td key={`${room}-${slot.hour}`} className="flex-1 min-w-[14rem] p-3 align-top">
                                  <div className="h-20"></div>
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
                            
                            const startHour = parseInt(reservation.start_time.split(':')[0]);
                            const endHour = parseInt(reservation.end_time.split(':')[0]);
                            const durationHours = endHour - startHour;
                            
                            return (
                              <td 
                                key={`${room}-${slot.hour}`} 
                                className="flex-1 min-w-[14rem] p-3 align-top"
                                rowSpan={durationHours}
                              >
                                <div className={`bg-gradient-to-r ${statusColor} border ${textColor} rounded-lg p-2 shadow-sm min-h-[4rem]`}>
                                  <div className="space-y-1">
                                    <div className={`font-bold text-xs ${textColor} leading-tight`}>
                                      {formatTimeForDisplay(reservation.start_time)} - {formatTimeForDisplay(reservation.end_time)}
                                    </div>
                                    {reservation.year && reservation.block && (
                                      <div className={`text-xs font-bold ${textColor} leading-tight`}>
                                        B{reservation.block}
                                      </div>
                                    )}
                                    <div className={`text-xs font-semibold ${textColor} leading-tight truncate`}>
                                      {reservation.user_name}
                                    </div>
                                    <div className={`text-xs ${textColor} font-bold mt-0.5 capitalize`}>
                                      {reservation.status}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Profile Modal Component for Student - Updated to match maroon theme
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
            👤 Profile
          </Button>
          <Button
            variant={activeTab === 'password' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('password')}
            className={`flex-1 font-semibold ${activeTab === 'password' ? 'bg-gradient-to-r from-maroon-800 to-maroon-900 text-white shadow-md' : 'text-black hover:text-maroon-800'}`}
          >
            🔒 Password
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
                  CICT Student
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
                <label className="block text-sm font-semibold text-black mb-2">Student ID</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {user.student_id || 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Course</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {user.department || 'N/A'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Year & Block</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {user.year && user.block ? `Y${user.year} • B${user.block}` : 'N/A'}
                </div>
              </div>
            </div>
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
                {changingPassword ? 'Changing...' : 'Change'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Schedule Modal - Fixed: Reduced size and ensured close button is visible
const ScheduleModal = ({ 
  isOpen, 
  onClose, 
  schedule 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  schedule: ClassSchedule | null;
}) => {
  if (!isOpen || !schedule) return null;

  const getRoomNumber = (schedule: ClassSchedule) => {
    return schedule.room?.room_number || 'Unknown';
  };

  const getBuilding = (schedule: ClassSchedule) => {
    return schedule.room?.building || 'Unknown';
  };

  const getInstructorName = (schedule: ClassSchedule) => {
    return schedule.instructor?.name || 'Unknown Instructor';
  };

  const formatReservationDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden">
        {/* Modal Header with Close Button - Fixed: Reduced padding */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-black">
              Schedule Details
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Modal Content - Fixed: Added scrollable area */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-bold text-2xl text-black">
                {schedule.is_reservation ? (
                  <>📅 Room Reservation</>
                ) : (
                  `${schedule.course_code} - ${schedule.course_name}`
                )}
              </h3>
              {schedule.is_reservation && (
                <p className="text-sm text-gray-600 font-medium mt-2">
                  Purpose: {schedule.reservation_purpose}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-black mb-3">Day</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black capitalize font-semibold">
                  {schedule.day}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-3">Time</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-3">Room</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {getRoomNumber(schedule)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-3">Building</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {getBuilding(schedule)}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-black mb-3">
                  {schedule.is_reservation ? 'Reserved By:' : 'Instructor:'}
                </label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {getInstructorName(schedule)}
                </div>
              </div>
              {schedule.is_reservation && schedule.reservation_date && (
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-black mb-3">Reservation Date</label>
                  <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                    {formatReservationDate(schedule.reservation_date)}
                  </div>
                </div>
              )}
              {schedule.is_reservation && schedule.course && schedule.year && schedule.block && (
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-black mb-3">For</label>
                  <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                    {schedule.course} • Year {schedule.year} • Block {schedule.block}
                  </div>
                </div>
              )}
            </div>

            {schedule.room?.equipment && (
              <div>
                <label className="block text-sm font-semibold text-black mb-3">Room Equipment</label>
                <div className="p-3 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 text-black font-semibold">
                  {schedule.room.equipment}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer - Fixed: Sticky at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <Button 
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Weekly Calendar View (Time-based) - Updated to match maroon theme
const WeeklyCalendarModal = ({ 
  isOpen, 
  onClose, 
  schedules 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  schedules: ClassSchedule[];
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  if (!isOpen) return null;

  // Get week days starting from Sunday
  const getWeekDays = () => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  // Get events for specific date with proper date comparison
  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    return schedules.filter(schedule => {
      if (schedule.is_reservation && schedule.reservation_date) {
        const reservationDate = new Date(schedule.reservation_date);
        reservationDate.setHours(0, 0, 0, 0);
        const reservationDateString = reservationDate.toISOString().split('T')[0];
        return reservationDateString === dateString;
      } else {
        return schedule.day.toLowerCase() === dayName;
      }
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newWeek = new Date(prev);
      if (direction === 'prev') {
        newWeek.setDate(prev.getDate() - 7);
      } else {
        newWeek.setDate(prev.getDate() + 7);
      }
      return newWeek;
    });
  };

  const weekDays = getWeekDays();
  
  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const weekRange = `${formatDateForDisplay(weekDays[0])} - ${formatDateForDisplay(weekDays[6])}`;

  // Time slots from 7 AM to 9 PM
  const timeSlots = Array.from({ length: 15 }, (_, i) => i + 7);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-black">Weekly Calendar View</h2>
            <p className="text-gray-600 mt-1 font-medium">View your weekly schedule at a glance</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => navigateWeek('prev')}
            className="flex items-center font-semibold border-gray-300 hover:border-gray-400 text-black"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Prev Week
          </Button>
          <span className="font-bold text-2xl text-black">{weekRange}</span>
          <Button
            variant="outline"
            onClick={() => navigateWeek('next')}
            className="flex items-center font-semibold border-gray-300 hover:border-gray-400 text-black"
          >
            Next Week
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-8 gap-0.5 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
          {/* Time slots column */}
          <div className="bg-gradient-to-b from-gray-50 to-gray-100">
            <div className="h-16 border-b border-gray-200 flex items-center justify-center font-bold text-black text-base">
              Time
            </div>
            {timeSlots.map(hour => (
              <div key={hour} className="h-20 border-b border-gray-200 text-sm text-gray-700 p-2 flex items-center justify-center font-semibold">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>

          {/* Days columns */}
          {weekDays.map((day, dayIndex) => {
            const dayEvents = getEventsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div key={dayIndex} className="flex-1">
                <div className={`h-16 border-b border-gray-200 text-center font-bold p-3 ${
                  isToday ? 'bg-gradient-to-r from-maroon-100 to-maroon-200 text-maroon-800 border-maroon-200' : 'bg-gradient-to-r from-gray-50 to-maroon-50'
                }`}>
                  <div className="text-base">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-sm font-semibold">
                    {day.getDate()} {day.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
                
                {/* Time slots for this day */}
                {timeSlots.map(hour => {
                  const eventsInThisHour = dayEvents.filter(event => {
                    const eventStartHour = parseInt(event.start_time.split(':')[0]);
                    return eventStartHour === hour;
                  });

                  return (
                    <div key={hour} className="h-20 border-b border-gray-200 relative bg-white">
                      {eventsInThisHour.map((event, eventIndex) => {
                        const startHour = parseInt(event.start_time.split(':')[0]);
                        const endHour = parseInt(event.end_time.split(':')[0]);
                        const duration = endHour - startHour;
                        const height = duration * 80;
                        const top = 0;
                        
                        return (
                          <div
                            key={eventIndex}
                            className={`absolute left-1 right-1 p-3 rounded-lg shadow-sm ${
                              event.is_reservation 
                                ? 'bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300 text-purple-900' 
                                : 'bg-gradient-to-r from-maroon-100 to-maroon-200 border border-maroon-300 text-maroon-900'
                            }`}
                            style={{ 
                              top: `${top}px`, 
                              height: `${height - 4}px`,
                              zIndex: 10
                            }}
                          >
                            <div className="font-bold text-sm truncate mb-1">
                              {event.room?.room_number}
                            </div>
                            <div className="text-sm font-semibold truncate mb-1">
                              {formatTime(event.start_time)} - {formatTime(event.end_time)}
                            </div>
                            <div className="text-sm truncate">
                              {event.is_reservation ? '📅' : '📚'} 
                              {event.is_reservation ? event.reservation_purpose : event.course_code}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-2xl border border-gray-200">
          <h3 className="font-bold text-black mb-4 text-lg">Legend</h3>
          <div className="flex space-x-8">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-gradient-to-r from-maroon-100 to-maroon-200 border border-maroon-300 rounded mr-3"></div>
              <span className="font-semibold text-black">Class Schedule</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-300 rounded mr-3"></div>
              <span className="font-semibold text-black">Room Reservation</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-8">
          <Button 
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// Study Plan Modal - Updated to match maroon theme
const StudyPlanModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [studyPlans, setStudyPlans] = useState<Array<{
    id: number;
    subject: string;
    date: string;
    time: string;
    duration: string;
    notes: string;
  }>>([]);
  const [newPlan, setNewPlan] = useState({
    subject: '',
    date: '',
    time: '',
    duration: '1 hour',
    notes: ''
  });

  if (!isOpen) return null;

  const addStudyPlan = () => {
    if (!newPlan.subject || !newPlan.date || !newPlan.time) {
      alert('Please fill in subject, date, and time');
      return;
    }

    const plan = {
      id: Date.now(),
      ...newPlan
    };

    setStudyPlans(prev => [...prev, plan]);
    setNewPlan({
      subject: '',
      date: '',
      time: '',
      duration: '1 hour',
      notes: ''
    });
  };

  const removeStudyPlan = (id: number) => {
    setStudyPlans(prev => prev.filter(plan => plan.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-black">My Study Plan</h2>
            <p className="text-gray-600 mt-1 font-medium">Plan and organize your study sessions</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
          >
            ×
          </button>
        </div>

        {/* Add New Study Plan */}
        <div className="bg-gradient-to-r from-maroon-50 to-purple-50 p-6 rounded-2xl border border-maroon-200 mb-8">
          <h3 className="font-bold text-2xl text-black mb-6">Add Study Session</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Subject/Course *</label>
              <input
                type="text"
                placeholder="Enter subject"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={newPlan.subject}
                onChange={(e) => setNewPlan(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Date *</label>
              <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={newPlan.date}
                onChange={(e) => setNewPlan(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Time *</label>
              <input
                type="time"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={newPlan.time}
                onChange={(e) => setNewPlan(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Duration</label>
              <select
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={newPlan.duration}
                onChange={(e) => setNewPlan(prev => ({ ...prev, duration: e.target.value }))}
              >
                <option value="30 minutes">30 minutes</option>
                <option value="1 hour">1 hour</option>
                <option value="1.5 hours">1.5 hours</option>
                <option value="2 hours">2 hours</option>
                <option value="3 hours">3 hours</option>
              </select>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-black mb-3">Notes (optional)</label>
            <textarea
              placeholder="Add notes about this study session..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              rows={3}
              value={newPlan.notes}
              onChange={(e) => setNewPlan(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <Button 
            onClick={addStudyPlan} 
            className="w-full py-4 text-lg bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
          >
            Add Study Session
          </Button>
        </div>

        {/* Study Plans List */}
        <div className="space-y-6">
          <h3 className="font-bold text-2xl text-black mb-6">Upcoming Study Sessions</h3>
          {studyPlans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-2xl font-semibold mb-2 text-black">No study sessions planned yet</p>
              <p className="text-lg font-medium">Add your first study session above</p>
            </div>
          ) : (
            studyPlans.map(plan => (
              <div key={plan.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-black text-xl mb-4">{plan.subject}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base text-gray-700">
                      <div className="font-semibold">
                        <span className="text-gray-500">Date:</span> {plan.date}
                      </div>
                      <div className="font-semibold">
                        <span className="text-gray-500">Time:</span> {plan.time}
                      </div>
                      <div className="font-semibold">
                        <span className="text-gray-500">Duration:</span> {plan.duration}
                      </div>
                      <div className="font-semibold">
                        <span className="text-gray-500">Status:</span> 
                        <span className="ml-2 text-green-600 font-bold">Upcoming</span>
                      </div>
                    </div>
                    {plan.notes && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200">
                        <p className="text-sm font-semibold text-black mb-2">Notes:</p>
                        <p className="text-base text-gray-600">{plan.notes}</p>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="destructive" 
                    size="lg"
                    onClick={() => removeStudyPlan(plan.id)}
                    className="ml-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold shadow-lg"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-8">
          <Button 
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// Search Instructor Modal - Updated with all status types and maroon theme
const SearchInstructorModal = ({ 
  isOpen, 
  onClose, 
  instructors,
  reservations
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  instructors: InstructorInfo[];
  reservations: FullReservation[];
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
    instructor: InstructorInfo;
    reservations: FullReservation[];
  }[]>([]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filteredInstructors = instructors.filter(instructor =>
        instructor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        instructor.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const results = filteredInstructors.map(instructor => {
        const instructorReservations = reservations.filter(reservation =>
          reservation.user_id === instructor.id
        );

        return {
          instructor,
          reservations: instructorReservations
        };
      });

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, instructors, reservations]);

  // Format time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const formatReservationDate = (dateString: string) => {
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

  const getRoomNumber = (reservation: FullReservation) => {
    return reservation.room?.room_number || 'Unknown';
  };

  // Check if reservation is currently active
  const isReservationActive = (reservation: FullReservation): boolean => {
    if (reservation.status !== 'approved') return false;
    
    try {
      const reservationDate = new Date(reservation.date);
      const today = new Date();
      
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (reservationDay.getTime() !== todayDay.getTime()) {
        return false;
      }
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHours, startMinutes] = reservation.start_time.split(':').map(Number);
      const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
      
      const reservationStartTime = startHours * 60 + startMinutes;
      const reservationEndTime = endHours * 60 + endMinutes;
      
      return currentTime >= reservationStartTime && currentTime < reservationEndTime;
    } catch (error) {
      console.error('Error checking reservation activity:', error);
      return false;
    }
  };

  // Check if reservation is completed
  const isReservationCompleted = (reservation: FullReservation): boolean => {
    if (reservation.status !== 'approved') return false;
    
    try {
      const reservationDate = new Date(reservation.date);
      const today = new Date();
      
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // If reservation date is in the past
      if (reservationDay < todayDay) {
        return true;
      }
      
      // If reservation is today but end time has passed
      if (reservationDay.getTime() === todayDay.getTime()) {
        const now = new Date();
        const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
        const reservationEndTime = new Date(reservationDate);
        reservationEndTime.setHours(endHours, endMinutes, 0, 0);
        
        return now >= reservationEndTime;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking reservation completion:', error);
      return false;
    }
  };

  // Get status display with proper styling
  const getStatusDisplay = (reservation: FullReservation) => {
    if (isReservationActive(reservation)) {
      return {
        text: 'ACTIVE',
        bgColor: 'from-red-100 to-rose-100 border-red-200 text-red-800'
      };
    }
    
    if (isReservationCompleted(reservation)) {
      return {
        text: 'COMPLETED',
        bgColor: 'from-gray-100 to-gray-200 border-gray-300 text-gray-800'
      };
    }
    
    switch (reservation.status) {
      case 'approved':
        return {
          text: 'APPROVED',
          bgColor: 'from-green-100 to-emerald-100 border-green-200 text-green-800'
        };
      case 'pending':
        return {
          text: 'PENDING',
          bgColor: 'from-amber-100 to-orange-100 border-amber-200 text-amber-800'
        };
      case 'cancelled':
        return {
          text: 'CANCELLED',
          bgColor: 'from-red-100 to-rose-100 border-red-200 text-red-800'
        };
      case 'rejected':
        return {
          text: 'REJECTED',
          bgColor: 'from-red-100 to-rose-100 border-red-200 text-red-800'
        };
      default:
        return {
          text: reservation.status.toUpperCase(),
          bgColor: 'from-gray-100 to-blue-100 border-gray-200 text-gray-800'
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-black">Search by Instructor</h2>
            <p className="text-gray-600 mt-1 font-medium">Find instructors and their room reservations</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
          >
            ×
          </button>
        </div>

        {/* Search Input */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by instructor name, email, or department..."
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Search Results */}
        <div className="space-y-8">
          {searchTerm && (
            <p className="text-base text-gray-600 font-semibold">
              Found {searchResults.length} instructor(s) for &quot;{searchTerm}&quot;
            </p>
          )}

          {searchResults.map(({ instructor, reservations }) => (
            <div key={instructor.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-black text-2xl">
                    {instructor.name}
                  </h3>
                  <p className="text-gray-600 font-medium text-lg">{instructor.email}</p>
                  <p className="text-base text-blue-600 font-bold mt-2">{instructor.department}</p>
                </div>
                <span className="px-4 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                  {instructor.role}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-black text-xl mb-6">Reservations ({reservations.length})</h4>
                {reservations.length > 0 ? (
                  <div className="space-y-4">
                    {reservations.map((reservation) => {
                      const status = getStatusDisplay(reservation);
                      
                      return (
                        <div key={reservation.id} className="bg-gradient-to-r from-gray-50 to-maroon-50 border border-gray-200 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-bold text-black text-lg">
                                📅 {reservation.purpose}
                              </div>
                              <div className="text-sm text-gray-600 font-medium">
                                Room: {getRoomNumber(reservation)}
                              </div>
                            </div>
                            <span className={`px-3 py-1.5 text-sm font-bold rounded-full border bg-gradient-to-r ${status.bgColor}`}>
                              {status.text}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-base text-gray-700">
                            <div className="font-semibold">
                              <span className="text-gray-500">Date:</span> {formatReservationDate(reservation.date)}
                            </div>
                            <div className="font-semibold">
                              <span className="text-gray-500">Time:</span> {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                            </div>
                            {reservation.course && reservation.year && reservation.block && (
                              <div className="md:col-span-2 font-semibold">
                                <span className="text-gray-500">For:</span> {reservation.course} • Y{reservation.year} • B{reservation.block}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-2xl font-semibold mb-2 text-black">No reservations found</p>
                    <p className="text-lg font-medium">This instructor has no room reservations</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {searchTerm && searchResults.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-2xl font-semibold mb-2 text-black">No instructors found</p>
              <p className="text-lg font-medium">Try a different search term</p>
            </div>
          )}

          {!searchTerm && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">👨‍🏫</div>
              <p className="text-2xl font-semibold mb-2 text-black">Search for instructors</p>
              <p className="text-lg font-medium">Enter an instructor&apos;s name, email, or department to search</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-8">
          <Button 
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// Search Classroom Modal - Updated with all status types and maroon theme
const SearchClassroomModal = ({ 
  isOpen, 
  onClose, 
  rooms,
  allReservations
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  rooms: Room[];
  allReservations: FullReservation[];
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchResults, setSearchResults] = useState<{
    room: Room;
    reservations: FullReservation[];
  }[]>([]);

  useEffect(() => {
    if (searchTerm.trim() || selectedDate) {
      const filteredRooms = rooms.filter(room =>
        room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.type.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const results = filteredRooms.map(room => {
        const roomReservations = allReservations.filter(reservation => {
          const matchesRoom = reservation.room_id === room.id;
          const matchesDate = !selectedDate || 
            new Date(reservation.date).toISOString().split('T')[0] === selectedDate;
          
          return matchesRoom && matchesDate;
        });

        return {
          room,
          reservations: roomReservations
        };
      });

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, selectedDate, allReservations, rooms]);

  // Format time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const formatReservationDate = (dateString: string) => {
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

  // Check if room is currently occupied
  const isRoomCurrentlyOccupied = (room: Room): boolean => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    return allReservations.some(reservation => {
      if (reservation.room_id !== room.id || reservation.status !== 'approved') {
        return false;
      }
      
      // Check if reservation is for today
      const reservationDate = new Date(reservation.date).toISOString().split('T')[0];
      if (reservationDate !== today) {
        return false;
      }
      
      // Check if current time is within reservation time
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHours, startMinutes] = reservation.start_time.split(':').map(Number);
      const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
      
      const reservationStartTime = startHours * 60 + startMinutes;
      const reservationEndTime = endHours * 60 + endMinutes;
      
      return currentTime >= reservationStartTime && currentTime < reservationEndTime;
    });
  };

  // Check if reservation is currently active
  const isReservationActive = (reservation: FullReservation): boolean => {
    if (reservation.status !== 'approved') return false;
    
    try {
      const reservationDate = new Date(reservation.date);
      const today = new Date();
      
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (reservationDay.getTime() !== todayDay.getTime()) {
        return false;
      }
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHours, startMinutes] = reservation.start_time.split(':').map(Number);
      const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
      
      const reservationStartTime = startHours * 60 + startMinutes;
      const reservationEndTime = endHours * 60 + endMinutes;
      
      return currentTime >= reservationStartTime && currentTime < reservationEndTime;
    } catch (error) {
      console.error('Error checking reservation activity:', error);
      return false;
    }
  };

  // Check if reservation is completed
  const isReservationCompleted = (reservation: FullReservation): boolean => {
    if (reservation.status !== 'approved') return false;
    
    try {
      const reservationDate = new Date(reservation.date);
      const today = new Date();
      
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // If reservation date is in the past
      if (reservationDay < todayDay) {
        return true;
      }
      
      // If reservation is today but end time has passed
      if (reservationDay.getTime() === todayDay.getTime()) {
        const now = new Date();
        const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
        const reservationEndTime = new Date(reservationDate);
        reservationEndTime.setHours(endHours, endMinutes, 0, 0);
        
        return now >= reservationEndTime;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking reservation completion:', error);
      return false;
    }
  };

  // Get status display with proper styling
  const getStatusDisplay = (reservation: FullReservation) => {
    if (isReservationActive(reservation)) {
      return {
        text: 'ACTIVE',
        bgColor: 'from-red-100 to-rose-100 border-red-200 text-red-800'
      };
    }
    
    if (isReservationCompleted(reservation)) {
      return {
        text: 'COMPLETED',
        bgColor: 'from-gray-100 to-gray-200 border-gray-300 text-gray-800'
      };
    }
    
    switch (reservation.status) {
      case 'approved':
        return {
          text: 'APPROVED',
          bgColor: 'from-green-100 to-emerald-100 border-green-200 text-green-800'
        };
      case 'pending':
        return {
          text: 'PENDING',
          bgColor: 'from-amber-100 to-orange-100 border-amber-200 text-amber-800'
        };
      case 'cancelled':
        return {
          text: 'CANCELLED',
          bgColor: 'from-red-100 to-rose-100 border-red-200 text-red-800'
        };
      case 'rejected':
        return {
          text: 'REJECTED',
          bgColor: 'from-red-100 to-rose-100 border-red-200 text-red-800'
        };
      default:
        return {
          text: reservation.status.toUpperCase(),
          bgColor: 'from-gray-100 to-blue-100 border-gray-200 text-gray-800'
        };
    }
  };

  // Get reservation groups by status
  const getReservationsByStatus = (reservations: FullReservation[]) => {
    const activeReservations = reservations.filter(res => isReservationActive(res));
    const approvedReservations = reservations.filter(res => 
      res.status === 'approved' && !isReservationActive(res) && !isReservationCompleted(res)
    );
    const completedReservations = reservations.filter(res => isReservationCompleted(res));
    const pendingReservations = reservations.filter(res => res.status === 'pending');
    const cancelledReservations = reservations.filter(res => res.status === 'cancelled');
    const rejectedReservations = reservations.filter(res => res.status === 'rejected');
    const otherReservations = reservations.filter(res => 
      !['approved', 'pending', 'cancelled', 'rejected'].includes(res.status)
    );

    return {
      active: activeReservations,
      approved: approvedReservations,
      completed: completedReservations,
      pending: pendingReservations,
      cancelled: cancelledReservations,
      rejected: rejectedReservations,
      other: otherReservations
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-black">Search by Classroom</h2>
            <p className="text-gray-600 mt-1 font-medium">Find classrooms and their reservations</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
          >
            ×
          </button>
        </div>

        {/* Search Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-gradient-to-r from-maroon-50 to-purple-50 rounded-2xl border border-maroon-200">
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Search Classroom</label>
            <input
              type="text"
              placeholder="Search by room number, building, or type..."
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Filter by Date</label>
            <input
              type="date"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium text-lg"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-8">
          {(searchTerm || selectedDate) && searchResults.length > 0 && (
            <p className="text-base text-gray-600 font-semibold">
              Found {searchResults.length} classroom(s) matching your search
            </p>
          )}

          {searchResults.map(({ room, reservations }) => {
            const isCurrentlyOccupied = isRoomCurrentlyOccupied(room);
            const statusGroups = getReservationsByStatus(reservations);
            
            return (
              <div key={room.id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-black text-2xl">
                      {room.room_number} - {room.building}
                    </h3>
                    <p className="text-gray-600 font-medium text-lg">
                      Capacity: {room.capacity} seats • Type: <span className="capitalize">{room.type}</span>
                    </p>
                  </div>
                  <span className={`px-4 py-2 text-sm font-bold rounded-full border ${
                    room.is_available && !isCurrentlyOccupied 
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' 
                      : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200'
                  }`}>
                    {room.is_available && !isCurrentlyOccupied ? 'Available' : 'Occupied'}
                  </span>
                </div>

                {room.equipment && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200">
                    <p className="font-semibold text-black text-lg mb-2">Equipment:</p>
                    <p className="text-gray-700 text-base">{room.equipment}</p>
                  </div>
                )}

                {/* Reservations for this room */}
                <div>
                  <h4 className="font-bold text-black text-xl mb-6">
                    Reservations ({reservations.length})
                  </h4>
                  
                  {/* ACTIVE Reservations */}
                  {statusGroups.active.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-base font-semibold text-red-700 mb-4">🔥 ACTIVE NOW:</h5>
                      <div className="space-y-3">
                        {statusGroups.active.map((reservation) => (
                          <div key={reservation.id} className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-bold text-red-900 text-lg">
                                  {reservation.purpose}
                                </div>
                                <div className="text-sm text-red-700 font-medium">
                                  {formatReservationDate(reservation.date)} • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </div>
                              </div>
                              <span className="px-3 py-1.5 text-sm font-bold rounded-full bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200">
                                ACTIVE
                              </span>
                            </div>
                            <div className="text-base text-gray-700">
                              <p className="font-semibold">By: {reservation.user?.name}</p>
                              {reservation.course && reservation.year && reservation.block && (
                                <p className="text-sm text-blue-600 font-semibold mt-1">
                                  For: {reservation.course} • Y{reservation.year} • B{reservation.block}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* APPROVED Reservations */}
                  {statusGroups.approved.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-base font-semibold text-green-700 mb-4">✅ APPROVED:</h5>
                      <div className="space-y-3">
                        {statusGroups.approved.map((reservation) => (
                          <div key={reservation.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-bold text-green-900 text-lg">
                                  {reservation.purpose}
                                </div>
                                <div className="text-sm text-green-700 font-medium">
                                  {formatReservationDate(reservation.date)} • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </div>
                              </div>
                              <span className="px-3 py-1.5 text-sm font-bold rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200">
                                APPROVED
                              </span>
                            </div>
                            <div className="text-base text-gray-700">
                              <p className="font-semibold">By: {reservation.user?.name}</p>
                              {reservation.course && reservation.year && reservation.block && (
                                <p className="text-sm text-blue-600 font-semibold mt-1">
                                  For: {reservation.course} • Y{reservation.year} • B{reservation.block}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* COMPLETED Reservations */}
                  {statusGroups.completed.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-base font-semibold text-gray-700 mb-4">✅ COMPLETED:</h5>
                      <div className="space-y-3">
                        {statusGroups.completed.map((reservation) => (
                          <div key={reservation.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-bold text-gray-900 text-lg">
                                  {reservation.purpose}
                                </div>
                                <div className="text-sm text-gray-700 font-medium">
                                  {formatReservationDate(reservation.date)} • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </div>
                              </div>
                              <span className="px-3 py-1.5 text-sm font-bold rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300">
                                COMPLETED
                              </span>
                            </div>
                            <div className="text-base text-gray-700">
                              <p className="font-semibold">By: {reservation.user?.name}</p>
                              {reservation.course && reservation.year && reservation.block && (
                                <p className="text-sm text-blue-600 font-semibold mt-1">
                                  For: {reservation.course} • Y{reservation.year} • B{reservation.block}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PENDING Reservations */}
                  {statusGroups.pending.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-base font-semibold text-amber-700 mb-4">⏳ PENDING:</h5>
                      <div className="space-y-3">
                        {statusGroups.pending.map((reservation) => (
                          <div key={reservation.id} className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-bold text-amber-900 text-lg">
                                  {reservation.purpose}
                                </div>
                                <div className="text-sm text-amber-700 font-medium">
                                  {formatReservationDate(reservation.date)} • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </div>
                              </div>
                              <span className="px-3 py-1.5 text-sm font-bold rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200">
                                PENDING
                              </span>
                            </div>
                            <div className="text-base text-gray-700">
                              <p className="font-semibold">By: {reservation.user?.name}</p>
                              {reservation.course && reservation.year && reservation.block && (
                                <p className="text-sm text-blue-600 font-semibold mt-1">
                                  For: {reservation.course} • Y{reservation.year} • B{reservation.block}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CANCELLED Reservations */}
                  {statusGroups.cancelled.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-base font-semibold text-red-700 mb-4">❌ CANCELLED:</h5>
                      <div className="space-y-3">
                        {statusGroups.cancelled.map((reservation) => (
                          <div key={reservation.id} className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-bold text-red-900 text-lg">
                                  {reservation.purpose}
                                </div>
                                <div className="text-sm text-red-700 font-medium">
                                  {formatReservationDate(reservation.date)} • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </div>
                              </div>
                              <span className="px-3 py-1.5 text-sm font-bold rounded-full bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200">
                                CANCELLED
                              </span>
                            </div>
                            <div className="text-base text-gray-700">
                              <p className="font-semibold">By: {reservation.user?.name}</p>
                              {reservation.course && reservation.year && reservation.block && (
                                <p className="text-sm text-blue-600 font-semibold mt-1">
                                  For: {reservation.course} • Y{reservation.year} • B{reservation.block}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* REJECTED Reservations */}
                  {statusGroups.rejected.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-base font-semibold text-red-700 mb-4">❌ REJECTED:</h5>
                      <div className="space-y-3">
                        {statusGroups.rejected.map((reservation) => (
                          <div key={reservation.id} className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="font-bold text-red-900 text-lg">
                                  {reservation.purpose}
                                </div>
                                <div className="text-sm text-red-700 font-medium">
                                  {formatReservationDate(reservation.date)} • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                </div>
                              </div>
                              <span className="px-3 py-1.5 text-sm font-bold rounded-full bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200">
                                REJECTED
                              </span>
                            </div>
                            <div className="text-base text-gray-700">
                              <p className="font-semibold">By: {reservation.user?.name}</p>
                              {reservation.course && reservation.year && reservation.block && (
                                <p className="text-sm text-blue-600 font-semibold mt-1">
                                  For: {reservation.course} • Y{reservation.year} • B{reservation.block}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* OTHER Reservations */}
                  {statusGroups.other.length > 0 && (
                    <div>
                      <h5 className="text-base font-semibold text-gray-700 mb-4">OTHER STATUS:</h5>
                      <div className="space-y-3">
                        {statusGroups.other.map((reservation) => {
                          const status = getStatusDisplay(reservation);
                          return (
                            <div key={reservation.id} className="bg-gradient-to-r from-gray-50 to-maroon-50 border border-gray-200 rounded-xl p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="font-bold text-gray-900 text-lg">
                                    {reservation.purpose}
                                  </div>
                                  <div className="text-sm text-gray-700 font-medium">
                                    {formatReservationDate(reservation.date)} • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                                  </div>
                                </div>
                                <span className={`px-3 py-1.5 text-sm font-bold rounded-full border bg-gradient-to-r ${status.bgColor}`}>
                                  {status.text}
                                </span>
                              </div>
                              <div className="text-base text-gray-700">
                                <p className="font-semibold">By: {reservation.user?.name}</p>
                                {reservation.course && reservation.year && reservation.block && (
                                  <p className="text-sm text-blue-600 font-semibold mt-1">
                                    For: {reservation.course} • Y{reservation.year} • B{reservation.block}
                                  </p>
                              )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {reservations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-6xl mb-4">📋</div>
                      <p className="text-2xl font-semibold mb-2 text-black">No reservations found</p>
                      <p className="text-lg font-medium">This classroom has no reservations</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(searchTerm || selectedDate) && searchResults.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🏫</div>
              <p className="text-2xl font-semibold mb-2 text-black">No classrooms found</p>
              <p className="text-lg font-medium">Try a different search term or date</p>
            </div>
          )}

          {!searchTerm && !selectedDate && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-2xl font-semibold mb-2 text-black">Search for classrooms</p>
              <p className="text-lg font-medium">Enter a room number or select a date to search</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-8">
          <Button 
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// Classroom Modal (View All Classrooms) - Updated to match maroon theme
const ClassroomModal = ({ 
  isOpen, 
  onClose, 
  rooms,
  allReservations
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  rooms: Room[];
  allReservations: FullReservation[];
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  if (!isOpen) return null;

  // Format time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const formatReservationDate = (dateString: string) => {
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

  // Get reservations for a specific room
  const getRoomReservations = (room: Room) => {
    return allReservations.filter(reservation => 
      reservation.room_id === room.id && 
      reservation.status === 'approved' &&
      (!selectedDate || new Date(reservation.date).toISOString().split('T')[0] === selectedDate)
    );
  };

  // Check if room is currently occupied
  const isRoomCurrentlyOccupied = (room: Room) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    return allReservations.some(reservation => {
      if (reservation.room_id !== room.id || reservation.status !== 'approved') {
        return false;
      }
      
      // Check if reservation is for today
      const reservationDate = new Date(reservation.date).toISOString().split('T')[0];
      if (reservationDate !== today) {
        return false;
      }
      
      // Check if current time is within reservation time
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHours, startMinutes] = reservation.start_time.split(':').map(Number);
      const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
      
      const reservationStartTime = startHours * 60 + startMinutes;
      const reservationEndTime = endHours * 60 + endMinutes;
      
      return currentTime >= reservationStartTime && currentTime < reservationEndTime;
    });
  };

  // Check if room is available for selected date and time
  const isRoomAvailableForTime = (room: Room, date: string, time: string) => {
    if (!room.is_available) return false;
    
    const roomReservations = getRoomReservations(room);
    if (!date || !time) return true;
    
    const selectedTimeInMinutes = convertTimeToMinutes(time);
    
    for (const reservation of roomReservations) {
      const reservationStartInMinutes = convertTimeToMinutes(reservation.start_time);
      const reservationEndInMinutes = convertTimeToMinutes(reservation.end_time);
      
      if (selectedTimeInMinutes >= reservationStartInMinutes && selectedTimeInMinutes < reservationEndInMinutes) {
        return false;
      }
    }
    
    return true;
  };

  // Helper function to convert time string to minutes
  const convertTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get conflicting reservations for better error messaging
  const getConflictingReservations = (room: Room, date: string, time: string) => {
    if (!date || !time) return [];
    
    const roomReservations = allReservations.filter(reservation => 
      reservation.room_id === room.id && 
      reservation.status === 'approved' &&
      new Date(reservation.date).toISOString().split('T')[0] === date
    );

    const selectedTimeInMinutes = convertTimeToMinutes(time);

    return roomReservations.filter(reservation => {
      const reservationStartInMinutes = convertTimeToMinutes(reservation.start_time);
      const reservationEndInMinutes = convertTimeToMinutes(reservation.end_time);
      
      return selectedTimeInMinutes >= reservationStartInMinutes && selectedTimeInMinutes < reservationEndInMinutes;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-7xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-black">All Classrooms</h2>
            <p className="text-gray-600 mt-1 font-medium">View all classrooms and their availability</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl transition-colors font-bold"
          >
            ×
          </button>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gradient-to-r from-maroon-50 to-purple-50 rounded-2xl border border-maroon-200">
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Date</label>
            <input
              type="date"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium text-lg"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Time</label>
            <input
              type="time"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium text-lg"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => { setSelectedDate(''); setSelectedTime(''); }}
              variant="outline"
              className="w-full py-4 text-lg font-semibold border-gray-300 hover:border-gray-400 text-black"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const roomReservations = getRoomReservations(room);
            const isCurrentlyOccupied = isRoomCurrentlyOccupied(room);
            const isAvailableForSelected = isRoomAvailableForTime(room, selectedDate, selectedTime);
            const conflictingReservations = getConflictingReservations(room, selectedDate, selectedTime);

            return (
              <div 
                key={room.id}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-black text-xl">
                      {room.room_number}
                    </h4>
                    <p className="text-gray-600 font-medium text-lg">{room.building}</p>
                  </div>
                  <span className={`px-4 py-2 text-sm font-bold rounded-full border ${
                    isCurrentlyOccupied ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200' : 
                    (!selectedDate && !selectedTime && room.is_available) ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' :
                    isAvailableForSelected ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200'
                  }`}>
                    {isCurrentlyOccupied ? 'Occupied' : 
                     (!selectedDate && !selectedTime && room.is_available) ? 'Available' :
                     isAvailableForSelected ? 'Available' : 'Occupied'}
                  </span>
                </div>
                
                <div className="space-y-3 text-base text-gray-700 mb-4">
                  <div className="font-semibold">
                    <span className="text-gray-500">Capacity:</span> {room.capacity} seats
                  </div>
                  <div className="font-semibold">
                    <span className="text-gray-500">Type:</span> 
                    <span className="capitalize"> {room.type}</span>
                  </div>
                  {room.equipment && (
                    <div>
                      <span className="text-gray-500 font-semibold">Equipment:</span> 
                      <p className="text-base text-gray-600 mt-1 font-medium">{room.equipment}</p>
                    </div>
                  )}
                </div>

                {/* Room Reservations */}
                {roomReservations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      📅 Reservations{selectedDate && ` on ${selectedDate}`}:
                    </p>
                    <div className="space-y-2">
                      {roomReservations.slice(0, 2).map((reservation, index) => (
                        <div key={index} className="text-sm bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-3">
                          <div className="font-bold text-amber-900">
                            {formatReservationDate(reservation.date)} • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                          </div>
                          <div className="text-amber-700 font-medium">
                            {reservation.user?.name} • {reservation.purpose}
                          </div>
                        </div>
                      ))}
                      {roomReservations.length > 2 && (
                        <div className="text-sm text-gray-500 text-center font-semibold">
                          +{roomReservations.length - 2} more reservations
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(selectedDate || selectedTime) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className={`p-4 rounded-xl border ${
                      isAvailableForSelected ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
                    }`}>
                      <p className={`text-sm font-bold ${
                        isAvailableForSelected ? 'text-green-700' : 'text-red-700'
                      }`}>
                        📅 Availability Check
                      </p>
                      <p className={`text-sm font-medium ${
                        isAvailableForSelected ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedDate && `Date: ${selectedDate}`}
                        {selectedDate && selectedTime && ' • '}
                        {selectedTime && `Time: ${formatTime(selectedTime)}`}
                      </p>
                      <p className={`text-sm mt-2 font-bold ${
                        isAvailableForSelected ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isAvailableForSelected ? '✅ Room is available for this time' : '❌ Room is occupied during this time'}
                      </p>
                      {!isAvailableForSelected && conflictingReservations.length > 0 && (
                        <div className="mt-3 text-sm">
                          <p className="font-bold text-red-700">Conflicting Reservations:</p>
                          {conflictingReservations.map((reservation, index) => (
                            <div key={index} className="text-red-600 font-medium mt-1">
                              • {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}: {reservation.purpose}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-end pt-8">
          <Button 
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function StudentDashboard() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [allReservations, setAllReservations] = useState<FullReservation[]>([]);
  const [allInstructors, setAllInstructors] = useState<InstructorInfo[]>([]);
  const [calendarReservations, setCalendarReservations] = useState<CalendarReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassSchedule | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [classroomModalOpen, setClassroomModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [weeklyCalendarModalOpen, setWeeklyCalendarModalOpen] = useState(false);
  const [studyPlanModalOpen, setStudyPlanModalOpen] = useState(false);
  const [searchInstructorModalOpen, setSearchInstructorModalOpen] = useState(false);
  const [searchClassroomModalOpen, setSearchClassroomModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  // Convert AuthContext user to UserProfile type
  const userProfile: UserProfile | null = user ? {
    id: user.id || 0,
    name: user.name || '',
    email: user.email || '',
    role: user.role || '',
    student_id: user.student_id,
    department: user.department,
    year: user.year,
    block: user.block,
    created_at: user.created_at,
    updated_at: user.updated_at
  } : null;

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch student's specific schedule
      const scheduleRes = await api.get<{ data: ClassSchedule[] }>('/api/student-schedule');
      
      // Fetch all rooms
      const roomsRes = await api.get<{ data: Room[] }>('/api/rooms');
      
      // Fetch all reservations (for search functionality)
      const reservationsRes = await api.get<{ data: FullReservation[] }>('/api/reservations/all');
      
      // Fetch all instructors
      const instructorsRes = await api.get<{ data: InstructorInfo[] }>('/api/users/instructors');
      
      // Fetch all reservations for calendar
      const calendarRes = await api.get<{ data: FullReservation[] }>('/api/reservations/all');
      
      // Transform ALL reservations for calendar
      const calendarReservationsData = (calendarRes.data || []).map((res: FullReservation) => ({
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
        status: res.status
      }));
      
      const schedulesWithUniqueKeys = (scheduleRes.data || []).map((schedule, index) => ({
        ...schedule,
        uniqueKey: `${schedule.id}-${schedule.is_reservation ? 'reservation' : 'class'}-${index}`
      }));
      
      setSchedules(schedulesWithUniqueKeys);
      setAvailableRooms(roomsRes.data || []);
      setAllReservations(reservationsRes.data || []);
      setAllInstructors(instructorsRes.data || []);
      setCalendarReservations(calendarReservationsData);
      
      showToast('Schedule loaded successfully', 'success');
    } catch (error: unknown) {
      const apiError = error as ApiError;
      showToast(apiError.message || 'Failed to load schedule', 'error');
    } finally {
      setLoading(false);
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

  const handleViewSchedule = (schedule: ClassSchedule) => {
    setSelectedSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'Weekly Calendar':
        setWeeklyCalendarModalOpen(true);
        break;
      case 'Search by Instructor':
        setSearchInstructorModalOpen(true);
        break;
      case 'Search by Classroom':
        setSearchClassroomModalOpen(true);
        break;
      case 'Study Schedule':
        setStudyPlanModalOpen(true);
        break;
      default:
        showToast(`Action: ${action}`, 'info');
    }
  };

  const handleChangePassword = async (passwordData: ChangePasswordData) => {
    try {
      await api.put('/api/auth/change-password', passwordData);
      showToast('Password changed successfully', 'success');
      setProfileModalOpen(false);
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      const errorMessage = apiError.response?.data?.message || apiError.message || 'Failed to change password';
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const getDayColor = (day: string) => {
    const colors: { [key: string]: string } = {
      monday: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-200',
      tuesday: 'bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 border-green-200',
      wednesday: 'bg-gradient-to-r from-yellow-100 to-amber-200 text-yellow-800 border-amber-200',
      thursday: 'bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800 border-purple-200',
      friday: 'bg-gradient-to-r from-red-100 to-rose-200 text-red-800 border-red-200',
      saturday: 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-200',
      sunday: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-200'
    };
    return colors[day.toLowerCase()] || 'bg-gradient-to-r from-gray-100 to-blue-100 text-gray-800 border-gray-200';
  };

  // Format time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const formatReservationDate = (dateString: string | null): string => {
    if (!dateString) return 'Unknown date';
    
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

  // Check if reservation is currently active (today and within time range)
  const isReservationActive = (schedule: ClassSchedule): boolean => {
    if (!schedule.is_reservation || !schedule.reservation_date) return false;
    
    try {
      const reservationDate = new Date(schedule.reservation_date);
      const today = new Date();
      
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (reservationDay.getTime() !== todayDay.getTime()) {
        return false;
      }
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHours, startMinutes] = schedule.start_time.split(':').map(Number);
      const [endHours, endMinutes] = schedule.end_time.split(':').map(Number);
      
      const reservationStartTime = startHours * 60 + startMinutes;
      const reservationEndTime = endHours * 60 + endMinutes;
      
      return currentTime >= reservationStartTime && currentTime < reservationEndTime;
    } catch (error) {
      console.error('Error checking reservation activity:', error);
      return false;
    }
  };

  // Check if reservation is for today (regardless of time)
  const isReservationToday = (schedule: ClassSchedule): boolean => {
    if (!schedule.is_reservation || !schedule.reservation_date) return false;
    
    try {
      const reservationDate = new Date(schedule.reservation_date);
      const today = new Date();
      
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return reservationDay.getTime() === todayDay.getTime();
    } catch (error) {
      console.error('Error checking if reservation is today:', error);
      return false;
    }
  };

  // Check if reservation is completed (past date or past end time today)
  const isReservationCompleted = (schedule: ClassSchedule): boolean => {
    if (!schedule.is_reservation || !schedule.reservation_date) return false;
    
    try {
      const reservationDate = new Date(schedule.reservation_date);
      const today = new Date();
      
      const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // If reservation date is in the past
      if (reservationDay < todayDay) {
        return true;
      }
      
      // If reservation is today but end time has passed
      if (reservationDay.getTime() === todayDay.getTime()) {
        const now = new Date();
        const [endHours, endMinutes] = schedule.end_time.split(':').map(Number);
        const reservationEndTime = new Date(reservationDate);
        reservationEndTime.setHours(endHours, endMinutes, 0, 0);
        
        return now >= reservationEndTime;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking reservation completion:', error);
      return false;
    }
  };

  // Check if room is currently occupied
  const isRoomCurrentlyOccupied = (room: Room): boolean => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    return allReservations.some(reservation => {
      if (reservation.room_id !== room.id || reservation.status !== 'approved') {
        return false;
      }
      
      // Check if reservation is for today
      const reservationDate = new Date(reservation.date).toISOString().split('T')[0];
      if (reservationDate !== today) {
        return false;
      }
      
      // Check if current time is within reservation time
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHours, startMinutes] = reservation.start_time.split(':').map(Number);
      const [endHours, endMinutes] = reservation.end_time.split(':').map(Number);
      
      const reservationStartTime = startHours * 60 + startMinutes;
      const reservationEndTime = endHours * 60 + endMinutes;
      
      return currentTime >= reservationStartTime && currentTime < reservationEndTime;
    });
  };

  // Safe access helper functions
  const getRoomNumber = (schedule: ClassSchedule) => {
    return schedule.room?.room_number || 'Unknown';
  };

  const getBuilding = (schedule: ClassSchedule) => {
    return schedule.room?.building || 'Unknown';
  };

  const getInstructorName = (schedule: ClassSchedule) => {
    return schedule.instructor?.name || 'Unknown Instructor';
  };

  // Filter out completed reservations from student's schedule
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      if (schedule.is_reservation) {
        return !isReservationCompleted(schedule);
      }
      return true;
    });
  }, [schedules]);

  // Get today's schedule properly
  const todaysSchedules = useMemo(() => {
    const today = new Date();
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    return filteredSchedules.filter(schedule => {
      if (schedule.is_reservation && schedule.reservation_date) {
        const reservationDate = new Date(schedule.reservation_date);
        return reservationDate.toDateString() === today.toDateString();
      } else {
        return schedule.day.toLowerCase() === todayName;
      }
    });
  }, [filteredSchedules]);

  const stats = useMemo(() => {
    const reservations = filteredSchedules.filter(s => s.is_reservation);
    
    return {
      totalClasses: filteredSchedules.length,
      reservations: reservations.length,
      availableRooms: availableRooms.filter(room => room.is_available && !isRoomCurrentlyOccupied(room)).length
    };
  }, [filteredSchedules, availableRooms]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-gray-100/[0.02] bg-[size:60px_60px]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-maroon-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-maroon-100 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-black font-semibold">Loading student dashboard...</p>
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
                    Student <span className="text-white">Portal</span>
                  </h1>
                  <p className="text-sm text-maroon-100 font-semibold">Academic Schedule Dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right hidden md:block">
                  <p className="font-bold text-white text-lg">{user?.name}</p>
                  <p className="text-sm text-maroon-100 capitalize font-semibold">student</p>
                  {user?.department && user?.year && user?.block && (
                    <p className="text-xs bg-gradient-to-r from-white/20 to-white/10 text-white font-semibold px-2 py-1 rounded-full">
                      {user.department} • Y{user.year} • B{user.block}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Calendar Button */}
                  <Button 
                    onClick={() => setCalendarModalOpen(true)}
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
                    onClick={() => setProfileModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-maroon-200 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold hidden sm:flex shadow-sm"
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  
                  {/* Quick Actions Button */}
                  <Button 
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    variant="outline"
                    size="icon"
                    className="border-maroon-200 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold shadow-sm w-10 h-10"
                    title="Quick Actions"
                  >
                    <Menu className="h-5 w-5" />
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

        {/* Quick Actions Sidebar - Maroon Theme */}
        <div className={`fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-maroon-800 to-maroon-900 backdrop-blur-xl shadow-2xl z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">Quick Actions</h2>
              <Button 
                onClick={() => setSidebarOpen(false)}
                variant="ghost" 
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-3 flex-1">
              <Button 
                className="w-full justify-start font-semibold text-lg py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20" 
                variant="outline"
                onClick={() => {
                  setSidebarOpen(false);
                  setCalendarModalOpen(true);
                }}
              >
                <span className="mr-3 text-xl">📅</span>
                Monthly Calendar
              </Button>
              <Button 
                className="w-full justify-start font-semibold text-lg py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20" 
                variant="outline"
                onClick={() => {
                  setSidebarOpen(false);
                  setWeeklyCalendarModalOpen(true);
                }}
              >
                <span className="mr-3 text-xl">📆</span>
                Weekly Calendar
              </Button>
              <Button 
                className="w-full justify-start font-semibold text-lg py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20" 
                variant="outline"
                onClick={() => {
                  setSidebarOpen(false);
                  setSearchInstructorModalOpen(true);
                }}
              >
                <span className="mr-3 text-xl">👨‍🏫</span>
                Search by Instructor
              </Button>
              <Button 
                className="w-full justify-start font-semibold text-lg py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20" 
                variant="outline"
                onClick={() => {
                  setSidebarOpen(false);
                  setSearchClassroomModalOpen(true);
                }}
              >
                <span className="mr-3 text-xl">🏫</span>
                Search by Classroom
              </Button>
              <Button 
                className="w-full justify-start font-semibold text-lg py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20" 
                variant="outline"
                onClick={() => {
                  setSidebarOpen(false);
                  setStudyPlanModalOpen(true);
                }}
              >
                <span className="mr-3 text-xl">🕒</span>
                Study Schedule Plan
              </Button>
              <Button 
                className="w-full justify-start font-semibold text-lg py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20" 
                variant="outline"
                onClick={() => {
                  setSidebarOpen(false);
                  setClassroomModalOpen(true);
                }}
              >
                <span className="mr-3 text-xl">👁️</span>
                View All Classrooms
              </Button>
            </div>
            
            <div className="mt-auto pt-6 border-t border-white/20">
              <div className="text-center text-sm text-white/70 font-medium">
                Student Portal v1.0
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Add padding-top to account for fixed header */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pt-24">
          {/* Welcome Card */}
          <div className="mb-8 bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-8 relative">
              <div className="flex items-center justify-between">
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold text-black mb-3">
                    Welcome back, {user?.name}! 🎓
                  </h2>
                  <p className="text-gray-600 text-lg font-medium">
                    View your class schedule and find available study spaces in CICT.
                  </p>
                  {user?.department && user?.year && user?.block && (
                    <p className="text-maroon-600 text-sm font-bold mt-2">
                      📚 {user.department} • Year {user.year} • Block {user.block}
                    </p>
                  )}
                </div>
                <div className="text-6xl opacity-20 absolute right-8 top-4 text-maroon-100">🏢</div>
                <div className="relative z-10 text-5xl text-maroon-600">🎯</div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-maroon-800 mb-2">
                  {stats.totalClasses}
                </div>
                <div className="text-sm text-black font-semibold">Total Schedule Items</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Classes & reservations</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-maroon-800 mb-2">
                  {stats.reservations}
                </div>
                <div className="text-sm text-black font-semibold">Room Reservations</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Booked rooms</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-maroon-800 mb-2">
                  {availableRooms.length}
                </div>
                <div className="text-sm text-black font-semibold">Total Rooms</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">All classrooms</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-maroon-800 mb-2">
                  {stats.availableRooms}
                </div>
                <div className="text-sm text-black font-semibold">Available Now</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Ready for study</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Complete Schedule Card - FIXED: Removed extra space at bottom */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col">
              <div className="bg-gradient-to-r from-maroon-50 to-maroon-100 border-b border-gray-200 p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-black text-xl font-bold">
                    <span className="mr-3 text-2xl">📅</span>
                    My Complete Schedule
                    <span className="ml-3 text-sm font-semibold text-maroon-600 bg-gradient-to-r from-maroon-100 to-maroon-200 px-3 py-1.5 rounded-full border border-maroon-200">
                      {stats.totalClasses} items
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setWeeklyCalendarModalOpen(true)}
                    className="font-semibold border-maroon-300 text-maroon-700 hover:bg-maroon-50 hover:border-maroon-400 shadow-sm"
                  >
                    <CalendarRange className="h-4 w-4 mr-2" />
                    Weekly View
                  </Button>
                </div>
              </div>
              <div className="p-6 flex-1">
                {filteredSchedules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 h-full flex flex-col justify-center">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-lg font-semibold mb-2 text-black">No schedule items found</p>
                    <p className="text-sm font-semibold">Check back later for updates</p>
                  </div>
                ) : (
                  <div className="space-y-4 h-[calc(100%-1rem)] overflow-y-auto pr-2">
                    {filteredSchedules.map((schedule) => (
                      <div 
                        key={schedule.uniqueKey || `${schedule.id}-${schedule.is_reservation ? 'reservation' : 'class'}`}
                        className="bg-gradient-to-r from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-black text-lg">
                              {schedule.is_reservation ? (
                                <>
                                  📅 Room Reservation
                                  <span className="ml-2 text-sm font-normal text-gray-600">
                                    ({schedule.reservation_purpose})
                                  </span>
                                </>
                              ) : (
                                `${schedule.course_code} - ${schedule.course_name}`
                              )}
                            </h3>
                            {schedule.is_reservation && schedule.reservation_date ? (
                              <p className="text-sm text-gray-600 font-medium">
                                Reserved on: {formatReservationDate(schedule.reservation_date)}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-600 font-medium">{schedule.course_name}</p>
                            )}
                            {schedule.course && schedule.year && schedule.block && (
                              <p className="text-sm text-maroon-600 font-semibold mt-1">
                                📚 {schedule.course} • Year {schedule.year} • Block {schedule.block}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getDayColor(schedule.day)}`}>
                              {schedule.day.toUpperCase()}
                            </span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewSchedule(schedule)}
                              className="font-semibold border-maroon-200 text-maroon-700 hover:bg-maroon-50"
                            >
                              View
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-3">
                          <div className="font-semibold">
                            <span className="text-gray-500">Time:</span> {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                          </div>
                          <div className="font-semibold">
                            <span className="text-gray-500">Room:</span> {getRoomNumber(schedule)}
                          </div>
                          <div className="font-semibold">
                            <span className="text-gray-500">Building:</span> {getBuilding(schedule)}
                          </div>
                          <div className="font-semibold">
                            <span className="text-gray-500">
                              {schedule.is_reservation ? 'Reserved By:' : 'Instructor:'}
                            </span> {getInstructorName(schedule)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column Cards */}
            <div className="space-y-6">
              {/* Available Classrooms Card */}
              <div className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center text-black text-xl font-bold">
                      <span className="mr-3 text-2xl">🏠</span>
                      Available Classrooms
                      <span className="ml-3 text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-1.5 rounded-full border border-green-200">
                        {stats.availableRooms} available now
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setClassroomModalOpen(true)}
                      className="font-semibold border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {availableRooms
                      .filter(room => room.is_available)
                      .slice(0, 2)
                      .map(room => {
                        const isCurrentlyOccupied = isRoomCurrentlyOccupied(room);
                        const roomReservations = allReservations.filter(res => 
                          res.room_id === room.id && 
                          res.status === 'approved'
                        );

                        return (
                          <div 
                            key={room.id}
                            className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-bold text-black text-lg">
                                  {room.room_number}
                                </h4>
                                <p className="text-sm text-black font-semibold">{room.building}</p>
                              </div>
                              <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${
                                isCurrentlyOccupied 
                                  ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200' 
                                  : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200'
                              }`}>
                                {isCurrentlyOccupied ? 'Occupied' : 'Available'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-3">
                              <div className="font-semibold">
                                <span className="text-gray-500">Capacity:</span> {room.capacity}
                              </div>
                              <div className="font-semibold">
                                <span className="text-gray-500">Type:</span> 
                                <span className="capitalize"> {room.type}</span>
                              </div>
                              {room.equipment && (
                                <div className="col-span-2 font-semibold">
                                  <span className="text-gray-500">Equipment:</span> {room.equipment}
                                </div>
                              )}
                            </div>

                            {/* Reservations count */}
                            <div className="mt-3 pt-3 border-t border-blue-200">
                              <p className="text-xs font-bold text-blue-700">
                                📅 {roomReservations.length} approved reservations
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  
                  {availableRooms.filter(room => room.is_available).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🏫</div>
                      <p className="text-lg font-semibold mb-2 text-black">No available rooms</p>
                      <p className="text-sm font-semibold">All rooms are currently occupied</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Today's Schedule Card */}
              <div className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 p-6">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center text-black text-xl font-bold">
                      <span className="mr-3 text-2xl">⏰</span>
                      Today&apos;s Schedule
                      <span className="ml-3 text-sm font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 px-3 py-1.5 rounded-full border border-amber-200">
                        {todaysSchedules.length} items
                      </span>
                    </CardTitle>
                    <div className="text-sm font-semibold text-amber-700">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {todaysSchedules.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center font-semibold py-4">No schedule items today</p>
                    ) : (
                      todaysSchedules.map((schedule) => (
                        <div key={schedule.uniqueKey || `${schedule.id}-${schedule.is_reservation ? 'reservation' : 'class'}`} className="text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-black">
                              {schedule.is_reservation ? '📅 Reservation' : schedule.course_code}
                            </div>
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              isReservationActive(schedule) 
                                ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200' 
                                : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200'
                            }`}>
                              {isReservationActive(schedule) ? 'ACTIVE NOW' : 'UPCOMING'}
                            </span>
                          </div>
                          <div className="text-gray-600 font-semibold">
                            {formatTime(schedule.start_time)} • {getRoomNumber(schedule)}
                            {schedule.is_reservation && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({schedule.reservation_purpose})
                              </span>
                            )}
                          </div>
                          {schedule.course && schedule.year && schedule.block && (
                            <div className="text-xs text-maroon-600 font-bold mt-1">
                              📚 {schedule.course} • Year {schedule.year} • Block {schedule.block}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
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
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        reservations={calendarReservations}
      />

      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        schedule={selectedSchedule}
      />

      <ClassroomModal
        isOpen={classroomModalOpen}
        onClose={() => setClassroomModalOpen(false)}
        rooms={availableRooms}
        allReservations={allReservations}
      />

      <WeeklyCalendarModal
        isOpen={weeklyCalendarModalOpen}
        onClose={() => setWeeklyCalendarModalOpen(false)}
        schedules={filteredSchedules}
      />

      <StudyPlanModal
        isOpen={studyPlanModalOpen}
        onClose={() => setStudyPlanModalOpen(false)}
      />

      <SearchInstructorModal
        isOpen={searchInstructorModalOpen}
        onClose={() => setSearchInstructorModalOpen(false)}
        instructors={allInstructors}
        reservations={allReservations}
      />

      <SearchClassroomModal
        isOpen={searchClassroomModalOpen}
        onClose={() => setSearchClassroomModalOpen(false)}
        rooms={availableRooms}
        allReservations={allReservations}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={userProfile}
        onChangePassword={handleChangePassword}
      />
    </div>
  );
}