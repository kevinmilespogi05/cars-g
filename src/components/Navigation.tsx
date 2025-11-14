import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Award, User, LogOut, Shield, ChevronDown, MapPin, Megaphone, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { ChatButton } from './ChatButton';
import { PhilippinesDateTime } from './PhilippinesDateTime';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAdminLike } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
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
    if (isAdminLike()) {
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
      className={`fixed w-full z-sidebar transition-all duration-300 shadow-lg ${isScrolled ? 'py-2' : 'py-3'}`}
      style={{backgroundColor: '#800000'}}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo and DateTime */}
          <div className="flex items-center space-x-4">
            <Link 
              to={user ? (isAdminLike() ? '/admin' : user.role === 'patrol' ? '/patrol' : '/reports') : '/login'}
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
                  )}

                  {/* Mobile menu intentionally removed: use Quick Actions (+) instead */}
                </div>
              </div>
            </nav>
          );
        }
                />
              )}
              
              {/* Desktop Profile Menu */}
              <div className="relative ml-3" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl text-white transition-all duration-200 shadow-sm border border-transparent min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#800000]"
                  aria-label="Open user profile menu"
                  aria-expanded={isProfileMenuOpen}
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
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-popup border border-gray-200/50 backdrop-blur-sm"
                    role="menu"
                    aria-label="User profile options"
                  >
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
                          <div className="text-xs text-gray-700 capitalize">{user.role}</div>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-150"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-3 text-gray-600" />
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

          {/* Mobile menu intentionally removed: use Quick Actions (+) instead */}
        {/* Mobile navigation removed - QuickActions (+) now provides mobile access to announcements/contacts/profile links. */}
      </div>
    </nav>
  );
}