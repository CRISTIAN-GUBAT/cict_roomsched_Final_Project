'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Shield, User, Mail, Lock, Calendar, Zap, Building, Clock, Users, Bell, LogIn } from 'lucide-react';
import Image from 'next/image';

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

const TEST_CREDENTIALS = [
  { role: 'Administrator', email: 'admin@cict.edu.ph', password: 'password', icon: '👑', color: 'from-maroon-600 to-maroon-800' },
  { role: 'Faculty', email: 'instructor@cict.edu.ph', password: 'password', icon: '👨‍🏫', color: 'from-maroon-600 to-maroon-800' },
  { role: 'Student', email: 'student@student.cict.edu.ph', password: 'password', icon: '🎓', color: 'from-maroon-600 to-maroon-800' }
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Load remembered credentials from localStorage on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const logoutMessage = searchParams.get('logout');
    const sessionExpired = searchParams.get('session_expired');
    const resetSuccess = searchParams.get('reset_success');
    
    if (logoutMessage === 'success') {
      showToast('You have been logged out successfully.', 'info');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    if (sessionExpired === 'true') {
      showToast('Your session has expired. Please log in again.', 'warning');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    if (resetSuccess === 'true') {
      showToast('Password reset successful! Please log in with your new password.', 'success');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  const validateEmailDomain = (email: string): boolean => {
    const domain = email.split('@')[1];
    return domain === 'cict.edu.ph' || domain === 'student.cict.edu.ph';
  };

  const autoFillCredentials = (credential: { email: string; password: string; role: string; icon: string }) => {
    setEmail(credential.email);
    setPassword(credential.password);
    showToast(`${credential.icon} ${credential.role} credentials auto-filled!`, 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!validateEmailDomain(email)) {
      setError('Please use a valid CICT email address (@cict.edu.ph or @student.cict.edu.ph)');
      setLoading(false);
      return;
    }
    
    try {
      await login(email, password);
      
      // Handle Remember Me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        // Clear saved credentials if Remember Me is not checked
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
      
      showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
      
    } catch (error: unknown) {
      const apiError = error as ApiError;
      let errorMessage = 'Login failed. Please try again.';
      
      if (apiError.response?.status === 422) {
        const validationErrors = apiError.response.data?.errors;
        if (validationErrors) {
          const errorMessages = Object.values(validationErrors).flat();
          errorMessage = `Validation Error: ${errorMessages.join(', ')}`;
        } else {
          errorMessage = 'Validation failed. Please check your input.';
        }
      } 
      else if (apiError.response?.status === 401) {
        errorMessage = 'Invalid email or password.';
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

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(e.target.checked);
  };

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
                  <div className="relative w-14 h-14">
                    <Image
                      src="/CICT-logo.jpg"
                      alt="CICT Logo"
                      fill
                      className="object-contain rounded-lg"
                      priority
                    />
                  </div>
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
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Smart Booking</h3>
                <p className="text-gray-700 leading-relaxed">
                  Reserve classrooms, labs, and meeting rooms instantly with intelligent scheduling.
                </p>
              </div>

              <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Real-time Updates</h3>
                <p className="text-gray-700 leading-relaxed">
                  Live availability tracking and instant notifications for all room reservations.
                </p>
              </div>

              <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Multi-role Access</h3>
                <p className="text-gray-700 leading-relaxed">
                  Tailored interfaces for administrators, faculty, and students with appropriate permissions.
                </p>
              </div>

              <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl p-6 hover:border-maroon-300 transition-all duration-300 group">
                <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Bell className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-3">Automated Notifications</h3>
                <p className="text-gray-700 leading-relaxed">
                  Get reminders, confirmations, and updates for all your scheduled activities.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-around p-6 bg-gradient-to-r from-maroon-50 to-maroon-100 border border-maroon-200 rounded-2xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-black mb-1">24/7</div>
                <div className="text-gray-700 text-sm">Accessibility</div>
              </div>
              <div className="h-12 w-px bg-maroon-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-black mb-1">100%</div>
                <div className="text-gray-700 text-sm">Secure</div>
              </div>
              <div className="h-12 w-px bg-maroon-200" />
              <div className="text-center">
                <div className="text-3xl font-bold text-black mb-1">50+</div>
                <div className="text-gray-700 text-sm">Rooms</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2">
          <div className="flex flex-col space-y-8">
            {/* Login Card */}
            <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden">
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-maroon-600 to-maroon-800" />
                <div className="p-8 lg:p-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-black mb-2">Welcome Back</h2>
                      <p className="text-gray-600">Sign in to your CICT account</p>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-2xl flex items-center justify-center shadow-lg">
                      <LogIn className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl text-red-700 flex items-start space-x-3 animate-fade-in">
                      <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-sm">!</span>
                      </div>
                      <div>
                        <strong className="block text-sm font-semibold">Authentication Error</strong>
                        <span className="text-sm">{error}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-black mb-3">
                        CICT Email Address
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
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl placeholder-gray-500 text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 text-lg shadow-sm"
                          placeholder="yourname@cict.edu.ph"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-black mb-3">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-12 pr-12 py-4 bg-white border border-gray-300 rounded-xl placeholder-gray-500 text-black focus:ring-2 focus:ring-maroon-600 focus:border-transparent transition-all duration-200 shadow-sm text-lg"
                          placeholder="Enter your password"
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

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={handleRememberMeChange}
                          className="h-4 w-4 rounded border-gray-300 bg-white text-maroon-600 focus:ring-maroon-500"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                          Remember me
                        </label>
                      </div>
                     
                    </div>

                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="w-full py-5 px-6 bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-lg text-lg group"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center space-x-3">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-lg">Signing in...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-3">
                          <User className="w-6 h-6 group-hover:scale-110 transition-transform" />
                          <span className="text-lg">Sign In to Portal</span>
                        </div>
                      )}
                    </Button>

                    <div className="text-center">
                      <p className="text-gray-700">
                        New to CICT RoomSched?{' '}
                        <Link 
                          href="/register" 
                          className="font-semibold text-maroon-700 hover:text-maroon-800 transition-colors"
                        >
                          Create an account
                        </Link>
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Test Credentials */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center mb-5">
                <div className="w-10 h-10 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Quick Access Credentials</h3>
                  <p className="text-amber-700 text-sm">Click any role to auto-fill credentials</p>
                </div>
              </div>

              <div className="space-y-4">
                {TEST_CREDENTIALS.map((credential, index) => (
                  <button
                    key={index}
                    onClick={() => autoFillCredentials(credential)}
                    className="w-full flex items-center p-5 bg-white border border-gray-200 rounded-2xl hover:border-maroon-300 transition-all duration-300 group hover:scale-[1.02] shadow-sm"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${credential.color} rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <span className="text-2xl text-white">{credential.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-black text-lg">{credential.role}</div>
                      <div className="text-gray-600 text-sm">{credential.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-maroon-700">password</div>
                      <div className="text-xs text-maroon-600">Click to fill</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-amber-200">
                <p className="text-center text-amber-800 text-sm font-medium">
                  These are demo credentials for testing system features
                </p>
              </div>
            </div>

            {/* Back to Home */}
            <div className="text-center">
              <Link 
                href="/" 
                className="inline-flex items-center text-gray-700 hover:text-black font-medium transition-all duration-200 group"
              >
                <span className="mr-3 group-hover:-translate-x-1 transition-transform duration-200">←</span>
                Return to homepage
              </Link>
            </div>
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