import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, Trophy, Map, User, LogOut, Shield, Menu, X, MessageSquare, FileText, Award, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../context/ThemeContext';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { theme } = useTheme();
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
          ? 'bg-[#800000] dark:bg-gray-900 shadow-md py-2' 
          : 'bg-[#800000]/90 dark:bg-gray-900/90 backdrop-blur-sm py-4'
      }`}
    >
      <div className="container">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-white dark:text-gray-100 hover:text-gray-200 dark:hover:text-gray-300 transition-colors"
          >
            <img 
              src="/images/logo.jpg" 
              alt="CARS-G Logo" 
              className="h-8 w-8 object-contain"
            />
            <span className="text-2xl font-bold">CARS-G</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className={`
                  inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium 
                  transition-all duration-200 hover:scale-105
                  ${isActive(path)
                    ? 'text-white dark:text-gray-100 bg-[#fff7ed] dark:bg-gray-700 bg-opacity-10' 
                    : 'text-white dark:text-gray-200 hover:text-gray-200 dark:hover:text-gray-300 hover:bg-[#f4f1ee] dark:hover:bg-gray-700'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </Link>
            ))}

            {/* Profile Dropdown */}
            {user && (
              <div className="relative ml-4" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg text-white dark:text-gray-200 hover:bg-[#fff7ed] dark:hover:bg-gray-700 bg-opacity-10 transition-colors"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username || 'Profile'}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary-color/10 dark:bg-gray-700 flex items-center justify-center">
                      <User className="h-5 w-5 text-white dark:text-gray-200" />
                    </div>
                  )}
                  <ChevronDown className={`h-4 w-4 text-white dark:text-gray-200 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden touch-target p-3 rounded-lg transition-colors text-white dark:text-gray-200 hover:bg-[#fff7ed] dark:hover:bg-gray-700 bg-opacity-10"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`
          md:hidden fixed inset-0 bg-black bg-opacity-50 z-40
          transition-all duration-300 transform
          ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div 
          className={`
            absolute top-[72px] left-0 right-0 
            bg-white dark:bg-gray-800 shadow-lg rounded-b-lg py-2 px-4 mx-4 space-y-1
            transform transition-transform duration-300
            ${isMobileMenuOpen ? 'translate-y-0' : '-translate-y-4'}
          `}
          onClick={e => e.stopPropagation()}
        >
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`
                flex items-center px-4 py-4 rounded-lg text-base font-medium
                transition-colors duration-200 touch-target
                ${isActive(path)
                  ? 'text-primary-color dark:text-blue-400 bg-primary-color/10 dark:bg-blue-400/10'
                  : 'text-gray-900 dark:text-gray-200 hover:text-primary-color dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Icon className="h-5 w-5 mr-3" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}