import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Award, User, LogOut, Shield, Menu, X, ChevronDown, MapPin, Megaphone, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { ChatButton } from './ChatButton';
import { PhilippinesDateTime } from './PhilippinesDateTime';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simplified navigation items - show only the most important ones
  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        { path: '/admin', icon: MapPin, label: 'Dashboard' },
        { path: '/admin/map', icon: MapPin, label: 'Map' },
        { path: '/leaderboard', icon: Award, label: 'Leaderboard' },
        { path: '/admin/chat', icon: MessageCircle, label: 'Chat' }
      ];
    } else if (user?.role === 'patrol') {
      return [
        // Patrol users don't need navigation items since they're already on their dashboard
      ];
    } else {
      return [
        { path: '/reports', icon: FileText, label: 'Reports' },
        { path: '/leaderboard', icon: Award, label: 'Leaderboard' }
      ];
    }
  };

  const navItems = getNavItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      await signOut();
      navigate('/login');
    }
  };

  return (
    <nav 
      className={`fixed w-full z-[2000] transition-all duration-300 shadow-lg ${isScrolled ? 'py-2' : 'py-3'}`}
      style={{backgroundColor: '#800000'}}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo and DateTime */}
          <div className="flex items-center space-x-4">
            <Link 
              to={user ? (user.role === 'admin' ? '/admin' : user.role === 'patrol' ? '/patrol' : '/reports') : '/login'}
              className="flex items-center space-x-4 text-white hover:text-gray-200 transition-colors group"
            >
              <div className="relative flex items-center">
                <img 
                  src="/images/logo.jpg" 
                  alt="CARS-G Logo" 
                  className="h-14 w-14 object-cover rounded-full shadow-md group-hover:shadow-lg transition-all duration-200 ring-2 ring-white/30 group-hover:ring-white/50"
                  loading="lazy"
                />
              </div>
              <span className="text-2xl font-bold text-white group-hover:text-gray-200 transition-colors leading-tight">CARS-G</span>
            </Link>
            
            {/* Philippines Date and Time */}
            <PhilippinesDateTime />
          </div>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex md:items-center md:space-x-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`
                    inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-medium 
                    transition-all duration-200 relative group
                    ${isActive(path)
                      ? 'text-white shadow-sm border border-white/30' 
                      : 'text-white hover:text-white'
                    }
                  `}
                  style={isActive(path) ? {backgroundColor: '#660000'} : undefined}
                >
                  <Icon className={`h-4 w-4 mr-2 transition-colors duration-200 ${
                    isActive(path) ? 'text-white' : 'text-white'
                  }`} />
                  {label}
                  {isActive(path) && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                  )}
                </Link>
              ))}
              
              {/* Chat Button - only for regular users (not admin or patrol) on desktop */}
              {user?.role !== 'admin' && user?.role !== 'patrol' && (
                <ChatButton 
                  adminId="admin" // This should be the actual admin user ID
                  className="ml-2"
                />
              )}
              
              {/* Desktop Profile Menu */}
              <div className="relative ml-3" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-white transition-all duration-200 shadow-sm border border-transparent"
                >
                  <div className="relative">
                    <img
                      src={user.avatar_url || '/images/default-avatar.png'}
                      alt="Profile"
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-white/30 hover:ring-white/40 transition-all duration-200"
                      loading="lazy"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">{user.username}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-[3000] border border-gray-200/50 backdrop-blur-sm">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <img
                          src={user.avatar_url || '/images/default-avatar.png'}
                          alt="Profile"
                          className="h-10 w-10 rounded-full object-cover"
                          loading="lazy"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3 text-gray-400" />
                        Profile Settings
                      </Link>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-150"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl text-white transition-all duration-200 shadow-sm border border-transparent"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          )}

          {!user && (
            <div className="flex items-center space-x-3">
              <Link to="/login" className="text-white hover:text-white transition-colors px-4 py-2.5 rounded-xl font-medium shadow-sm border border-transparent">
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="text-white px-6 py-2.5 rounded-xl transition-all duration-200 font-semibold shadow-md hover:shadow-lg hover:scale-105 border border-white/30"
                style={{backgroundColor: '#660000'}}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#550000'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#660000'}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 mt-3" style={{backgroundColor: '#660000'}}>
            <div className="px-4 py-4 border-b border-white/20">
              <Link 
                to="/profile" 
                className="flex items-center space-x-3 group" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="relative">
                  <img src={user.avatar_url || '/images/default-avatar.png'} alt="Profile" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/30 group-hover:ring-white/50 transition-all duration-200" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <div className="text-white font-medium">{user.username}</div>
                  <div className="text-white/70 text-sm capitalize">{user.role} • View Profile</div>
                </div>
              </Link>
            </div>

            <div className="px-2 py-3 space-y-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center px-4 py-3.5 rounded-xl text-base font-medium transition-all duration-200 ${
                    isActive(path) 
                      ? 'text-white border border-white/30 shadow-sm' 
                      : 'text-white hover:text-white'
                  }`}
                  style={isActive(path) ? {backgroundColor: '#550000'} : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className={`h-5 w-5 mr-3 transition-colors duration-200 ${
                    isActive(path) ? 'text-white' : 'text-white'
                  }`} />
                  {label}
                </Link>
              ))}


              

              <div className="border-t border-white/20 my-2"></div>
              
              <button 
                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} 
                className="flex items-center w-full px-4 py-3.5 rounded-xl text-base font-medium text-red-200 hover:bg-red-900/50 hover:text-white transition-all duration-200 hover:shadow-sm"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}