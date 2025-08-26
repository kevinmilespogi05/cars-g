# Admin Map Dashboard

## Overview

The Admin Map Dashboard is a new feature that provides administrators with a real-time, map-based view of all reports in the system. It allows admins to monitor report locations, receive instant notifications for new reports, and manage reports directly from the map interface.

## Features

### 🗺️ Interactive Map
- **OpenStreetMap Integration**: Uses OpenStreetMap tiles for reliable, free mapping
- **Real-time Updates**: Automatically updates when new reports are submitted
- **Location Pinning**: Each report is displayed as a colored marker on the map
- **Interactive Markers**: Click markers to view report details and take actions

### 📍 Smart Markers
- **Color-coded by Status**:
  - 🟡 **Yellow**: Pending reports
  - 🔵 **Blue**: In Progress reports
  - 🟢 **Green**: Resolved reports
  - 🔴 **Red**: Rejected reports
- **Priority Indicators**: High priority reports have more prominent styling
- **New Report Animation**: New reports appear with pulsing animation and notification

### 🔔 Real-time Notifications
- **Instant Alerts**: Receive notifications when new reports are submitted
- **Live Updates**: Map automatically refreshes with new data
- **Status Changes**: Real-time updates when report status changes
- **Toggle Control**: Enable/disable real-time updates as needed

### 🎛️ Advanced Controls
- **Search & Filter**: Find reports by title, description, or username
- **Status Filtering**: Filter markers by report status
- **Zoom Controls**: Easy zoom in/out with custom controls
- **Map Navigation**: Pan and zoom to explore different areas

### 📊 Report Management
- **Quick Actions**: Approve, reject, or resolve reports directly from the map
- **Detailed View**: Click markers to see full report information
- **Image Support**: View report images in the detail modal
- **Bulk Operations**: Manage multiple reports efficiently

## How to Use

### Accessing the Dashboard
1. Navigate to the Admin Dashboard
2. Click on the "Map View" tab
3. The map will load with all current reports displayed as markers

### Viewing Reports
- **Click any marker** to see report details
- **Hover over markers** to see basic information
- **Use the sidebar** to browse recent reports
- **Check the stats overlay** for quick counts

### Managing Reports
1. **Click a marker** to open the report detail modal
2. **Review the information** including images and location
3. **Take action** using the buttons at the bottom:
   - **Approve**: Move from pending to in-progress
   - **Reject**: Mark as rejected
   - **Resolve**: Mark as completed

### Filtering and Search
- **Search Bar**: Type to find specific reports
- **Status Filter**: Choose to show only certain statuses
- **Real-time Toggle**: Enable/disable live updates

## Technical Details

### Dependencies
- **Leaflet.js**: Open-source mapping library
- **OpenStreetMap**: Free map tiles and data
- **Supabase**: Real-time database subscriptions

### Real-time Features
- **WebSocket Integration**: Uses Supabase real-time subscriptions
- **Automatic Updates**: New reports appear instantly
- **Status Synchronization**: Changes reflect immediately across all clients

### Performance Optimizations
- **Lazy Loading**: Map loads only when needed
- **Efficient Markers**: Optimized marker rendering
- **Debounced Updates**: Prevents excessive API calls

## Configuration

### Map Settings
- **Default Center**: Lagos, Nigeria (6.5244, 3.3792)
- **Default Zoom**: Level 10 (city view)
- **Tile Provider**: OpenStreetMap (free, reliable)

### Marker Styling
- **Size**: 24x24 pixels
- **Colors**: Status-based color coding
- **Animations**: Pulse effect for new reports
- **Hover Effects**: Scale and shadow on hover

## Troubleshooting

### Common Issues

**Map Not Loading**
- Check internet connection
- Ensure Leaflet CSS is loaded
- Try refreshing the page
- Check browser console for errors

**No Reports Showing**
- Verify database connection
- Check if reports have location data
- Look for filter settings
- Check real-time subscription status

**Markers Not Updating**
- Ensure real-time is enabled
- Check WebSocket connection
- Verify database permissions
- Refresh the page if needed

### Performance Tips
- **Disable Real-time** if not needed for better performance
- **Use filters** to reduce marker count
- **Zoom in** to see more detail
- **Refresh periodically** if real-time is disabled

## Future Enhancements

### Planned Features
- **Heat Maps**: Show report density by area
- **Clustering**: Group nearby markers for better visibility
- **Custom Map Styles**: Different map themes and overlays
- **Export Functionality**: Download map data and reports
- **Mobile Optimization**: Touch-friendly controls and gestures

### Integration Opportunities
- **Weather Data**: Overlay weather conditions
- **Traffic Information**: Show traffic patterns
- **Population Density**: Demographic overlays
- **Historical Data**: Time-based report analysis

## Support

For technical support or feature requests related to the Admin Map Dashboard, please contact the development team or create an issue in the project repository.

---

**Note**: This dashboard requires admin privileges to access. Regular users will not be able to view or use this feature.
