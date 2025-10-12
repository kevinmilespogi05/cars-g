import React, { useState } from 'react';
import { HelpCircle, Book, FileText, Video, MessageCircle, ExternalLink, Search, X } from 'lucide-react';

interface HelpItem {
  id: string;
  title: string;
  description: string;
  type: 'guide' | 'video' | 'faq' | 'article';
  url?: string;
}

const helpResources: HelpItem[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Statistics Dashboard',
    description: 'Learn the basics of navigating and understanding your admin dashboard',
    type: 'guide',
    url: '/docs/admin-dashboard-guide'
  },
  {
    id: 'filters',
    title: 'Using Advanced Filters',
    description: 'How to filter data by category, location, status, and custom criteria',
    type: 'article',
    url: '/docs/advanced-filters'
  },
  {
    id: 'sla',
    title: 'Understanding SLA Metrics',
    description: 'Learn about SLA targets, warnings, and breach alerts',
    type: 'guide',
    url: '/docs/sla-metrics'
  },
  {
    id: 'export',
    title: 'Exporting and Sharing Data',
    description: 'Export reports to CSV/PDF and share dashboard snapshots',
    type: 'article',
    url: '/docs/export-share'
  },
  {
    id: 'video-overview',
    title: 'Dashboard Overview (Video)',
    description: '5-minute walkthrough of all dashboard features',
    type: 'video',
    url: '/videos/dashboard-overview'
  },
  {
    id: 'faq-trends',
    title: 'FAQ: How do I interpret trend indicators?',
    description: 'Understanding percentage changes and trend arrows',
    type: 'faq'
  },
  {
    id: 'faq-anomalies',
    title: 'FAQ: What are anomaly alerts?',
    description: 'Learn about automatic anomaly detection and what to do',
    type: 'faq'
  },
  {
    id: 'widgets',
    title: 'Customizing Dashboard Widgets',
    description: 'Show, hide, and reorder widgets to personalize your dashboard',
    type: 'article',
    url: '/docs/customize-widgets'
  },
];

interface HelpDocumentationProps {
  onContactSupport?: () => void;
}

export function HelpDocumentation({ onContactSupport }: HelpDocumentationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide':
        return <Book className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'faq':
        return <MessageCircle className="h-4 w-4" />;
      case 'article':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'guide':
        return 'bg-blue-100 text-blue-700';
      case 'video':
        return 'bg-purple-100 text-purple-700';
      case 'faq':
        return 'bg-green-100 text-green-700';
      case 'article':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredResources = helpResources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    return matchesSearch && matchesType;
  });

  const types = ['all', 'guide', 'article', 'video', 'faq'];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        title="Help & Documentation"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help
      </button>

      {/* Help Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Help & Documentation</h3>
                    <p className="text-sm text-blue-100 mt-0.5">Learn how to use the dashboard effectively</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20 rounded p-1.5 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search help articles..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Type Filter */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {types.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                        selectedType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {type === 'all' ? 'All Resources' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredResources.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No resources found matching your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredResources.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url || '#'}
                      target={resource.url ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      className="block p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(resource.type)}`}>
                          {getTypeIcon(resource.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {resource.title}
                            </h4>
                            {resource.url && (
                              <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{resource.description}</p>
                          <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(resource.type)}`}>
                            {getTypeIcon(resource.type)}
                            {resource.type}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Quick Links */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <a
                    href="/docs/admin-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm text-blue-700 font-medium"
                  >
                    <Book className="h-4 w-4" />
                    Admin Guide
                  </a>
                  <a
                    href="/docs/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-sm text-purple-700 font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    API Docs
                  </a>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onContactSupport?.();
                    }}
                    className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm text-green-700 font-medium"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Contact Support
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                Can't find what you're looking for?{' '}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onContactSupport?.();
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Contact support
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

