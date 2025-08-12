import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Award, MessageSquare, User, LogOut, Shield, Menu, X, ChevronDown } from 'lucide-react';
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
    { path: '/chat', icon: MessageSquare, label: 'Chat' }
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
              className="h-8 w-8 object-contain rounded-full"
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
                      : 'text-white hover:text-gray-200 hover:bg-[#f4f1ee] hover:bg-opacity-10'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {label}
                </Link>
              ))}
              
              {/* Desktop Profile Menu */}
              <div className="relative ml-4" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white hover:bg-[#f4f1ee] hover:bg-opacity-10 transition-colors"
                >
                  <img
                    src={user.avatar_url || '/images/default-avatar.png'}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="text-sm font-medium">{user.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
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
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          {user && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-white hover:bg-[#f4f1ee] hover:bg-opacity-10 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          )}

          {/* Login/Register Buttons for non-authenticated users */}
          {!user && (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-white hover:text-gray-200 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-white text-[#800000] px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {user && isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#f4f1ee] border-opacity-10 mt-2">
            {/* Mobile Profile Section */}
            <div className="px-4 py-4 border-b border-[#f4f1ee] border-opacity-10">
              <Link
                to="/profile"
                className="flex items-center space-x-3"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <img
                  src={user.avatar_url || '/images/default-avatar.png'}
                  alt="Profile"
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <div className="text-white font-medium">{user.username}</div>
                  <div className="text-gray-300 text-sm">View Profile</div>
                </div>
              </Link>
            </div>

            {/* Mobile Navigation Items */}
            <div className="px-2 py-3 space-y-1">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center px-4 py-3 rounded-lg text-base font-medium
                    ${isActive(path)
                      ? 'text-white bg-[#fff7ed] bg-opacity-10'
                      : 'text-white hover:bg-[#f4f1ee] hover:bg-opacity-10'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-6 w-6 mr-3" />
                  {label}
                </Link>
              ))}
              
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-white hover:bg-[#f4f1ee] hover:bg-opacity-10"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield className="h-6 w-6 mr-3" />
                  Admin Dashboard
                </Link>
              )}
              
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center w-full px-4 py-3 rounded-lg text-base font-medium text-white hover:bg-[#f4f1ee] hover:bg-opacity-10"
              >
                <LogOut className="h-6 w-6 mr-3" />
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}