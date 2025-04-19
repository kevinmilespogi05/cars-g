import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, Trophy, Map, User, LogOut, Shield, Menu, X, MessageSquare, FileText, Award } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Navigation() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/map-test', icon: Map, label: 'Map' },
    { path: '/leaderboard', icon: Award, label: 'Leaderboard' },
    { path: '/chat', icon: MessageSquare, label: 'Chat' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav 
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white shadow-md py-2' 
          : 'bg-white/90 backdrop-blur-sm py-4'
      }`}
    >
      <div className="container">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-gray-900 hover:text-primary-color transition-colors"
          >
            <Shield className="h-8 w-8" />
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
                    ? 'text-primary-color bg-primary-color bg-opacity-10' 
                    : 'text-gray-900 hover:text-primary-color hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden touch-target p-2 rounded-lg transition-colors text-gray-900 hover:text-primary-color hover:bg-gray-50"
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
          md:hidden absolute top-full left-0 right-0 
          transition-all duration-300 transform
          ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}
        `}
      >
        <div className="bg-white shadow-lg rounded-b-lg py-2 px-4 mx-4 space-y-1">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`
                flex items-center px-4 py-3 rounded-lg text-sm font-medium
                transition-colors duration-200
                ${isActive(path)
                  ? 'text-primary-color bg-primary-color bg-opacity-10'
                  : 'text-gray-900 hover:text-primary-color hover:bg-gray-50'
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