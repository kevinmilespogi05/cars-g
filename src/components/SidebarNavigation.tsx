import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Award, User, LogOut, Shield, Menu, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Megaphone, MessageCircle, Clock, Phone, BarChart3, ClipboardList, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { ChatButton } from './ChatButton';
import { PhilippinesDateTime } from './PhilippinesDateTime';
import { QuickActions } from './QuickActions';
import { useSidebarContext } from '../contexts/SidebarContext';

export function SidebarNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { isCollapsed, setIsCollapsed, toggleSidebar } = useSidebarContext();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const dashboardDropdownRef = useRef<HTMLDivElement>(null);
  const manualToggleRef = useRef(false);
  
  // Dashboard dropdown state - persist in localStorage
  const [isDashboardOpen, setIsDashboardOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminDashboardDropdownOpen');
      return saved !== null ? saved === 'true' : true; // Default to open
    }
    return true;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close profile menu when clicking outside
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      
      // Close dashboard dropdown when clicking outside
      if (dashboardDropdownRef.current && !dashboardDropdownRef.current.contains(event.target as Node)) {
        if (isDashboardOpen && location.pathname !== '/admin') {
          setIsDashboardOpen(false);
          localStorage.setItem('adminDashboardDropdownOpen', 'false');
        }
      }
    };

    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Note: Collapsed state is managed by SidebarContext which handles mobile automatically
    };

    const handleToggleSidebar = () => {
      toggleSidebar();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('toggleSidebar', handleToggleSidebar);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  }, [isCollapsed, isDashboardOpen, location.pathname]);

  // Auto-open dashboard dropdown when on admin page and not collapsed
  // Close dropdown when navigating away from admin page
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (user?.role === 'admin' && !manualToggleRef.current) {
      if (location.pathname === '/admin' && !isCollapsed && !isDashboardOpen) {
        setIsDashboardOpen(true);
        localStorage.setItem('adminDashboardDropdownOpen', 'true');
      } else if (location.pathname !== '/admin' && isDashboardOpen) {
        // Close dropdown when navigating away from admin page
        setIsDashboardOpen(false);
        localStorage.setItem('adminDashboardDropdownOpen', 'false');
      }
    }
    
    // Reset manual toggle flag after a short delay
    if (manualToggleRef.current) {
      timer = setTimeout(() => {
        manualToggleRef.current = false;
      }, 100);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [location.pathname, isCollapsed, user?.role, isDashboardOpen]);

  // Dashboard submenu items for admin
  const dashboardSubmenuItems = [
    { section: 'reports', icon: FileText, label: 'Reports' },
    { section: 'requests', icon: ClipboardList, label: 'Requests' },
    { section: 'duty', icon: Clock, label: 'Duty' },
    { section: 'users', icon: User, label: 'Users' },
    { section: 'verification', icon: ShieldCheck, label: 'Verification' },
    { section: 'stats', icon: BarChart3, label: 'Statistics' },
    { section: 'announcements', icon: Megaphone, label: 'Announcements' }
  ];

  // Handle dashboard dropdown toggle
  const toggleDashboardDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark as manual toggle to prevent auto-open/close interference
    manualToggleRef.current = true;
    
    const newState = !isDashboardOpen;
    setIsDashboardOpen(newState);
    localStorage.setItem('adminDashboardDropdownOpen', String(newState));
  };

  // Navigation items based on user role
  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
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

  // Check if a dashboard submenu item is active
  const isDashboardSubmenuActive = (section: string) => {
    if (location.pathname !== '/admin') return false;
    const urlParams = new URLSearchParams(location.search);
    const activeSection = urlParams.get('section') || 'reports';
    return activeSection === section;
  };

  // Navigate to dashboard section
  const navigateToDashboardSection = (section: string) => {
    navigate(`/admin?section=${section}`);
    // Keep dropdown open when navigating within dashboard
    // Close sidebar on mobile after navigation
    if (isMobile) {
      setIsCollapsed(true);
    }
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
        className={`fixed left-0 top-0 h-full z-sidebar ${
          isCollapsed ? 'w-16' : 'w-72'
        } ${
          isMobile && isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
        style={{
          backgroundColor: '#800000',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        role="navigation"
        aria-label="Main navigation sidebar"
      >
        <div className="flex flex-col h-full overflow-hidden relative">
          {/* Header with Logo and Collapse Button */}
          <div className={`flex items-center border-b border-white/20 ${
            isCollapsed ? 'justify-center p-3' : 'justify-between p-4'
          }`}>
            {!isCollapsed && (
              <Link 
                to={user ? (user.role === 'admin' ? '/admin' : user.role === 'patrol' ? '/patrol' : '/reports') : '/login'}
                className="flex items-center space-x-3 text-white hover:text-gray-200 transition-colors group flex-1"
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
              <>
                <Link 
                  to={user ? (user.role === 'admin' ? '/admin' : user.role === 'patrol' ? '/patrol' : '/reports') : '/login'}
                  className="flex items-center justify-center flex-1"
                >
                  <img 
                    src="/images/logo.jpg" 
                    alt="CARS-G Logo" 
                    className="h-10 w-10 object-cover rounded-full shadow-md hover:shadow-lg transition-all duration-200 ring-2 ring-white/30 hover:ring-white/50"
                    loading="lazy"
                  />
                </Link>
                {!isMobile && (
                  <button
                    onClick={toggleSidebar}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleSidebar();
                      }
                    }}
                    className="p-2 rounded-lg text-white hover:bg-white/15 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#800000] group"
                    aria-label="Expand navigation sidebar"
                    aria-expanded={false}
                    title="Expand sidebar"
                  >
                    <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                  </button>
                )}
              </>
            )}
            {!isMobile && !isCollapsed && (
              <button
                onClick={toggleSidebar}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSidebar();
                  }
                }}
                className="p-2 rounded-lg text-white hover:bg-white/15 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#800000] group"
                aria-label="Collapse navigation sidebar"
                aria-expanded={true}
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Date and Time */}
          {!isCollapsed && (
            <div className="px-3 py-2 border-b border-white/20">
              <PhilippinesDateTime />
            </div>
          )}

          {/* Navigation Items */}
          {user && (
            <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-4 ${
              isCollapsed ? 'px-2' : 'px-3'
            } space-y-1`}>
              {/* Dashboard Dropdown for Admin */}
              {user?.role === 'admin' && (
                <div className="mb-1" ref={dashboardDropdownRef}>
                  <div className="relative">
                    {/* Dashboard Main Container */}
                    <div
                      className={`
                        flex items-center w-full relative group transition-all duration-200 ease-in-out
                        ${isCollapsed 
                          ? 'justify-center px-0 py-3 rounded-lg min-h-[48px]' 
                          : 'px-3 py-3 rounded-xl min-h-[48px]'
                        }
                        ${isActive('/admin')
                          ? 'text-white shadow-sm border border-white/30' 
                          : 'text-white hover:text-white'
                        }
                        ${isActive('/admin') && isCollapsed ? 'bg-[#660000]' : ''}
                        ${!isActive('/admin') ? 'hover:bg-white/15' : ''}
                        ${isDashboardOpen && !isCollapsed ? 'bg-[#660000]' : ''}
                      `}
                      style={
                        (isActive('/admin') || (isDashboardOpen && !isCollapsed)) && !isCollapsed 
                          ? {
                              backgroundColor: '#660000',
                              borderLeft: isDashboardOpen ? '3px solid #ffffff' : undefined
                            } 
                          : undefined
                      }
                    >
                      <Link
                        to="/admin"
                        className={`flex items-center flex-1 ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? 'Dashboard' : undefined}
                        onClick={(e) => {
                          // Prevent link navigation if clicking on the container with dropdown
                          if (isMobile) {
                            setIsCollapsed(true);
                          }
                        }}
                      >
                        <LayoutDashboard className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 text-white ${isCollapsed ? '' : 'mr-3'}`} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium">Dashboard</span>
                        )}
                      </Link>
                      {!isCollapsed && (
                        <>
                          <button
                            type="button"
                            onClick={toggleDashboardDropdown}
                            className="ml-2 p-1.5 rounded-lg hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 z-10 relative"
                            aria-label={isDashboardOpen ? 'Collapse dashboard menu' : 'Expand dashboard menu'}
                            aria-expanded={isDashboardOpen}
                            title={isDashboardOpen ? 'Collapse menu' : 'Expand menu'}
                          >
                            <ChevronDown className={`h-4 w-4 flex-shrink-0 text-white/90 hover:text-white transition-transform duration-300 ease-in-out ${
                              isDashboardOpen ? 'rotate-180' : 'rotate-0'
                            }`} />
                          </button>
                          {isActive('/admin') && !isDashboardOpen && (
                            <div className="absolute right-3 w-2 h-2 bg-white rounded-full pointer-events-none"></div>
                          )}
                        </>
                      )}
                      {isActive('/admin') && isCollapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                      )}
                    </div>

                    {/* Dashboard Submenu */}
                    {!isCollapsed && (
                      <div 
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isDashboardOpen ? 'max-h-[500px] opacity-100 visible' : 'max-h-0 opacity-0 invisible'
                        }`}
                        style={{
                          transitionProperty: 'max-height, opacity, visibility',
                          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                          pointerEvents: isDashboardOpen ? 'auto' : 'none'
                        }}
                        aria-hidden={!isDashboardOpen}
                      >
                        <div className="ml-4 mt-1 mb-1 space-y-1 border-l-2 border-white/20 pl-3">
                          {dashboardSubmenuItems.map(({ section, icon: Icon, label }) => {
                            const isSubmenuActive = isDashboardSubmenuActive(section);
                            return (
                              <button
                                key={section}
                                onClick={() => navigateToDashboardSection(section)}
                                className={`
                                  w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out
                                  ${isSubmenuActive
                                    ? 'bg-white/25 text-white shadow-sm'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                  }
                                `}
                                style={{
                                  fontSize: '14px'
                                }}
                              >
                                <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                                <span className="flex-1 text-left">{label}</span>
                                {isSubmenuActive && (
                                  <div className="w-1.5 h-1.5 bg-white rounded-full ml-2"></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Navigation Items */}
              {navItems.length > 0 && navItems.map(({ path, icon: Icon, label }) => {
                // Special styling for new navigation items
                const isNewItem = path === '/announcements' || path === '/emergency-contacts';
                const isEmergency = path === '/emergency-contacts';
                
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => {
                      // Close dashboard dropdown when clicking other nav items
                      if (isDashboardOpen && path !== '/admin') {
                        setIsDashboardOpen(false);
                        localStorage.setItem('adminDashboardDropdownOpen', 'false');
                      }
                      // Close sidebar on mobile after navigation
                      if (isMobile) {
                        setIsCollapsed(true);
                      }
                    }}
                    className={`
                      flex items-center relative group transition-all duration-200 ease-in-out
                      ${isCollapsed 
                        ? 'justify-center px-0 py-3 rounded-lg min-h-[48px]' 
                        : 'px-3 py-3 rounded-xl min-h-[48px]'
                      }
                      ${isActive(path)
                        ? 'text-white shadow-sm border border-white/30' 
                        : 'text-white hover:text-white'
                      }
                      ${isActive(path) && isCollapsed ? 'bg-[#660000]' : ''}
                      ${!isActive(path) ? 'hover:bg-white/15' : ''}
                      ${isNewItem && !isCollapsed ? 'ring-1 ring-white/20' : ''}
                    `}
                    style={isActive(path) && !isCollapsed ? {backgroundColor: '#660000'} : undefined}
                    title={isCollapsed ? label : undefined}
                  >
                    <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''} ${isCollapsed ? '' : 'w-full'}`}>
                      <Icon className={`h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                        isEmergency && !isActive(path) ? 'text-red-200' : 'text-white'
                      } ${isCollapsed ? '' : 'mr-3'}`} />
                      {!isCollapsed && (
                        <>
                          <span className={`text-sm font-medium flex-1 ${isEmergency && !isActive(path) ? 'text-red-100' : ''}`}>
                            {label}
                          </span>
                          {isActive(path) && (
                            <div className="absolute right-3 w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </>
                      )}
                    </div>
                    {isActive(path) && isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                    )}
                  </Link>
                );
              })}
              
              {/* Chat Button - only for regular users (not admin or patrol) */}
              {user?.role !== 'admin' && user?.role !== 'patrol' && (
                <div className={`pt-2 ${isCollapsed ? 'px-0' : 'px-0'}`}>
                  <ChatButton 
                    adminId="admin" // This should be the actual admin user ID
                    className={isCollapsed ? 'w-full justify-center' : 'w-full'}
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
            <div className={`border-t border-white/20 ${isCollapsed ? 'p-2' : 'p-3'}`}>
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className={`flex items-center w-full rounded-xl text-white transition-all duration-200 ease-in-out hover:bg-white/15 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#800000] ${
                    isCollapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'
                  }`}
                  aria-label={isCollapsed ? 'Open user profile menu' : `Open profile menu for ${user.username}`}
                  aria-expanded={isProfileMenuOpen}
                  title={isCollapsed ? `${user.username} - ${user.role}` : undefined}
                >
                  <div className="relative flex-shrink-0">
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
                      <div className="ml-3 flex-1 text-left min-w-0">
                        <div className="text-sm font-medium truncate">{user.username}</div>
                        <div className="text-xs text-white/70 capitalize">{user.role}</div>
                      </div>
                      <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {isProfileMenuOpen && (
                  <div 
                    className={`absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-xl py-2 z-popup border border-gray-200/50 backdrop-blur-sm ${
                      isCollapsed ? 'left-16' : 'left-0'
                    }`}
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

          {/* Login/Register for non-authenticated users */}
          {!user && (
            <div className={`space-y-2 ${isCollapsed ? 'p-2' : 'p-3'}`}>
              <Link 
                to="/login" 
                className={`flex items-center justify-center rounded-xl text-white hover:bg-white/15 transition-all duration-200 ease-in-out font-medium min-h-[44px] ${
                  isCollapsed ? 'px-0 py-3' : 'px-3 py-2.5'
                }`}
                title={isCollapsed ? 'Sign In' : undefined}
              >
                {!isCollapsed && <span>Sign In</span>}
                {isCollapsed && <User className="h-5 w-5" aria-hidden="true" />}
              </Link>
              <Link 
                to="/register" 
                className={`flex items-center justify-center rounded-xl transition-all duration-200 ease-in-out font-semibold shadow-md hover:shadow-lg border border-white/30 min-h-[44px] ${
                  isCollapsed ? 'px-0 py-3' : 'px-3 py-2.5'
                }`}
                style={{backgroundColor: '#660000'}}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#550000'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#660000'}
                title={isCollapsed ? 'Get Started' : undefined}
              >
                {!isCollapsed && <span>Get Started</span>}
                {isCollapsed && <Award className="h-5 w-5" aria-hidden="true" />}
              </Link>
            </div>
          )}

        </div>
      </aside>

      {/* Mobile Overlay - only show when sidebar is expanded on mobile */}
      <div 
        className={`fixed inset-0 bg-black/50 z-overlay lg:hidden transition-opacity duration-300 ${
          !isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsCollapsed(true)}
        aria-hidden="true"
      />
    </>
  );
}
