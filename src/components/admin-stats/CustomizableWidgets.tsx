import React, { useState } from 'react';
import { Eye, EyeOff, Settings, GripVertical, X } from 'lucide-react';

export interface Widget {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  order: number;
  category: 'reports' | 'users' | 'performance' | 'engagement';
}

interface CustomizableWidgetsProps {
  widgets: Widget[];
  onWidgetsChange: (widgets: Widget[]) => void;
  onSave: () => void;
}

export function CustomizableWidgets({ widgets, onWidgetsChange, onSave }: CustomizableWidgetsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  const toggleWidget = (widgetId: string) => {
    const updatedWidgets = widgets.map(w =>
      w.id === widgetId ? { ...w, visible: !w.visible } : w
    );
    onWidgetsChange(updatedWidgets);
  };

  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetId) return;

    const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = widgets.findIndex(w => w.id === targetId);

    const updatedWidgets = [...widgets];
    const [draggedItem] = updatedWidgets.splice(draggedIndex, 1);
    updatedWidgets.splice(targetIndex, 0, draggedItem);

    // Update order
    const reorderedWidgets = updatedWidgets.map((w, idx) => ({ ...w, order: idx }));
    onWidgetsChange(reorderedWidgets);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const resetToDefault = () => {
    const resetWidgets = widgets.map(w => ({ ...w, visible: true }));
    onWidgetsChange(resetWidgets);
  };

  const categories = Array.from(new Set(widgets.map(w => w.category)));
  const visibleCount = widgets.filter(w => w.visible).length;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        title="Customize Dashboard Widgets"
      >
        <Settings className="h-4 w-4 mr-2" />
        Customize
        <span className="ml-2 text-xs text-gray-500">
          ({visibleCount}/{widgets.length})
        </span>
      </button>

      {/* Widget Customization Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Customize Dashboard</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Show, hide, and reorder widgets to personalize your view
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {categories.map(category => {
                  const categoryWidgets = widgets.filter(w => w.category === category);
                  return (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 capitalize">
                          {category} Widgets
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {categoryWidgets.filter(w => w.visible).length} of {categoryWidgets.length} visible
                        </p>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        {categoryWidgets
                          .sort((a, b) => a.order - b.order)
                          .map((widget) => (
                            <div
                              key={widget.id}
                              draggable
                              onDragStart={() => handleDragStart(widget.id)}
                              onDragOver={(e) => handleDragOver(e, widget.id)}
                              onDragEnd={handleDragEnd}
                              className={`flex items-center gap-4 p-4 transition-colors ${
                                draggedWidget === widget.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                              } ${widget.visible ? '' : 'opacity-60'}`}
                            >
                              {/* Drag Handle */}
                              <button
                                className="cursor-move text-gray-400 hover:text-gray-600"
                                title="Drag to reorder"
                              >
                                <GripVertical className="h-5 w-5" />
                              </button>

                              {/* Widget Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{widget.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{widget.description}</p>
                              </div>

                              {/* Visibility Toggle */}
                              <button
                                onClick={() => toggleWidget(widget.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                  widget.visible
                                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {widget.visible ? (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    Visible
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    Hidden
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const allVisible = widgets.map(w => ({ ...w, visible: true }));
                      onWidgetsChange(allVisible);
                    }}
                    className="px-3 py-1.5 bg-white border border-blue-200 text-sm text-blue-700 rounded hover:bg-blue-50 transition-colors"
                  >
                    Show All
                  </button>
                  <button
                    onClick={() => {
                      const allHidden = widgets.map(w => ({ ...w, visible: false }));
                      onWidgetsChange(allHidden);
                    }}
                    className="px-3 py-1.5 bg-white border border-blue-200 text-sm text-blue-700 rounded hover:bg-blue-50 transition-colors"
                  >
                    Hide All
                  </button>
                  <button
                    onClick={resetToDefault}
                    className="px-3 py-1.5 bg-white border border-blue-200 text-sm text-blue-700 rounded hover:bg-blue-50 transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  💡 <strong>Tip:</strong> Drag widgets to reorder them. Your preferences will be saved automatically.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {visibleCount} widget{visibleCount !== 1 ? 's' : ''} visible
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSave();
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

