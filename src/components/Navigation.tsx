import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, Trophy, Map, User, LogOut, Shield, Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Navigation() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/reports', icon: MapPin, label: 'Reports' },
    { path: '/reports/create', icon: MapPin, label: 'New Report' },
    { path: '/map-test', icon: Map, label: 'Map Test' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  ];

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white shadow-md py-2' 
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <span className={`text-2xl font-bold ${isScrolled ? 'text-primary-color' : 'text-white'}`}>
                CARS-G
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navItems.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive(path)
                    ? isScrolled 
                      ? 'text-primary-color bg-gray-100' 
                      : 'text-white bg-primary-color bg-opacity-20'
                    : isScrolled
                      ? 'text-gray-700 hover:text-primary-color hover:bg-gray-50'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive('/admin')
                    ? isScrolled 
                      ? 'text-secondary-dark bg-gray-100' 
                      : 'text-white bg-secondary-dark bg-opacity-20'
                    : isScrolled
                      ? 'text-gray-700 hover:text-secondary-dark hover:bg-gray-50'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <Shield className="h-5 w-5 mr-2" />
                Admin
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/profile"
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive('/profile')
                      ? isScrolled 
                        ? 'text-primary-color bg-gray-100' 
                        : 'text-white bg-primary-color bg-opacity-20'
                      : isScrolled
                        ? 'text-gray-700 hover:text-primary-color hover:bg-gray-50'
                        : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  <User className="h-5 w-5 mr-2" />
                  Profile
                </Link>
                <button
                  onClick={signOut}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isScrolled
                      ? 'text-gray-700 hover:text-danger-color hover:bg-gray-50'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-color hover:bg-primary-dark transition-colors duration-200"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md ${
                isScrolled
                  ? 'text-gray-700 hover:text-primary-color hover:bg-gray-50'
                  : 'text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 inset-x-0 bg-white shadow-lg rounded-b-lg py-2 px-4 transition-all duration-300 slide-up">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive(path)
                  ? 'text-primary-color bg-gray-100'
                  : 'text-gray-700 hover:text-primary-color hover:bg-gray-50'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </div>
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/admin')
                  ? 'text-secondary-dark bg-gray-100'
                  : 'text-gray-700 hover:text-secondary-dark hover:bg-gray-50'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Admin
              </div>
            </Link>
          )}
          {user ? (
            <>
              <Link
                to="/profile"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/profile')
                    ? 'text-primary-color bg-gray-100'
                    : 'text-gray-700 hover:text-primary-color hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Profile
                </div>
              </Link>
              <button
                onClick={() => {
                  signOut();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-danger-color hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </div>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="block px-3 py-2 rounded-md text-base font-medium text-white bg-primary-color hover:bg-primary-dark"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center justify-center">
                Sign In
              </div>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}