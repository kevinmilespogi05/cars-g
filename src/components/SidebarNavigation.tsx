import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Award, User, LogOut, Shield, Menu, X, ChevronDown, MapPin, Megaphone, MessageCircle, Clock, Phone } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { ChatButton } from './ChatButton';
import { PhilippinesDateTime } from './PhilippinesDateTime';
import { QuickActions } from './QuickActions';

export function SidebarNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    const handleToggleSidebar = () => {
      setIsCollapsed(!isCollapsed);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('toggleSidebar', handleToggleSidebar);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  }, [isCollapsed]);

  // Navigation items based on user role
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
        { path: '/announcements', icon: Megaphone, label: 'Announcements' },
        { path: '/emergency-contacts', icon: Phone, label: 'Emergency Contacts' },
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
    <>
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full z-[2000] transition-all duration-300 shadow-xl ${
          isCollapsed ? 'w-16' : 'w-72'
        } ${
          isMobile && isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
        style={{backgroundColor: '#800000'}}
      >
        <div className="flex flex-col h-full">
          {/* Header with Logo and Collapse Button */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            {!isCollapsed && (
              <Link 
                to={user ? (user.role === 'admin' ? '/admin' : user.role === 'patrol' ? '/patrol' : '/reports') : '/login'}
                className="flex items-center space-x-3 text-white hover:text-gray-200 transition-colors group"
              >
                <img 
                  src="/images/logo.jpg" 
                  alt="CARS-G Logo" 
                  className="h-10 w-10 object-cover rounded-full shadow-md group-hover:shadow-lg transition-all duration-200 ring-2 ring-white/30 group-hover:ring-white/50"
                  loading="lazy"
                />
                <span className="text-xl font-bold text-white group-hover:text-gray-200 transition-colors leading-tight">CARS-G</span>
              </Link>
            )}
            {isCollapsed && (
              <Link 
                to={user ? (user.role === 'admin' ? '/admin' : user.role === 'patrol' ? '/patrol' : '/reports') : '/login'}
                className="flex items-center justify-center w-full"
              >
                <img 
                  src="/images/logo.jpg" 
                  alt="CARS-G Logo" 
                  className="h-10 w-10 object-cover rounded-full shadow-md hover:shadow-lg transition-all duration-200 ring-2 ring-white/30 hover:ring-white/50"
                  loading="lazy"
                />
              </Link>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Date and Time */}
          {!isCollapsed && (
            <div className="px-3 py-2 border-b border-white/20">
              <PhilippinesDateTime />
            </div>
          )}

          {/* Navigation Items */}
          {user && navItems.length > 0 && (
            <nav className="flex-1 px-3 py-4 space-y-2">
              {navItems.map(({ path, icon: Icon, label }) => {
                // Special styling for new navigation items
                const isNewItem = path === '/announcements' || path === '/emergency-contacts';
                const isEmergency = path === '/emergency-contacts';
                
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`
                      flex items-center px-3 py-3 rounded-xl text-sm font-medium 
                      transition-all duration-200 relative group min-h-[48px]
                      ${isActive(path)
                        ? 'text-white shadow-sm border border-white/30' 
                        : 'text-white hover:text-white hover:bg-white/10'
                      }
                      ${isNewItem ? 'ring-1 ring-white/20' : ''}
                      ${isEmergency ? 'hover:ring-red-300/50' : ''}
                    `}
                    style={isActive(path) ? {backgroundColor: '#660000'} : undefined}
                    title={isCollapsed ? label : undefined}
                  >
                    <Icon className={`h-5 w-5 transition-colors duration-200 ${
                      isActive(path) ? 'text-white' : 'text-white'
                    } ${isCollapsed ? '' : 'mr-3'} ${isEmergency ? 'text-red-200' : ''}`} />
                    {!isCollapsed && (
                      <>
                        <span className={isEmergency ? 'text-red-100' : ''}>{label}</span>
                        {isNewItem && (
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          </div>
                        )}
                        {isActive(path) && (
                          <div className="absolute right-2 w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
              
              {/* Chat Button - only for regular users (not admin or patrol) */}
              {user?.role !== 'admin' && user?.role !== 'patrol' && (
                <div className="pt-2">
                  <ChatButton 
                    adminId="admin" // This should be the actual admin user ID
                    className="w-full"
                    variant={isCollapsed ? 'icon' : 'full'}
                  />
                </div>
              )}
            </nav>
          )}


          {/* Quick Actions Section - only for regular users */}
          {user && user?.role !== 'admin' && user?.role !== 'patrol' && !isCollapsed && (
            <div className="px-3 py-4 border-t border-white/20">
              <div className="mb-2.5">
                <h2 className="text-sm font-semibold text-white mb-1">
                  Quick Actions
                </h2>
                <p className="text-xs text-white/70">
                  Access common tasks
                </p>
              </div>
              <QuickActions hideEmergencyActions variant="sidebar" />
            </div>
          )}

          {/* User Profile Section */}
          {user && (
            <div className="p-3 border-t border-white/20">
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center w-full px-3 py-3 rounded-xl text-white transition-all duration-200 hover:bg-white/10"
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
                  {!isCollapsed && (
                    <>
                      <div className="ml-3 flex-1 text-left">
                        <div className="text-sm font-medium truncate">{user.username}</div>
                        <div className="text-xs text-white/70 capitalize">{user.role}</div>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {isProfileMenuOpen && (
                  <div className={`absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-xl py-2 z-[3000] border border-gray-200/50 backdrop-blur-sm ${
                    isCollapsed ? 'left-16' : 'left-0'
                  }`}>
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

          {/* Login/Register for non-authenticated users */}
          {!user && (
            <div className="p-3 space-y-2">
              <Link 
                to="/login" 
                className="flex items-center justify-center px-3 py-2.5 rounded-xl text-white hover:bg-white/10 transition-colors font-medium"
              >
                {!isCollapsed && <span>Sign In</span>}
              </Link>
              <Link 
                to="/register" 
                className="flex items-center justify-center px-3 py-2.5 rounded-xl transition-all duration-200 font-semibold shadow-md hover:shadow-lg border border-white/30"
                style={{backgroundColor: '#660000'}}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#550000'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#660000'}
              >
                {!isCollapsed && <span>Get Started</span>}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay - only show when sidebar is expanded on mobile */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[1999] lg:hidden transition-opacity duration-300 ${
          !isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsCollapsed(true)}
      />
    </>
  );
}
