import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Heart,
  MessageCircle,
  Eye,
  X,
  Calendar,
  Hash,
  Star,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Report } from '../types';

/**
 * ReportsList Component
 * 
 * Displays the main reports listing with:
 * - Search and filter controls
 * - Mobile horizontal swipe list
 * - Desktop responsive grid with animations
 * - Empty state handling
 * - Interactive report cards with like/comment functionality
 * 
 * Customization:
 * - Adjust grid columns via grid-cols-* classes
 * - Modify filter options via CATEGORIES, STATUSES, PRIORITIES constants
 * - Update card styling and animations
 * - Customize empty state illustration
 */

// Filter options
const CATEGORIES = ['All', 'Infrastructure', 'Safety', 'Environmental', 'Public Services', 'Other'];
const STATUSES = ['All', 'Pending', 'In Progress', 'Resolved'];
const PRIORITIES = ['All', 'Low', 'Medium', 'High'];

interface ReportsListProps {
  reports: Report[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: {
    category: string;
    status: string;
    priority: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    category: string;
    status: string;
    priority: string;
  }>>;
  handleLike: (reportId: string) => void;
  likeLoading: { [key: string]: boolean };
  imageIndexById: { [key: string]: number };
  setImageIndexById: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  imageErrors: { [key: string]: boolean };
  handleImageError: (reportId: string) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getPriorityColor: (priority: string) => string;
  mobileListRef: React.RefObject<HTMLDivElement>;
  isRefreshing: boolean;
}

// Micro-animations: container and card variants
const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } }
} as const;

export function ReportsList({
  reports,
  loading,
  searchTerm,
  setSearchTerm,
  filters,
  setFilters,
  handleLike,
  likeLoading,
  imageIndexById,
  setImageIndexById,
  imageErrors,
  handleImageError,
  getStatusColor,
  getStatusIcon,
  getPriorityColor,
  mobileListRef,
  isRefreshing
}: ReportsListProps) {
  const navigate = useNavigate();
  
  // Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxReportTitle, setLightboxReportTitle] = useState('');

  // Keyboard support for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, lightboxImages.length]);

  // Function to open lightbox
  const openLightbox = (images: string[], index: number, reportTitle: string) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxReportTitle(reportTitle);
    setIsLightboxOpen(true);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 6;

  // Filter reports based on search term and filters
  const filteredReports = reports.filter(report => {
    // Always exclude verifying, awaiting_verification, and rejected reports from the main reports view
    if (report.status === 'verifying' || report.status === 'awaiting_verification' || report.status === 'rejected') {
      return false;
    }
    
    // Category filter
    const categoryMatch = filters.category === 'All' || 
      (report.category || '').toLowerCase().includes(filters.category.toLowerCase().replace(/_/g, ' '));
    
    // Status filter
    const statusMatch = filters.status === 'All' || 
      (report.status || '').toLowerCase() === filters.status.toLowerCase().replace(/\s+/g, '_');
    
    // Priority filter
    const priorityMatch = filters.priority === 'All' || 
      (report.priority || '').toLowerCase() === filters.priority.toLowerCase();
    
    // Search term filter
    const searchMatch = !searchTerm || 
      (report.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (report.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return categoryMatch && statusMatch && priorityMatch && searchMatch;
  });

  // Clear filters function
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      category: 'All',
      status: 'All',
      priority: 'All',
    });
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters.category, filters.status, filters.priority]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);
  const startIndex = (currentPage - 1) * reportsPerPage;
  const endIndex = startIndex + reportsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Reports</h2>
          <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
          <span>Showing {startIndex + 1}-{Math.min(endIndex, filteredReports.length)} of {filteredReports.length}</span>
          {totalPages > 1 && <span>• Page {currentPage} of {totalPages}</span>}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search reports by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                aria-label="Search reports"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              aria-label="Filter by category"
            >
              {CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              aria-label="Filter by status"
            >
              {STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
              aria-label="Filter by priority"
            >
              {PRIORITIES.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>

            {/* Clear Filters Button */}
            {(searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All') && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
                aria-label="Clear all filters"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile horizontal swipe list */}
      <div className="md:hidden">
        <div className="sticky top-[4.5rem] z-10 flex items-center justify-center py-1">
          {isRefreshing && (
            <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
              <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              Refreshing
            </div>
          )}
        </div>
        <div 
          ref={mobileListRef} 
          className="overflow-x-auto whitespace-nowrap pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory"
        >
          <div className="inline-flex gap-3 px-4">
            {paginatedReports.map((report) => (
              <div 
                key={report.id} 
                className="snap-start w-[85vw] max-w-[380px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer" 
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                {report.images && report.images.length > 0 ? (
                  <img 
                    src={report.images[0]} 
                    alt={report.title} 
                    className="w-full h-40 object-cover cursor-zoom-in" 
                    loading="lazy"
                    onClick={(e) => {
                      e.stopPropagation();
                      openLightbox(report.images, 0, report.title);
                    }}
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {report.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ${getStatusColor(report.status)}`}>
                      {report.status.replace('_',' ')}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Grid - Desktop */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-gray-200">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto mb-4 w-56 h-40 relative"
          >
            {/* Simple empty-state illustration */}
            <svg viewBox="0 0 300 220" className="absolute inset-0 w-full h-full">
              <defs>
                <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f1f5f9" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
              </defs>
              <rect x="0" y="120" width="300" height="80" fill="url(#g1)" rx="14" />
              <rect x="20" y="40" width="180" height="110" fill="#ffffff" rx="14" stroke="#e5e7eb" />
              <rect x="35" y="60" width="120" height="12" fill="#e5e7eb" rx="6" />
              <rect x="35" y="80" width="150" height="10" fill="#eef2f7" rx="5" />
              <rect x="35" y="98" width="100" height="10" fill="#eef2f7" rx="5" />
              <circle cx="230" cy="65" r="18" fill="#fee2e2" />
              <path d="M222 65h16" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
              <path d="M230 57v16" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {/* Floating pin */}
            <motion.div
              initial={{ y: -6 }}
              animate={{ y: 0 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.4, ease: 'easeInOut' }}
              className="absolute -top-2 right-10 text-gray-400"
            >
              <MapPin className="h-7 w-7" />
            </motion.div>
          </motion.div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">No reports found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All'
              ? 'Try adjusting your search or filters.'
              : 'Be the first to submit a report!'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => navigate('/reports/create')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#800000] text-white hover:bg-[#6e0000] text-sm font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create report
            </button>
            {(searchTerm || filters.category !== 'All' || filters.status !== 'All' || filters.priority !== 'All') && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {paginatedReports.map((report) => (
            <motion.div
              variants={cardVariants}
              key={report.id}
              className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-gray-300 overflow-hidden hover:-translate-y-1"
              onClick={() => navigate(`/reports/${report.id}`)}
            >
              {report.images && report.images.length > 0 && !imageErrors[report.id] ? (
                <div className="relative h-48 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const total = report.images.length;
                    const currentIndex = imageIndexById[report.id] ?? 0;
                    const setIndex = (next: number) => setImageIndexById(prev => ({ ...prev, [report.id]: ((next % total) + total) % total }));
                    return (
                      <>
                        <img
                          src={report.images[currentIndex]}
                          alt={report.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                          onError={() => handleImageError(report.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            openLightbox(report.images, currentIndex, report.title);
                          }}
                        />
                        {total > 1 && (
                          <>
                            <button
                              aria-label="Previous image"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow z-10"
                              onClick={(e) => { e.stopPropagation(); setIndex(currentIndex - 1); }}
                            >
                              ←
                            </button>
                            <button
                              aria-label="Next image"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow z-10"
                              onClick={(e) => { e.stopPropagation(); setIndex(currentIndex + 1); }}
                            >
                              →
                            </button>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                              {report.images.map((_, idx) => (
                                <button
                                  key={idx}
                                  aria-label={`Go to image ${idx + 1}`}
                                  onClick={(e) => { e.stopPropagation(); setIndex(idx); }}
                                  className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-blue-600' : 'bg-gray-300'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2 group-hover:text-gray-500 transition-colors duration-300" />
                    <p className="text-xs text-gray-500 font-medium">No Image</p>
                  </div>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2 group-hover:text-gray-700 transition-colors duration-200">
                    {report.title}
                  </h3>
                  {report.case_number && (
                    <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg ml-2 flex-shrink-0">
                      <Hash className="h-3 w-3 mr-1" />
                      <span className="font-medium">{report.case_number}</span>
                    </div>
                  )}
                </div>

                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-4">
                  {report.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusColor(report.status)}`}>
                    {getStatusIcon(report.status)}
                    <span className="ml-1.5">{report.status.replace('_', ' ')}</span>
                  </span>
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold ${getPriorityColor(report.priority)}`}>
                    {report.priority}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-2">
                    {report.user_profile?.avatar_url ? (
                      <img 
                        src={report.user_profile.avatar_url} 
                        alt={(report.user_profile as any).first_name || report.user_profile.username || 'User'} 
                        className="w-6 h-6 rounded-full object-cover ring-2 ring-gray-200" 
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold">
                        {(((report.user_profile as any).first_name || report.user_profile?.username || 'A') as string).slice(0,1).toUpperCase()}
                      </div>
                    )}
                    <span className="text-gray-700 font-medium truncate max-w-[120px]">
                      {(report.user_profile as any)?.first_name || report.user_profile?.username || 'Anonymous'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(report.id);
                      }}
                      disabled={likeLoading[report.id]}
                      className="flex items-center gap-1.5 text-sm transition-all duration-200 hover:scale-105 group/like"
                      aria-label={report.is_liked ? 'Unlike report' : 'Like report'}
                    >
                      {likeLoading[report.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <Heart 
                          className={`h-4 w-4 transition-all duration-200 ${
                            report.is_liked 
                              ? 'fill-red-500 text-red-500 group-hover/like:scale-110' 
                              : 'fill-none text-gray-400 hover:text-red-500 group-hover/like:scale-110'
                          }`} 
                        />
                      )}
                      <span className={`text-xs font-medium ${
                        report.is_liked ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {report.likes?.count || 0}
                      </span>
                    </button>
                    
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 hover:scale-105 group/comment">
                      <MessageCircle className="h-4 w-4 group-hover/comment:scale-110 transition-transform duration-200" />
                      <span className="text-xs font-medium">{report.comments?.count || 0}</span>
                    </div>
                    {typeof (report as any).rating_avg === 'number' && (report as any).rating_count > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-yellow-700">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                        <span className="text-xs font-medium">{(report as any).rating_avg}</span>
                        <span className="text-[11px] text-yellow-700">({(report as any).rating_count})</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reports/${report.id}`);
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-all duration-200 hover:scale-105 group/view px-2 py-1 rounded-lg hover:bg-gray-50"
                    title="View details"
                    aria-label="View report details"
                  >
                    <Eye className="h-4 w-4 group-hover/view:scale-110 transition-transform duration-200" />
                    <span className="font-medium">View</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Pagination Controls */}
      {filteredReports.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400'
            }`}
            aria-label="Previous page"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1);

              if (!showPage) {
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-2 text-gray-400">
                      ...
                    </span>
                  );
                }
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                    currentPage === page
                      ? 'bg-[#800000] text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400'
                  }`}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400'
            }`}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}

      {/* Lightbox for fullscreen image view */}
      {isLightboxOpen && lightboxImages.length > 0 && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[99999] bg-black flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
          style={{ margin: 0, padding: '1rem' }}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(false);
            }}
            aria-label="Close fullscreen"
          >
            <X className="w-10 h-10" />
          </button>

          {/* Image Counter */}
          {lightboxImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black bg-opacity-70 text-white text-sm px-4 py-2 rounded-full font-medium">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          )}

          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`${lightboxReportTitle} - Image ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain cursor-default"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Navigation Buttons */}
            {lightboxImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-xl transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-3 shadow-xl transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

