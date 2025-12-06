'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Mail, Lock, User, BookOpen, GraduationCap, ShieldCheck, Calendar, Building, Clock, Users, Bell, UserPlus, School, Hash, Home } from 'lucide-react';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: 'student' | 'instructor';
  student_id: string;
  course: string;
  year: string;
  block: string;
}

interface ApiError {
  response?: {
    status?: number;
    data?: {
      errors?: Record<string, string[]>;
      message?: string;
      error?: string;
    };
  };
  message?: string;
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
    }, 4000);

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

//  block options based on course type
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

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'student',
    student_id: '',
    course: '',
    year: '',
    block: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const yearOptions = ['1', '2', '3', '4'];

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const registered = searchParams.get('registered');
    
    if (registered === 'true') {
      showToast('Account created successfully! Please log in.', 'success');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  const validateEmailDomain = (email: string, role: string): string | null => {
    if (!email.includes('@')) return 'Invalid email format';
    
    const domain = email.split('@')[1];
    
    if (role === 'student') {
      if (domain !== 'student.cict.edu.ph') {
        return 'Student email must be from @student.cict.edu.ph domain';
      }
    } else if (role === 'instructor') {
      if (domain !== 'cict.edu.ph') {
        return 'Instructor email must be from @cict.edu.ph domain';
      }
    }
    
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'role') {
      setFormData(prev => ({
        ...prev,
        [name]: value as 'student' | 'instructor',
        email: '',
        course: '',
        year: '',
        block: ''
      }));
      setError('');
    } else if (name === 'course' || name === 'year') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        block: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData(prev => ({
      ...prev,
      email
    }));

    if (email && formData.role) {
      const domainError = validateEmailDomain(email, formData.role);
      if (domainError) {
        setError(domainError);
      } else {
        setError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const domainError = validateEmailDomain(formData.email, formData.role);
      if (domainError) {
        setError(domainError);
        setLoading(false);
        return;
      }

      if (formData.password !== formData.password_confirmation) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }

      if (formData.role === 'student') {
        if (!formData.student_id.trim()) {
          setError('Student ID is required for student accounts');
          setLoading(false);
          return;
        }
        if (!formData.course.trim()) {
          setError('Course selection is required for student accounts');
          setLoading(false);
          return;
        }
        if (!formData.year.trim()) {
          setError('Year level is required for student accounts');
          setLoading(false);
          return;
        }
        if (!formData.block.trim()) {
          setError('Block selection is required for student accounts');
          setLoading(false);
          return;
        }
        
        const blockOptions = getBlockOptions(formData.course, formData.year);
        if (!blockOptions.includes(formData.block)) {
          setError(`Invalid block selection for ${formData.course}`);
          setLoading(false);
          return;
        }
      }

      const submitData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role: formData.role,
        student_id: formData.role === 'student' ? formData.student_id : undefined,
        course: formData.role === 'student' ? formData.course : undefined,
        year: formData.role === 'student' ? formData.year : undefined,
        block: formData.role === 'student' ? formData.block : undefined,
        department: formData.role === 'student' ? formData.course : 'CICT'
      };

      await register(submitData);
      showToast('Account created successfully! Redirecting to dashboard...', 'success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
      
    } catch (error: unknown) {
      const apiError = error as ApiError;
      let errorMessage = 'Registration failed. Please try again.';
      
      if (apiError.response?.status === 422) {
        const validationErrors = apiError.response.data?.errors;
        if (validationErrors) {
          if (validationErrors.email && validationErrors.email.includes('The email has already been taken.')) {
            errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
          } else {
            const errorMessages = Object.values(validationErrors).flat();
            errorMessage = `Validation Error: ${errorMessages.join(', ')}`;
          }
        } else {
          errorMessage = 'Validation failed. Please check your input.';
        }
      } 
      else if (apiError.response?.status === 409) {
        errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
      }
      else if (apiError.response?.status === 401) {
        errorMessage = 'Invalid credentials provided.';
      }
      else if (apiError.response?.data?.error) {
        errorMessage = apiError.response.data.error;
      }
      else if (apiError.response?.data?.message) {
        errorMessage = apiError.response.data.message;
      } 
      else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const getEmailPlaceholder = (role: string) => {
    switch (role) {
      case 'student': return 'yourname@student.cict.edu.ph';
      case 'instructor': return 'yourname@cict.edu.ph';
      default: return 'Enter your email';
    }
  };

  const getEmailDescription = (role: string) => {
    switch (role) {
      case 'student': return 'Use your official student email address (@student.cict.edu.ph)';
      case 'instructor': return 'Use your institutional email address (@cict.edu.ph)';
      default: return '';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student': return <GraduationCap className="h-5 w-5" />;
      case 'instructor': return <User className="h-5 w-5" />;
      default: return <User className="h-5 w-5" />;
    }
  };

  const currentBlockOptions = getBlockOptions(formData.course, formData.year);

  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-50 via-white to-maroon-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-100/[0.02] bg-[size:60px_60px]" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-maroon-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-maroon-100 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8 items-center relative z-10">
        {/* Left Side - Branding & Features */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 lg:p-12 shadow-2xl">
            {/* Logo & Title */}
            <div className="flex items-center mb-10">
              <div className="relative w-20 h-20 mr-5">
                <div className="absolute inset-0 bg-gradient-to-r from-maroon-700 to-maroon-800 rounded-2xl shadow-lg" />
                <div className="absolute inset-2 bg-white rounded-xl flex items-center justify-center">
                  <div className="text-maroon-800 text-2xl font-bold">CICT</div>
                </div>
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-black mb-2">
                  CICT <span className="text-transparent bg-clip-text bg-gradient-to-r from-maroon-600 to-maroon-800">RoomSched</span>
                </h1>
                <p className="text-gray-700 text-lg font-medium">
                  Smart Room Reservation System
                </p>
              </div>
            </div>

            {/* Institution Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-maroon-50 to-maroon-100 border border-maroon-200 rounded-full mb-12">
              <Building className="w-5 h-5 text-maroon-700 mr-3" />
              <span className="text-black font-semibold">
                College of Information and Communications Technology
              </span>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <UserPlus className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Easy Registration</h3>
                <p className="text-gray-700 leading-relaxed">
                  Join CICT RoomSched with your official email and get instant access to room booking.
                </p>
              </div>

              <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <ShieldCheck className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Verified Access</h3>
                <p className="text-gray-700 leading-relaxed">
                  Exclusive access for CICT students & faculty with institutional email verification.
                </p>
              </div>

              <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <School className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Course Integration</h3>
                <p className="text-gray-700 leading-relaxed">
                  Automatically sync with your course schedule and academic information.
                </p>
              </div>

              <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Smart Scheduling</h3>
                <p className="text-gray-700 leading-relaxed">
                  Reserve classrooms, labs, and meeting rooms instantly with intelligent availability.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-around p-6 bg-gradient-to-r from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-black mb-1">1000+</div>
                <div className="text-gray-700 text-sm">Active Users</div>
              </div>
              <div className="h-12 w-px bg-maroon-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-black mb-1">50+</div>
                <div className="text-gray-700 text-sm">Rooms</div>
              </div>
              <div className="h-12 w-px bg-maroon-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-black mb-1">24/7</div>
                <div className="text-gray-700 text-sm">Access</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden">
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-maroon-600 to-maroon-800" />
              <div className="p-8 lg:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-black mb-2">Create Account</h2>
                    <p className="text-gray-600">Join CICT Room Scheduling Platform</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-2xl flex items-center justify-center shadow-lg">
                    <UserPlus className="w-7 h-7 text-white" />
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl text-red-700 flex items-start space-x-3 animate-fade-in">
                    <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-white text-sm">!</span>
                    </div>
                    <div>
                      <strong className="block text-sm font-semibold">Registration Error</strong>
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Grid for form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <div className="space-y-3">
                      <label htmlFor="name" className="block text-sm font-semibold text-black">
                        Full Name *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl placeholder-gray-500 text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div className="space-y-3">
                      <label htmlFor="role" className="block text-sm font-semibold text-black">
                        I am a *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          {getRoleIcon(formData.role)}
                        </div>
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="block w-full pl-12 pr-10 py-4 bg-white border border-gray-300 rounded-xl text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 appearance-none shadow-sm"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          <span className="text-gray-500">▼</span>
                        </div>
                      </div>
                    </div>

                    {/* Email Address - Full Width */}
                    <div className="md:col-span-2 space-y-3">
                      <label htmlFor="email" className="block text-sm font-semibold text-black">
                        Email Address *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleEmailChange}
                          className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl placeholder-gray-500 text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder={getEmailPlaceholder(formData.role)}
                        />
                      </div>
                      <p className="text-xs text-gray-600 font-medium">
                        {getEmailDescription(formData.role)}
                      </p>
                    </div>

                    {/* Student ID (Conditional) */}
                    {formData.role === 'student' && (
                      <div className="space-y-3">
                        <label htmlFor="student_id" className="block text-sm font-semibold text-black">
                          Student ID *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Hash className="h-5 w-5 text-gray-500" />
                          </div>
                          <input
                            id="student_id"
                            name="student_id"
                            type="text"
                            required={formData.role === 'student'}
                            value={formData.student_id}
                            onChange={handleChange}
                            className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl placeholder-gray-500 text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 shadow-sm"
                            placeholder="2025-1"
                          />
                        </div>
                      </div>
                    )}

                    {/* Course Selection (Conditional) */}
                    {formData.role === 'student' && (
                      <div className="space-y-3">
                        <label htmlFor="course" className="block text-sm font-semibold text-black">
                          Course Program *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <BookOpen className="h-5 w-5 text-gray-500" />
                          </div>
                          <select
                            id="course"
                            name="course"
                            required={formData.role === 'student'}
                            value={formData.course}
                            onChange={handleChange}
                            className="block w-full pl-12 pr-10 py-4 bg-white border border-gray-300 rounded-xl text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 appearance-none shadow-sm"
                          >
                            <option value="">Select your course</option>
                            <option value="BS in Computer Science">BS in Computer Science</option>
                            <option value="BS in Information Technology">BS in Information Technology</option>
                            <option value="BS in Information Systems">BS in Information Systems</option>
                            <option value="BTVTED - Computer System Servicing">BTVTED - Computer System Servicing</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <span className="text-gray-500">▼</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Year Selection (Conditional) */}
                    {formData.role === 'student' && (
                      <div className="space-y-3">
                        <label htmlFor="year" className="block text-sm font-semibold text-black">
                          Year Level *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Calendar className="h-5 w-5 text-gray-500" />
                          </div>
                          <select
                            id="year"
                            name="year"
                            required={formData.role === 'student'}
                            value={formData.year}
                            onChange={handleChange}
                            className="block w-full pl-12 pr-10 py-4 bg-white border border-gray-300 rounded-xl text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 appearance-none shadow-sm"
                          >
                            <option value="">Select year level</option>
                            {yearOptions.map(year => (
                              <option key={year} value={year}>Year {year}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <span className="text-gray-500">▼</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Block Selection (Conditional) - Updated */}
                    {formData.role === 'student' && (
                      <div className="space-y-3">
                        <label htmlFor="block" className="block text-sm font-semibold text-black">
                          Block/Section *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Users className="h-5 w-5 text-gray-500" />
                          </div>
                          <select
                            id="block"
                            name="block"
                            required={formData.role === 'student'}
                            value={formData.block}
                            onChange={handleChange}
                            disabled={!formData.course || !formData.year}
                            className={`block w-full pl-12 pr-10 py-4 bg-white border rounded-xl text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 appearance-none shadow-sm ${
                              !formData.course || !formData.year 
                                ? 'border-gray-300 opacity-50 cursor-not-allowed' 
                                : 'border-gray-300'
                            }`}
                          >
                            <option value="">
                              {formData.course && formData.year 
                                ? 'Select block' 
                                : 'Select course and year first'
                              }
                            </option>
                            {currentBlockOptions.map(block => (
                              <option key={block} value={block}>
                                Block {block}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                            <span className="text-gray-500">▼</span>
                          </div>
                        </div>
                        {formData.course && formData.year && (
                          <p className="text-xs text-gray-600 font-medium">
                            {formData.course === 'BS in Information Technology'
                              ? `BSIT Year ${formData.year} has 5 blocks (1-5)`
                              : `${formData.course} Year ${formData.year} has 2 blocks (1-2)`
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {/* Password */}
                    <div className="space-y-3">
                      <label htmlFor="password" className="block text-sm font-semibold text-black">
                        Password *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="block w-full pl-12 pr-12 py-4 bg-white border border-gray-300 rounded-xl placeholder-gray-500 text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Minimum 8 characters"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-3">
                      <label htmlFor="password_confirmation" className="block text-sm font-semibold text-black">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                          id="password_confirmation"
                          name="password_confirmation"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          value={formData.password_confirmation}
                          onChange={handleChange}
                          className="block w-full pl-12 pr-12 py-4 bg-white border border-gray-300 rounded-xl placeholder-gray-500 text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 shadow-sm"
                          placeholder="Re-enter your password"
                        />
                        <button
                          type="button"
                          onClick={toggleConfirmPasswordVisibility}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-5 px-6 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-lg text-lg group"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-lg">Creating Account...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <UserPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        <span className="text-lg">Create My Account</span>
                      </div>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-600 font-medium">
                        Already have an account?
                      </span>
                    </div>
                  </div>

                  {/* Login Link */}
                  <div className="text-center">
                    <Link 
                      href="/login" 
                      className="inline-flex items-center justify-center w-full py-3 px-4 border-2 border-maroon-200 text-maroon-800 font-bold rounded-xl hover:bg-maroon-50 transition-all duration-200 hover:shadow-lg group"
                    >
                      <span className="mr-2">Sign In to Existing Account</span>
                      <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-8">
            <Link 
              href="/" 
              className="inline-flex items-center text-gray-700 hover:text-black font-medium transition-all duration-200 group"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to homepage
            </Link>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-gray-600 text-sm">
          © {new Date().getFullYear()} CICT RoomSched System. All rights reserved.
        </p>
      </div>
    </div>
  );
}