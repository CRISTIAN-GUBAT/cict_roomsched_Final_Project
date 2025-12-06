'use client';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, Building, Shield, Star, CheckCircle, ArrowRight, BookOpen, MapPin, Bell, BarChart3, Home, LogIn, UserPlus, School, GraduationCap, UserCheck, Trophy, Sparkles, Zap, Target, Award, Rocket } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-maroon-50 via-white to-maroon-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-100/[0.02] bg-[size:60px_60px]" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-maroon-50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-maroon-100 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-maroon-800 to-maroon-900 backdrop-blur-lg border-b border-maroon-700 shadow-lg sticky top-0 z-50">
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
                  CICT <span className="text-white">RoomSched</span>
                </h1>
                <p className="text-sm text-maroon-100 font-semibold">Smart Room Reservation System</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link href="/login" passHref>
                <Button variant="outline" className="border-maroon-200 bg-white/10 hover:bg-white/20 text-white hover:text-white font-semibold shadow-sm">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link href="/register" passHref>
                <Button className="bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group">
                  <UserPlus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero */}
        <div className="text-center py-20 lg:py-28">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-maroon-100 to-maroon-200 text-maroon-800 px-6 py-3 rounded-full text-sm font-semibold mb-8 border border-maroon-200 backdrop-blur-sm">
              <Star className="w-4 h-4" />
              <span>Exclusive Platform for CICT Community</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black mb-8 leading-tight">
              Revolutionize{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-maroon-600 to-maroon-800">
                Classroom
              </span>
              {' '}Management
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              The intelligent room scheduling platform designed specifically for the College of Information and Communications Technology. 
              Streamline reservations, optimize space utilization, and enhance academic efficiency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/register" passHref>
                <Button size="lg" className="px-10 py-5 text-lg bg-gradient-to-r from-maroon-800 to-maroon-900 hover:from-maroon-900 hover:to-maroon-950 font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 group">
                  <BookOpen className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
                  Start Booking Now
                  <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login" passHref>
                <Button size="lg" variant="outline" className="px-10 py-5 text-lg border-2 border-maroon-200 text-maroon-800 hover:bg-maroon-50 hover:text-maroon-900 font-bold hover:shadow-lg transition-all duration-200 group">
                  <Users className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
                  Existing User Sign In
                </Button>
              </Link>
            </div>

            {/* Hero Visual */}
            <div className="relative max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 rounded-2xl p-6 border border-maroon-200 backdrop-blur-sm group hover:border-maroon-300 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-maroon-800">Smart Scheduling</h3>
                </div>
                <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 rounded-2xl p-6 border border-maroon-200 backdrop-blur-sm group hover:border-maroon-300 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-maroon-800">Room Management</h3>
                </div>
                <div className="bg-gradient-to-br from-maroon-50 to-maroon-100 rounded-2xl p-6 border border-maroon-200 backdrop-blur-sm group hover:border-maroon-300 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-r from-maroon-600 to-maroon-800 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-maroon-800">Real-time Analytics</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-20 lg:py-28">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
              Built for the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-maroon-600 to-maroon-800">
                CICT Community
              </span>
            </h2>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-medium">
              Tailored solutions for every role in our academic ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Student Card */}
            <Card className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 group hover:transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-maroon-600 to-maroon-800" />
              <CardHeader className="pb-6 pt-8">
                <CardTitle className="flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-maroon-600 to-maroon-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:scale-110">
                    <GraduationCap className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-black mb-2">Students</span>
                  <p className="text-maroon-700 font-semibold text-lg">Seamless Learning Experience</p>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-gray-700 mb-8 leading-relaxed text-lg font-medium">
                  Access class schedules, find available rooms, and never miss important academic activities with our intuitive platform.
                </p>
                <ul className="space-y-4 text-left">
                  {[
                    { icon: '📚', text: 'View complete class schedules' },
                    { icon: '🔍', text: 'Search available classrooms' },
                    { icon: '⏰', text: 'Real-time room availability' },
                    { icon: '📅', text: 'Personal academic calendar' },
                    { icon: '🔔', text: 'Instant schedule notifications' }
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-700 font-semibold text-lg group/item hover:text-black transition-colors duration-200">
                      <span className="text-2xl mr-4 group-hover/item:scale-110 transition-transform duration-200">{feature.icon}</span>
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Instructor Card */}
            <Card className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 group hover:transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-maroon-600 to-maroon-800" />
              <CardHeader className="pb-6 pt-8">
                <CardTitle className="flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-maroon-600 to-maroon-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:scale-110">
                    <UserCheck className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-black mb-2">Instructors</span>
                  <p className="text-maroon-700 font-semibold text-lg">Efficient Teaching Tools</p>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-gray-700 mb-8 leading-relaxed text-lg font-medium">
                  Manage your classroom reservations, track schedules, and focus on teaching while we handle the logistics.
                </p>
                <ul className="space-y-4 text-left">
                  {[
                    { icon: '🏫', text: 'Easy classroom reservations' },
                    { icon: '📊', text: 'Teaching schedule management' },
                    { icon: '⚡', text: 'Instant booking confirmations' },
                    { icon: '📈', text: 'Room utilization analytics' },
                    { icon: '🔄', text: 'Quick reservation modifications' }
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-700 font-semibold text-lg group/item hover:text-black transition-colors duration-200">
                      <span className="text-2xl mr-4 group-hover/item:scale-110 transition-transform duration-200">{feature.icon}</span>
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Admin Card */}
            <Card className="bg-white border border-gray-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 group hover:transform hover:-translate-y-3 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-maroon-600 to-maroon-800" />
              <CardHeader className="pb-6 pt-8">
                <CardTitle className="flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-maroon-600 to-maroon-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:scale-110">
                    <Shield className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-3xl font-bold text-black mb-2">Administrators</span>
                  <p className="text-maroon-700 font-semibold text-lg">Complete System Control</p>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-8">
                <p className="text-gray-700 mb-8 leading-relaxed text-lg font-medium">
                  Oversee room allocations, manage reservations, and optimize space utilization across the entire CICT facility.
                </p>
                <ul className="space-y-4 text-left">
                  {[
                    { icon: '🎯', text: 'Centralized room management' },
                    { icon: '✅', text: 'Reservation approval system' },
                    { icon: '📋', text: 'Comprehensive analytics dashboard' },
                    { icon: '🔧', text: 'System configuration tools' },
                    { icon: '📊', text: 'Usage reports and insights' }
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-700 font-semibold text-lg group/item hover:text-black transition-colors duration-200">
                      <span className="text-2xl mr-4 group-hover/item:scale-110 transition-transform duration-200">{feature.icon}</span>
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-12 mb-20">
          <div className="bg-white border border-gray-200 rounded-3xl p-8 lg:p-12 shadow-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '1000+', label: 'Active Users', icon: '👥', color: 'from-maroon-600 to-maroon-800' },
                { value: '50+', label: 'Rooms Managed', icon: '🏫', color: 'from-maroon-600 to-maroon-800' },
                { value: '99%', label: 'Uptime', icon: '⚡', color: 'from-maroon-600 to-maroon-800' },
                { value: '24/7', label: 'Support', icon: '🛡️', color: 'from-maroon-600 to-maroon-800' }
              ].map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                    <span className="text-2xl text-white">{stat.icon}</span>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-black mb-2">{stat.value}</div>
                  <div className="text-gray-700 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="py-20 lg:py-28 bg-gradient-to-r from-maroon-50 to-maroon-100 border border-maroon-200 rounded-3xl mb-20 shadow-xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
              How It{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-maroon-600 to-maroon-800">
                Works
              </span>
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto font-medium">
              Simple steps to transform your room scheduling experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up with your CICT email', icon: '👤', color: 'from-maroon-600 to-maroon-800' },
              { step: '02', title: 'Verify Identity', desc: 'CICT domain verification', icon: '✅', color: 'from-maroon-600 to-maroon-800' },
              { step: '03', title: 'Explore Rooms', desc: 'Browse available classrooms', icon: '🏫', color: 'from-maroon-600 to-maroon-800' },
              { step: '04', title: 'Book & Manage', desc: 'Reserve and track schedules', icon: '📅', color: 'from-maroon-600 to-maroon-800' }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className={`w-24 h-24 bg-gradient-to-br ${item.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:scale-110`}>
                  <span className="text-4xl text-white">{item.icon}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <div className="text-sm font-bold text-gray-500 mb-2">{item.step}</div>
                  <h3 className="text-xl font-bold text-black mb-3">{item.title}</h3>
                  <p className="text-gray-700 font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA Section */}
        <div className="py-20 lg:py-28">
          <Card className="bg-gradient-to-br from-maroon-800 via-maroon-900 to-maroon-950 text-white shadow-3xl border-0 rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            <CardContent className="p-16 text-center relative z-10">
              <div className="max-w-4xl mx-auto">
                <div className="inline-flex items-center space-x-2 bg-white/10 px-6 py-3 rounded-full text-sm font-semibold mb-8 border border-white/20 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Get Started Today</span>
                </div>
                
                <h2 className="text-4xl md:text-5xl font-bold mb-8">
                  Ready to Transform Your Academic Scheduling?
                </h2>
                <p className="text-xl text-maroon-100 mb-12 leading-relaxed font-medium">
                  Join the CICT community in embracing smart room management. Experience seamless scheduling, 
                  real-time updates, and complete control over your academic space requirements.
                </p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <Link href="/register" passHref>
                    <Button size="lg" className="bg-white text-maroon-800 hover:bg-gray-100 font-bold px-12 py-6 text-lg shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 group">
                      <Rocket className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
                      Start Your Journey Today
                      <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/login" passHref>
                    <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 font-bold px-12 py-6 text-lg hover:scale-105 transition-all duration-300 group">
                      <LogIn className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
                      Returning User Sign In
                    </Button>
                  </Link>
                </div>
                <div className="mt-8 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 text-maroon-200 font-medium">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    No credit card required
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Setup in 2 minutes
                  </div>
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    CICT verified security
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-maroon-800 to-maroon-900 border-t border-maroon-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-8 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-gradient-to-r from-maroon-700 to-maroon-800 rounded-2xl shadow-2xl" />
                <div className="absolute inset-2 bg-white rounded-xl flex items-center justify-center">
                  <div className="text-maroon-800 text-lg font-bold">CICT</div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  CICT <span className="text-white">RoomSched</span>
                </h3>
                <p className="text-sm text-maroon-100 font-medium">
                  College of Information and Communications Technology
                </p>
                <p className="text-maroon-200 text-xs mt-1">
                  Smart Room Reservation System
                </p>
              </div>
            </div>
            
            <div className="text-center lg:text-right">
              <p className="text-white font-semibold text-lg">
                &copy; 2025 CICT RoomSched System
              </p>
              <p className="text-maroon-200 text-sm mt-2 font-medium">
                Built with excellence for the CICT community
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}