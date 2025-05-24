import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Trophy, Map, User, LogOut, Shield, Menu, X, MessageSquare, FileText, Award, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/leaderboard', icon: Award, label: 'Leaderboard' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#800000] shadow-md py-2' 
          : 'bg-[#800000]/90 backdrop-blur-sm py-4'
      }`}
    >
      <div className="container">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to={user ? "/reports" : "/login"}
            className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors"
          >
            <img 
              src="/images/logo.jpg" 
              alt="CARS-G Logo" 
              className="h-8 w-8 object-contain"
            />
            <span className="text-2xl font-bold">CARS-G</span>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex md:items-center md:space-x-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`
                    inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium 
                    transition-all duration-200 hover:scale-105
                    ${isActive(path)
                      ? 'text-white bg-[#fff7ed] bg-opacity-10' 
                      : 'text-white hover:text-gray-200 hover:bg-[#f4f1ee]'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Profile Menu */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors focus:outline-none"
              >
                <img
                  src={user.avatar_url || '/images/default-avatar.png'}
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover"
                />
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#fff7ed] rounded-lg shadow-lg py-1 z-50">
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-white hover:text-gray-200 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-white text-primary-color px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden touch-target p-3 rounded-lg transition-colors text-white hover:text-gray-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && user && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className={`
                  flex items-center px-4 py-4 rounded-lg text-base font-medium touch-target
                  ${isActive(path)
                    ? 'text-white bg-[#fff7ed] bg-opacity-10'
                    : 'text-white hover:text-gray-200 hover:bg-[#f4f1ee]'
                  }
                `}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="h-6 w-6 mr-3" />
                {label}
              </Link>
            ))}
            <Link
              to="/profile"
              className="flex items-center px-4 py-4 rounded-lg text-base font-medium text-white hover:text-gray-200 hover:bg-[#f4f1ee] touch-target"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User className="h-6 w-6 mr-3" />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-4 rounded-lg text-base font-medium text-white hover:text-gray-200 hover:bg-[#f4f1ee] touch-target"
            >
              <LogOut className="h-6 w-6 mr-3" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}