'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import { User, Room, Reservation } from '@/types';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  History, 
  User as UserIcon,
  LogOut,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Edit,
  Trash2} from 'lucide-react';

interface UserFormData {
  name: string;
  email: string;
  role: string;
  student_id: string;
  department: string;
  year: string;
  block: string;
  password: string;
  password_confirmation: string;
}

interface RoomFormData {
  room_number: string;
  building: string;
  capacity: number;
  type: string;
  equipment: string;
  is_available: boolean;
}

interface DeleteItem {
  type: string;
  id: number;
  name: string;
}

interface ReservationAction {
  type: 'approve' | 'reject';
  reservationId: number;
  userName: string;
  roomNumber: string;
  building: string;
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

interface UserLog {
  id: number;
  action_time: string;
  action_type: string;
  table_name: string;
  record_id: number | null;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
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

// Helper function to get block options
const getBlockOptions = (course: string, year: string): string[] => {
  if (!course || !year) return [];
  
  // BSIT has 5 blocks for each year
  if (course === 'BS in Information Technology') {
    return ['1', '2', '3', '4', '5'];
  } 
  // Other courses have only 2 blocks
  else {
    return ['1', '2'];
  }
};
// Add new modal components
const PasswordMismatchModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex items-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-maroon-100 to-maroon-200 rounded-full flex items-center justify-center mr-4 shadow-md">
            <AlertCircle className="text-maroon-800 text-2xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Password Mismatch</h2>
            <p className="text-gray-600 mt-1 font-medium">Please check your password fields</p>
          </div>
        </div>
        
        <p className="mb-6 text-black text-lg font-medium bg-maroon-50 p-4 rounded-xl border border-maroon-100">
          The passwords you entered do not match. Please make sure both password fields contain the same value.
        </p>
        
        <div className="flex justify-end">
          <Button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
          >
            OK, I understand
          </Button>
        </div>
      </div>
    </div>
  );
};

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
    info: 'bg-gradient-to-r from-maroon-500 to-maroon-600'
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
                  System Administrator
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

const UserModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  user,
  error,
  saving,
  existingUsers
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: UserFormData) => void; 
  user?: User;
  error: string;
  saving: boolean;
  existingUsers: User[];
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'student',
    student_id: '',
    department: '',
    year: '',
    block: '',
    password: '',
    password_confirmation: ''
  });
  const [showPasswordFields, setShowPasswordFields] = useState(!user);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [studentIdError, setStudentIdError] = useState('');
  const [passwordMismatchModalOpen, setPasswordMismatchModalOpen] = useState(false);

  // Year options
  const yearOptions = ['1', '2', '3', '4'];
  
  // Get block options based on current course and year
  const currentBlockOptions = getBlockOptions(formData.department, formData.year);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        student_id: user.student_id || '',
        department: user.department || '',
        year: user.year || '',
        block: user.block || '',
        password: '',
        password_confirmation: ''
      });
      setShowPasswordFields(false);
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'student',
        student_id: '',
        department: '',
        year: '',
        block: '',
        password: '',
        password_confirmation: ''
      });
      setShowPasswordFields(true);
    }
    setEmailError('');
    setStudentIdError('');
  }, [user, isOpen]);

  const validateEmail = (email: string, role: string): boolean => {
    if (role === 'student') {
      return email.endsWith('@student.cict.edu.ph');
    } else if (role === 'instructor') {
      return email.endsWith('@cict.edu.ph');
    }
    return true;
  };

  const checkEmailExists = (email: string): boolean => {
    const emailToCheck = email.toLowerCase().trim();
    return existingUsers.some(existingUser => {
      if (user && existingUser.id === user.id) {
        return false;
      }
      return existingUser.email.toLowerCase().trim() === emailToCheck;
    });
  };

  const checkStudentIdExists = (studentId: string): boolean => {
    if (!studentId.trim()) return false;
    
    const studentIdToCheck = studentId.trim();
    return existingUsers.some(existingUser => {
      if (user && existingUser.id === user.id) {
        return false;
      }
      return existingUser.student_id?.trim() === studentIdToCheck;
    });
  };

  const handleEmailChange = (email: string) => {
    const newEmail = email.trim();
    setFormData({ ...formData, email: newEmail });
    
    setEmailError('');
    
    if (newEmail && !validateEmail(newEmail, formData.role)) {
      if (formData.role === 'student') {
        setEmailError('Student email must end with @student.cict.edu.ph');
      } else if (formData.role === 'instructor') {
        setEmailError('Instructor email must end with @cict.edu.ph');
      }
      return;
    }
    
    if (newEmail && checkEmailExists(newEmail)) {
      setEmailError('Email address is already registered');
    }
  };

  const handleStudentIdChange = (studentId: string) => {
    const newStudentId = studentId.trim();
    setFormData({ ...formData, student_id: newStudentId });
    setStudentIdError('');
    
    if (formData.role === 'student' && newStudentId && checkStudentIdExists(newStudentId)) {
      setStudentIdError('Student ID is already registered');
    }
  };

  const handleRoleChange = (role: string) => {
    const newFormData = { ...formData, role };
    setFormData(newFormData);
    
    setEmailError('');
    setStudentIdError('');
    
    if (formData.email && !validateEmail(formData.email, role)) {
      if (role === 'student') {
        setEmailError('Student email must end with @student.cict.edu.ph');
      } else if (role === 'instructor') {
        setEmailError('Instructor email must end with @cict.edu.ph');
      }
    }
    
    if (formData.email && checkEmailExists(formData.email)) {
      setEmailError('Email address is already registered');
    }
    
    if (role !== 'student') {
      newFormData.student_id = '';
      newFormData.year = '';
      newFormData.block = '';
    }
    
    if (role === 'instructor') {
      newFormData.department = 'CICT';
    } else if (role === 'student' && !newFormData.department) {
      newFormData.department = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setEmailError('');
    setStudentIdError('');
    
    let hasError = false;
    
    if (!validateEmail(formData.email, formData.role)) {
      if (formData.role === 'student') {
        setEmailError('Student email must end with @student.cict.edu.ph');
      } else if (formData.role === 'instructor') {
        setEmailError('Instructor email must end with @cict.edu.ph');
      }
      hasError = true;
    }
    
    if (checkEmailExists(formData.email)) {
      setEmailError('Email address is already registered');
      hasError = true;
    }
    
    if (formData.role === 'student' && formData.student_id.trim() && checkStudentIdExists(formData.student_id)) {
      setStudentIdError('Student ID is already registered');
      hasError = true;
    }
    
    // Validate year and block for students
    if (formData.role === 'student') {
      if (!formData.year.trim()) {
        alert('Year level is required for students');
        return;
      }
      if (!formData.block.trim()) {
        alert('Block is required for students');
        return;
      }
      if (!currentBlockOptions.includes(formData.block)) {
        alert(`Invalid block selection. Valid blocks for ${formData.department} Year ${formData.year} are: ${currentBlockOptions.join(', ')}`);
        return;
      }
    }
    
    if (showPasswordFields) {
      if (formData.password !== formData.password_confirmation) {
        setPasswordMismatchModalOpen(true);
        return;
      }
      
      if (!user && formData.password.length < 6) {
        alert('Password must be at least 6 characters long!');
        return;
      }
    }
    
    if (hasError) {
      return;
    }
    
    onSave(formData);
  };

  const togglePasswordFields = () => {
    setShowPasswordFields(!showPasswordFields);
    if (showPasswordFields) {
      setFormData({
        ...formData,
        password: '',
        password_confirmation: ''
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const isEditingAdmin = user?.role === 'admin';

  const getEmailPlaceholder = () => {
    switch (formData.role) {
      case 'student':
        return 'username@student.cict.edu.ph';
      case 'instructor':
        return 'username@cict.edu.ph';
      default:
        return 'email@example.com';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 text-black">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-semibold">
              {error}
            </div>
          )}
          {isEditingAdmin && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <p className="text-yellow-800 text-sm font-semibold">
                  <strong>Admin User:</strong> Role cannot be changed for administrator accounts.
                </p>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Full Name *</label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Email *</label>
              <input
                type="email"
                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium ${
                  emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder={getEmailPlaceholder()}
                required
              />
              {emailError && (
                <p className="text-red-600 text-sm mt-2 font-semibold">{emailError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-3">Role *</label>
              {isEditingAdmin ? (
                <div className="w-full p-3 border border-gray-300 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-semibold">
                  Administrator (Cannot be changed)
                </div>
              ) : (
                <select
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                </select>
              )}
            </div>
            {formData.role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-black mb-3">Student ID *</label>
                  <input
                    type="text"
                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium ${
                      studentIdError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    value={formData.student_id}
                    onChange={(e) => handleStudentIdChange(e.target.value)}
                    required
                  />
                  {studentIdError && (
                    <p className="text-red-600 text-sm mt-2 font-semibold">{studentIdError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-3">Course *</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value, block: '' })}
                    required
                  >
                    <option value="">Select course</option>
                    <option value="BS in Computer Science">BS in Computer Science</option>
                    <option value="BS in Information Technology">BS in Information Technology</option>
                    <option value="BS in Information Systems">BS in Information Systems</option>
                    <option value="BTVTED - Computer System Servicing">BTVTED - Computer System Servicing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-3">Year Level *</label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value, block: '' })}
                    required
                  >
                    <option value="">Select year</option>
                    {yearOptions.map(year => (
                      <option key={year} value={year}>Year {year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-3">Block/Section *</label>
                  <select
                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium ${
                      !formData.department || !formData.year ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    value={formData.block}
                    onChange={(e) => setFormData({ ...formData, block: e.target.value })}
                    required
                    disabled={!formData.department || !formData.year}
                  >
                    <option value="">
                      {formData.department && formData.year 
                        ? 'Select block' 
                        : 'Select course and year first'
                      }
                    </option>
                    {currentBlockOptions.map(block => (
                      <option key={block} value={block}>Block {block}</option>
                    ))}
                  </select>
                  {formData.department && formData.year && (
                    <p className="text-sm text-gray-600 mt-2 font-semibold bg-gradient-to-r from-gray-50 to-maroon-50 p-2 rounded-lg">
                      {formData.department === 'BS in Information Technology'
                        ? `BSIT Year ${formData.year} has 5 blocks`
                        : `${formData.department} Year ${formData.year} has 2 blocks`
                      }
                    </p>
                  )}
                </div>
              </>
            )}
            {formData.role === 'instructor' && (
              <div>
                <label className="block text-sm font-semibold text-black mb-3">Department</label>
                <div className="w-full p-3 border border-gray-300 rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-semibold">
                  CICT (Automatically set for instructors)
                </div>
              </div>
            )}
            {user && (
              <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-maroon-50 p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="changePassword"
                  checked={showPasswordFields}
                  onChange={togglePasswordFields}
                  className="rounded focus:ring-2 focus:ring-maroon-600 h-4 w-4"
                />
                <label htmlFor="changePassword" className="text-sm font-semibold text-black">
                  Change Password
                </label>
              </div>
            )}
            {showPasswordFields && (
              <>
                <div className="relative">
                  <label className="block text-sm font-semibold text-black mb-3">
                    Password {user ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium pr-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={6}
                    required={!user}
                    placeholder={user ? "Enter new password" : "Enter password"}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-11 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-black mb-3">
                    Confirm Password {user ? '' : '*'}
                  </label>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium pr-10"
                    value={formData.password_confirmation}
                    onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                    minLength={6}
                    required={!user}
                    placeholder={user ? "Confirm new password" : "Confirm password"}
                  />
                  <button
                    type="button"
                    onClick={toggleConfirmPasswordVisibility}
                    className="absolute right-3 top-11 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </>
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
                disabled={saving || !!emailError || !!studentIdError}
                className="px-6 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : user ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <PasswordMismatchModal
        isOpen={passwordMismatchModalOpen}
        onClose={() => setPasswordMismatchModalOpen(false)}
      />
    </>
  );
};

const RoomModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  room,
  error,
  saving
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: RoomFormData) => void; 
  room?: Room;
  error: string;
  saving: boolean;
}) => {
  const [formData, setFormData] = useState<RoomFormData>({
    room_number: '',
    building: '',
    capacity: 30,
    type: 'classroom',
    equipment: '',
    is_available: true
  });

  useEffect(() => {
    if (room) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        room_number: room.room_number,
        building: room.building,
        capacity: room.capacity,
        type: room.type,
        equipment: room.equipment,
        is_available: room.is_available
      });
    } else {
      setFormData({
        room_number: '',
        building: '',
        capacity: 30,
        type: 'classroom',
        equipment: '',
        is_available: true
      });
    }
  }, [room, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <h2 className="text-2xl font-bold mb-6 text-black">
          {room ? 'Edit Room' : 'Add New Room'}
        </h2>
        
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-semibold">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Room Number *</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.room_number}
              onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Building *</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Capacity *</label>
            <input
              type="number"
              min="1"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Room Type *</label>
            <select
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="classroom">Classroom</option>
              <option value="lab">Lab</option>
              <option value="conference">Conference Room</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">Equipment</label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-600 focus:border-transparent shadow-sm font-medium"
              value={formData.equipment}
              onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
              placeholder="List equipment available in this room..."
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-maroon-50 p-3 rounded-xl">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="rounded focus:ring-2 focus:ring-maroon-600 h-4 w-4"
            />
            <label htmlFor="is_available" className="text-sm font-semibold text-black">
              Available for reservation
            </label>
          </div>
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
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : room ? 'Update Room' : 'Create Room'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemType,
  itemName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  itemType: string;
  itemName: string;
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
            <h2 className="text-2xl font-bold text-black">Confirm Delete</h2>
            <p className="text-gray-600 mt-1 font-medium">This action cannot be undone.</p>
          </div>
        </div>
        
        <p className="mb-6 text-black text-lg font-medium bg-red-50 p-4 rounded-xl border border-red-100">
          Are you sure you want to delete {itemType} <strong>&quot;{itemName}&quot;</strong>?
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
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

const ResetPasswordModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  userName: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex items-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mr-4 shadow-md">
            <RefreshCw className="text-blue-600 text-2xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">Reset Password</h2>
            <p className="text-gray-600 mt-1 font-medium">Password will be reset to &quot;password&quot;</p>
          </div>
        </div>
        
        <p className="mb-6 text-black text-lg font-medium bg-blue-50 p-4 rounded-xl border border-blue-100">
          Are you sure you want to reset password for <strong>&quot;{userName}&quot;</strong>?
          The new password will be set to <strong>&quot;password&quot;</strong>.
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
            onClick={onConfirm} 
            className="px-6 py-3 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
          >
            Reset Password
          </Button>
        </div>
      </div>
    </div>
  );
};

const ReservationActionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  action 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  action: ReservationAction | null;
}) => {
  if (!isOpen || !action) return null;

  const { type, userName, roomNumber, building } = action;

  const getActionColor = () => {
    return type === 'approve' ? 'text-green-600' : 'text-red-600';
  };

  const getActionIcon = () => {
    return type === 'approve' ? '✅' : '❌';
  };

  const getActionText = () => {
    return type === 'approve' ? 'Approve' : 'Reject';
  };

  const getButtonVariant = () => {
    return type === 'approve' ? 'default' : 'destructive';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200">
        <h2 className={`text-2xl font-bold mb-6 ${getActionColor()}`}>
          {getActionIcon()} Confirm {getActionText()}
        </h2>
        <p className="mb-6 text-black text-lg font-medium bg-gradient-to-r from-gray-50 to-maroon-50 p-4 rounded-xl border border-gray-200">
          Are you sure you want to {type} the reservation for <strong>&quot;{userName}&quot;</strong> in room <strong>&quot;{roomNumber} - {building}&quot;</strong>?
          {type === 'reject' && ' This action cannot be undone.'}
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
            variant={getButtonVariant()} 
            onClick={onConfirm}
            className={`px-6 py-3 font-semibold shadow-lg ${
              type === 'approve' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white'
            }`}
          >
            {getActionText()} Reservation
          </Button>
        </div>
      </div>
    </div>
  );
};

// Format time  string from "HH:MM:SS" to "HH:MM AM/PM" without seconds
const formatTimeDisplay = (timeString: string): string => {
  if (!timeString) return '';
  
  // Remove seconds if present
  const timeParts = timeString.split(':');
  const hours = parseInt(timeParts[0]);
  const minutes = timeParts[1] || '00';
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')} ${period}`;
};

// Calendar View Component with Room Schedule Grid
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
    { time: '7AM', hour: 7, display: '7:00 AM', timeLabel: '7AM' },
    { time: '8AM', hour: 8, display: '8:00 AM', timeLabel: '8AM' },
    { time: '9AM', hour: 9, display: '9:00 AM', timeLabel: '9AM' },
    { time: '10AM', hour: 10, display: '10:00 AM', timeLabel: '10AM' },
    { time: '11AM', hour: 11, display: '11:00 AM', timeLabel: '11AM' },
    { time: '12PM', hour: 12, display: '12:00 PM', timeLabel: '12PM' },
    { time: '1PM', hour: 13, display: '1:00 PM', timeLabel: '1PM' },
    { time: '2PM', hour: 14, display: '2:00 PM', timeLabel: '2PM' },
    { time: '3PM', hour: 15, display: '3:00 PM', timeLabel: '3PM' },
    { time: '4PM', hour: 16, display: '4:00 PM', timeLabel: '4PM' },
    { time: '5PM', hour: 17, display: '5:00 PM', timeLabel: '5PM' },
    { time: '6PM', hour: 18, display: '6:00 PM', timeLabel: '6PM' },
    { time: '7PM', hour: 19, display: '7:00 PM', timeLabel: '7PM' },
    { time: '8PM', hour: 20, display: '8:00 PM', timeLabel: '8PM' }
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
    
    // Filter approved reservations for the selected date
    const filteredReservations = reservations.filter(res => {
      const reservationDate = new Date(res.date);
      const selectedDateObj = new Date(date);
      
      // Compare dates ignoring time
      return reservationDate.toDateString() === selectedDateObj.toDateString() && res.status === 'approved';
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
    
    // Fill schedule with reservations
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
                    return reservationDate.getTime() === dateToCheck.getTime() && res.status === 'approved';
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
                        {dayReservations.slice(0, 2).map(res => (
                          <div 
                            key={res.id} 
                            className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-1 py-0.5 rounded truncate font-medium"
                            title={`${res.room_number}: ${res.start_time}-${res.end_time}`}
                          >
                            {res.room_number}
                          </div>
                        ))}
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
                  <p className="text-gray-600 font-semibold">Click on a date to view reservations</p>
                </div>
              ) : selectedDateReservations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 text-green-500">✅</div>
                  <p className="text-lg font-semibold text-gray-600 mb-2">No reservations</p>
                  <p className="text-sm text-gray-500 font-medium">No bookings for this date</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {selectedDateReservations.map(reservation => (
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
                            {formatTimeDisplay(reservation.start_time)} - {formatTimeDisplay(reservation.end_time)}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 text-xs font-semibold rounded capitalize">
                          {reservation.user_role}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Room Schedule Grid - Show ALL rooms */}
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
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="w-24 min-w-[6rem] p-3 bg-gradient-to-r from-blue-50 to-blue-100 text-center font-bold text-blue-900 text-sm border-b-2 border-blue-200 sticky left-0 z-10">
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
                      // Get all reservations for this time slot
                      const slotReservations: {[key: string]: CalendarReservation | null} = {};
                      
                      allRooms.forEach(room => {
                        slotReservations[room] = getReservationForRoom(room, slot.hour);
                      });
                      
                      // Check if this slot has any reservations
                      const hasReservations = Object.values(slotReservations).some(res => res !== null);
                      
                      return (
                        <tr key={slot.time} className="border-b border-gray-200">
                          <td className="w-24 min-w-[6rem] p-3 bg-gradient-to-r from-gray-50 to-gray-100 text-center font-semibold text-black align-top sticky left-0 z-10">
                            {slot.timeLabel}
                          </td>
                          
                          {allRooms.map(room => {
                            const reservation = slotReservations[room];
                            
                            // Only show reservation if it starts at this hour
                            if (!reservation || !isFirstHourOfReservation(room, slot.hour, reservation)) {
                              return (
                                <td key={`${room}-${slot.hour}`} className="flex-1 min-w-[14rem] p-3 align-top">
                                  <div className="h-20"></div>
                                </td>
                              );
                            }
                            
                            return (
                              <td key={`${room}-${slot.hour}`} className="flex-1 min-w-[14rem] p-3 align-top">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 shadow-sm h-20">
                                  <div className="space-y-1">
                                    <div className="font-bold text-green-900 text-xs">
                                      {formatTimeDisplay(reservation.start_time)} - {formatTimeDisplay(reservation.end_time)}
                                    </div>
                                    {reservation.year && reservation.block && (
                                      <div className="text-xs font-bold text-green-700">
                                        Block {reservation.block}
                                      </div>
                                    )}
                                    <div className="text-xs font-semibold text-green-600 truncate">
                                      {reservation.user_name}
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
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded"></div>
                    <span className="text-xs text-gray-600 font-medium">Reserved</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                    <span className="text-xs text-gray-600 font-medium">Available</span>
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

// LogsModal Component
const LogsModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    actionType: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const actionTypeColors: Record<string, string> = {
    'LOGIN': 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200',
    'LOGOUT': 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200',
    'INSERT': 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200',
    'UPDATE': 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200',
    'DELETE': 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200',
    'APPROVE': 'bg-gradient-to-r from-green-100 to-lime-100 text-green-800 border-green-200',
    'REJECT': 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200',
    'CANCEL': 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200',
    
  };

  const actionTypeIcons: Record<string, string> = {
    'LOGIN': '🔐',
    'LOGOUT': '🚪',
    'INSERT': '➕',
    'UPDATE': '✏️',
    'DELETE': '🗑️',
    'APPROVE': '✅',
    'REJECT': '❌',
    'CANCEL': '⏹️',
    
  };

  const getActionTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'LOGIN': 'Login',
      'LOGOUT': 'Logout',
      'INSERT': 'Create',
      'UPDATE': 'Update',
      'DELETE': 'Delete',
      'APPROVE': 'Approve',
      'REJECT': 'Reject',
      'CANCEL': 'Cancel',
     
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.search) params.append('search', filters.search);
      
      const queryString = params.toString();
      const url = queryString ? `/api/user-logs?${queryString}` : '/api/user-logs';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('❌ Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      actionType: '',
      search: ''
    });
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLogs();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [filters]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center shadow-lg mr-4">
              <History className="text-white text-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black">System Activity Logs</h2>
              <p className="text-gray-600 mt-1 font-medium">Track all user activities and system events</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center font-semibold border-gray-300 hover:border-gray-400 text-black"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
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
        {showFilters && (
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-maroon-50 rounded-xl border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Date From</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-600 focus:border-transparent font-medium"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Date To</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-600 focus:border-transparent font-medium"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Action Type</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-600 focus:border-transparent font-medium"
                  value={filters.actionType}
                  onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN">Login</option>
                  <option value="LOGOUT">Logout</option>
                  <option value="INSERT">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                  <option value="APPROVE">Approve</option>
                  <option value="REJECT">Reject</option>
                  <option value="CANCEL">Cancel</option>
                 
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-black mb-2">Search</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-600 focus:border-transparent font-medium"
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-10 px-3 font-semibold border-gray-300 hover:border-gray-400 text-black"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">Loading activity logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 text-gray-300">📝</div>
              <p className="text-lg font-semibold text-gray-600 mb-2">No activity logs found</p>
              <p className="text-sm text-gray-500 font-medium">Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 bg-white backdrop-blur-sm shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${actionTypeColors[log.action_type] || 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'}`}>
                        <span className="text-sm">
                          {actionTypeIcons[log.action_type] || '📝'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${actionTypeColors[log.action_type] || 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'}`}>
                            {getActionTypeLabel(log.action_type)}
                          </span>
                          {log.table_name && (
                            <span className="text-xs text-gray-500 font-semibold bg-gradient-to-r from-gray-100 to-gray-200 px-2 py-1 rounded">
                              {log.table_name}
                            </span>
                          )}
                          {log.record_id && (
                            <span className="text-xs text-blue-600 font-semibold bg-gradient-to-r from-blue-50 to-blue-100 px-2 py-1 rounded">
                              ID: {log.record_id}
                            </span>
                          )}
                        </div>
                        <p className="text-black font-semibold mt-2">{log.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-sm font-medium">
                        {formatDate(log.action_time)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    {log.user_name && (
                      <div className="flex items-center">
                        <div className="font-semibold">{log.user_name}</div>
                        {log.user_email && (
                          <div className="text-xs text-gray-500 ml-2 font-medium">{log.user_email}</div>
                        )}
                        {log.user_role && (
                          <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 rounded-full capitalize ml-2 font-semibold">
                            {log.user_role}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {log.ip_address && (
                      <div className="flex items-center">
                        <div className="font-semibold">IP: {log.ip_address}</div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <div className="font-semibold">
                        {new Date(log.action_time).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="pt-6 mt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 font-semibold">
              Showing {logs.length} log entries
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="font-semibold border-gray-300 hover:border-gray-400 text-black"
              >
                Close
              </Button>
              <Button 
                onClick={fetchLogs}
                className="bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [reservationActionModalOpen, setReservationActionModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [itemToDelete, setItemToDelete] = useState<DeleteItem | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [reservationAction, setReservationAction] = useState<ReservationAction | null>(null);
  const [calendarReservations, setCalendarReservations] = useState<CalendarReservation[]>([]);
  const [userError, setUserError] = useState('');
  const [roomError, setRoomError] = useState('');
  const [saving, setSaving] = useState(false);

  const { user, logout } = useAuth();
  const router = useRouter();

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
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching admin dashboard data...');
      
      const [reservationsRes, roomsRes, usersRes] = await Promise.all([
        api.get<{ data: Reservation[] }>('/api/reservations'),
        api.get<{ data: Room[] }>('/api/rooms'),
        api.get<{ data: User[] }>('/api/users')
      ]);
      
      const allReservations = reservationsRes.data || [];
      console.log('🎯 All reservations fetched:', allReservations);

      const pendingReservations = Array.isArray(allReservations) 
        ? allReservations.filter((r: Reservation) => r.status === 'pending')
        : [];

      console.log('📈 Final pending reservations count:', pendingReservations.length);
      
      // Transform reservations for calendar
      const calendarRes = allReservations.map((res: Reservation) => ({
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
      
      setPendingReservations(pendingReservations);
      setRooms(roomsRes.data || []);
      setUsers(usersRes.data || []);
      setCalendarReservations(calendarRes);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reservation Actions
  const handleReservationActionClick = (reservationId: number, type: 'approve' | 'reject', reservation: Reservation) => {
    const userName = reservation.user?.name || `User ID: ${reservation.user_id}`;
    const roomNumber = reservation.room?.room_number || 'Unknown Room';
    const building = reservation.room?.building || 'Unknown Building';
    
    setReservationAction({
      type,
      reservationId,
      userName,
      roomNumber,
      building
    });
    setReservationActionModalOpen(true);
  };

  const handleReservationActionConfirm = async () => {
    if (!reservationAction) return;
    
    try {
      console.log(`🔄 Updating reservation ${reservationAction.reservationId} to ${reservationAction.type}`);
      
      await api.patch(`/api/reservations/${reservationAction.reservationId}/status`, { 
        status: reservationAction.type === 'approve' ? 'approved' : 'rejected',
        admin_notes: reservationAction.type === 'approve' 
          ? 'Reservation approved by admin' 
          : 'Reservation rejected by admin'
      });
      
      setPendingReservations(prev => 
        prev.filter(reservation => reservation.id !== reservationAction.reservationId)
      );
      
      // Update calendar reservations
      setCalendarReservations(prev =>
        prev.map(res =>
          res.id === reservationAction.reservationId
            ? { ...res, status: reservationAction.type === 'approve' ? 'approved' : 'rejected' }
            : res
        )
      );
      
      const toastType = reservationAction.type === 'approve' ? 'success' : 'error';
      showToast(`Reservation ${reservationAction.type} successfully`, toastType);
      setReservationActionModalOpen(false);
      setReservationAction(null);
    } catch (error: unknown) {
      console.error('Error updating reservation:', error);
      const apiError = error as ApiErrorResponse;
      const errorMessage = apiError.response?.data?.error || apiError.message || 'Failed to update reservation';
      showToast(errorMessage, 'error');
    }
  };

  // Room Actions
  const handleAddRoom = () => {
    setSelectedRoom(null);
    setRoomError('');
    setRoomModalOpen(true);
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setRoomError('');
    setRoomModalOpen(true);
  };

  const handleSaveRoom = async (roomData: RoomFormData) => {
    setSaving(true);
    try {
      setRoomError('');
      if (selectedRoom) {
        const response = await api.patch<{ data: Room }>(`/api/rooms/${selectedRoom.id}`, roomData);
        setRooms(prev => 
          prev.map(room => room.id === selectedRoom.id ? response.data : room)
        );
        showToast('Room updated successfully', 'info');
      } else {
        const response = await api.post<{ data: Room }>('/api/rooms', roomData);
        setRooms(prev => [...prev, response.data]);
        showToast('Room created successfully', 'success');
      }
      setRoomModalOpen(false);
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      const errorData = apiError.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Failed to save room. Please try again.';
      setRoomError(errorMessage);
      showToast('Failed to save room', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRoomAvailability = async (roomId: number, currentStatus: boolean) => {
    try {
      const response = await api.patch<{ data: Room }>(`/api/rooms/${roomId}`, {
        is_available: !currentStatus
      });
      setRooms(prev => 
        prev.map(room => room.id === roomId ? response.data : room)
      );
      showToast(`Room ${!currentStatus ? 'made available' : 'made unavailable'}`, 'info');
    } catch (error) {
      console.error('Error updating room:', error);
      showToast('Failed to update room availability', 'error');
    }
  };

  // User Actions
  const handleAddUser = () => {
    setSelectedUser(null);
    setUserError('');
    setUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserError('');
    setUserModalOpen(true);
  };

  const handleSaveUser = async (userData: UserFormData) => {
    setSaving(true);
    try {
      setUserError('');
      const processedData = {
        ...userData,
        department: userData.role === 'instructor' ? 'CICT' : userData.department
      };
      
      if (selectedUser) {
        const updateData: Partial<UserFormData> = {
          name: processedData.name,
          email: processedData.email,
          role: processedData.role,
          student_id: processedData.student_id,
          department: processedData.department,
          year: processedData.year,
          block: processedData.block
        };
        
        if (processedData.password && processedData.password.trim() !== '') {
          updateData.password = processedData.password;
          updateData.password_confirmation = processedData.password_confirmation;
        }
        
        const response = await api.patch<{ data: User }>(`/api/users/${selectedUser.id}`, updateData);
        setUsers(prev => 
          prev.map(user => user.id === selectedUser.id ? response.data : user)
        );
        showToast('User updated successfully', 'info');
      } else {
        const response = await api.post<{ data: User }>('/api/users', processedData);
        setUsers(prev => [...prev, response.data]);
        showToast('User created successfully', 'success');
      }
      
      setUserModalOpen(false);
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      const errorData = apiError.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Failed to save user. Please try again.';
      setUserError(errorMessage);
      showToast('Failed to save user', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset Password 
  const handleResetPasswordClick = (user: User) => {
    setUserToResetPassword(user);
    setResetPasswordModalOpen(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!userToResetPassword) return;
    
    try {
      await api.patch(`/api/users/${userToResetPassword.id}`, {
        password: 'password',
        password_confirmation: 'password'
      });
      
      showToast(`Password reset to "password" for ${userToResetPassword.name}`, 'success');
      setResetPasswordModalOpen(false);
      setUserToResetPassword(null);
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      const errorMessage = apiError.response?.data?.message || apiError.message || 'Failed to reset password';
      showToast(errorMessage, 'error');
    }
  };

  const handleDeleteClick = (type: string, id: number, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'user') {
        await api.delete(`/api/users/${itemToDelete.id}`);
        setUsers(prev => prev.filter(user => user.id !== itemToDelete.id));
        showToast('User deleted successfully', 'error');
      } else if (itemToDelete.type === 'room') {
        await api.delete(`/api/rooms/${itemToDelete.id}`);
        setRooms(prev => prev.filter(room => room.id !== itemToDelete.id));
        showToast('Room deleted successfully', 'error');
      }
      
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      const errorData = apiError.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Failed to delete. Please try again.';
      showToast(errorMessage, 'error');
    }
  };

  const handleChangePassword = async (passwordData: ChangePasswordData) => {
    try {
      await api.put('/api/auth/change-password', passwordData);
      showToast('Password changed successfully', 'success');
      setProfileModalOpen(false);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-maroon-100 to-maroon-200 text-maroon-800 border-maroon-200';
      case 'instructor':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200';
      case 'student':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return '👑';
      case 'instructor':
        return '👨‍🏫';
      case 'student':
        return '🎓';
      default:
        return '👤';
    }
  };

  const isAdminUser = (userItem: User) => userItem.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-gray-100/[0.02] bg-[size:60px_60px]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-maroon-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-maroon-100 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-black font-semibold">Loading admin dashboard...</p>
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
                    Admin <span className="text-white">Portal</span>
                  </h1>
                  <p className="text-sm text-maroon-100 font-semibold">System Administration Dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right hidden sm:block">
                  {/* admin info */}
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

                  {/* Activity Logs Button */}
                  <Button 
                    onClick={() => setLogsModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-maroon-200 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold shadow-sm"
                    title="View Activity Logs"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Activity Logs
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
                    Welcome, System Administrator! 👑
                  </h2>
                  <p className="text-gray-600 text-lg font-semibold">
                    Manage reservations, rooms, users, and monitor system activities.
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
                  {pendingReservations.length}
                </div>
                <div className="text-sm text-black font-semibold">Pending Reservations</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Awaiting approval</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-maroon-800 mb-2">
                  {rooms.length}
                </div>
                <div className="text-sm text-black font-semibold">Total Rooms</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">All locations</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-green-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {users.length}
                </div>
                <div className="text-sm text-black font-semibold">Total Users</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">System users</div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-orange-300 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {rooms.filter(r => r.is_available).length}
                </div>
                <div className="text-sm text-black font-semibold">Available Rooms</div>
                <div className="text-xs text-gray-500 mt-1 font-medium">Ready for booking</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pending Reservations Section */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="bg-gradient-to-r from-maroon-50 to-maroon-100 border-b border-gray-200 p-6">
                <div className="flex items-center text-black text-xl font-bold">
                  <span className="mr-3 text-2xl">⏳</span>
                  Pending Reservations
                  <span className="ml-3 text-sm font-semibold bg-gradient-to-r from-maroon-100 to-maroon-200 text-maroon-800 px-3 py-1.5 rounded-full">
                    {pendingReservations.length} pending
                  </span>
                </div>
              </div>
              <div className="p-6">
                {pendingReservations.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-6xl mb-4 text-green-500/50">✅</div>
                    <p className="text-lg font-semibold mb-2 text-black">No pending reservations</p>
                    <p className="text-sm font-semibold">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {pendingReservations.map((reservation) => (
                      <div 
                        key={reservation.id} 
                        className="bg-gradient-to-r from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-black text-lg">
                              {reservation.room?.room_number} - {reservation.room?.building}
                            </h3>
                            <p className="text-sm text-black font-semibold">
                              By: {reservation.user?.name || `User ID: ${reservation.user_id}`}
                            </p>
                            {reservation.user && (
                              <div className="text-xs text-gray-500 mt-1 font-semibold">
                                {reservation.user.email}
                                {reservation.user.student_id && ` • ID: ${reservation.user.student_id}`}
                                {reservation.user.department && ` • ${reservation.user.department}`}
                                {reservation.user.year && reservation.user.block && ` • Year ${reservation.user.year} Block ${reservation.user.block}`}
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(reservation.user.role)}`}>
                                  {reservation.user.role}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="px-3 py-1.5 bg-gradient-to-r from-maroon-100 to-maroon-200 text-maroon-800 text-xs font-semibold rounded-full border border-maroon-200">
                            Pending
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm text-black mb-3">
                          <div className="font-semibold">
                            <span className="text-gray-500">Date:</span> {reservation.date}
                          </div>
                          <div className="font-semibold">
                            <span className="text-gray-500">Time:</span> {formatTimeDisplay(reservation.start_time)} - {formatTimeDisplay(reservation.end_time)}
                          </div>
                        </div>
                        
                        <p className="text-sm text-black font-semibold">
                          <span className="text-gray-500">Purpose:</span> {reservation.purpose}
                        </p>
                        
                        <div className="flex space-x-2 mt-4">
                          <Button 
                            size="sm" 
                            onClick={() => handleReservationActionClick(reservation.id, 'approve', reservation)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleReservationActionClick(reservation.id, 'reject', reservation)}
                            className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-md"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Room Management Section */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 p-6">
                <div className="flex items-center text-black text-xl font-bold">
                  <span className="mr-3 text-2xl">🏠</span>
                  Room Management
                  <span className="ml-3 text-sm font-semibold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 px-3 py-1.5 rounded-full">
                    {rooms.length} rooms
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {rooms.map((room) => (
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
                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                          room.is_available 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200' 
                            : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200'
                        }`}>
                          {room.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-black mb-3">
                        <div className="font-semibold">
                          <span className="text-gray-500">Capacity:</span> {room.capacity}
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
                      
                      <div className="flex space-x-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 font-semibold border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400 shadow-sm"
                          onClick={() => handleEditRoom(room)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 font-semibold border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400 shadow-sm"
                          onClick={() => handleToggleRoomAvailability(room.id, room.is_available)}
                        >
                          {room.is_available ? 'Make Unavailable' : 'Make Available'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteClick('room', room.id, room.room_number)}
                          className="font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={handleAddRoom}
                  className="w-full mt-4 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
                >
                  <span className="mr-2">+</span>
                  Add New Room
                </Button>
              </div>
            </div>

            {/* User Management Section */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 p-6">
                <div className="flex items-center text-black text-xl font-bold">
                  <span className="mr-3 text-2xl">👥</span>
                  User Management
                  <span className="ml-3 text-sm font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-1.5 rounded-full">
                    {users.length} users
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {users.map((userItem) => (
                    <div 
                      key={userItem.id} 
                      className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${getRoleColor(userItem.role)}`}>
                          <span className="text-sm font-bold">
                            {getRoleIcon(userItem.role)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-black text-lg">
                              {userItem.name}
                            </h3>
                            <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border capitalize ${getRoleColor(userItem.role)}`}>
                              {userItem.role}
                            </span>
                          </div>
                          <p className="text-sm text-black font-semibold">{userItem.email}</p>
                          {userItem.department && (
                            <p className="text-sm text-gray-600 font-semibold">
                              {userItem.role === 'instructor' ? 'CICT' : userItem.department}
                            </p>
                          )}
                          {userItem.student_id && (
                            <p className="text-xs text-gray-500 font-semibold">
                              ID: {userItem.student_id}
                            </p>
                          )}
                          {userItem.year && userItem.block && (
                            <p className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 font-semibold px-2 py-1 rounded-full inline-block mt-1">
                              Year {userItem.year} • Block {userItem.block}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 font-semibold border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400 shadow-sm"
                          onClick={() => handleEditUser(userItem)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="font-semibold border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400 shadow-sm"
                          onClick={() => handleResetPasswordClick(userItem)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Reset PW
                        </Button>
                        {!isAdminUser(userItem) && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteClick('user', userItem.id, userItem.name)}
                            className="font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={handleAddUser}
                  className="w-full mt-4 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-semibold shadow-lg"
                >
                  <span className="mr-2">+</span>
                  Add New User
                </Button>
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
      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser || undefined}
        error={userError}
        saving={saving}
        existingUsers={users}
      />

      <RoomModal
        isOpen={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        onSave={handleSaveRoom}
        room={selectedRoom || undefined}
        error={roomError}
        saving={saving}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={userProfile}
        onChangePassword={handleChangePassword}
      />

      <CalendarView
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        reservations={calendarReservations}
      />

      <LogsModal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemType={itemToDelete?.type || ''}
        itemName={itemToDelete?.name || ''}
      />

      <ResetPasswordModal
        isOpen={resetPasswordModalOpen}
        onClose={() => {
          setResetPasswordModalOpen(false);
          setUserToResetPassword(null);
        }}
        onConfirm={handleResetPasswordConfirm}
        userName={userToResetPassword?.name || ''}
      />

      <ReservationActionModal
        isOpen={reservationActionModalOpen}
        onClose={() => {
          setReservationActionModalOpen(false);
          setReservationAction(null);
        }}
        onConfirm={handleReservationActionConfirm}
        action={reservationAction}
      />
    </div>
  );
}