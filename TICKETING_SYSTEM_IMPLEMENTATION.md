# Ticketing System Implementation

## Overview
This implementation adds a comprehensive ticketing system to the patrol dashboard with case numbers, priority levels, assignment tracking, and comments system.

## Features Implemented

### 1. Case Number System
- **Unique Case Numbers**: Each report gets a unique 6-digit case number (e.g., #010001)
- **Auto-generation**: Case numbers are automatically generated when reports are created
- **Sequential Format**: Uses format `#XXXXXX` where X is a 6-digit number

### 2. Priority Level System
- **1-5 Scale**: Priority levels from 1 (lowest) to 5 (highest)
- **Visual Indicators**: Color-coded badges showing priority level
- **Default Level**: New reports default to level 3 (medium)

### 3. Assignment Tracking
- **Assigned Group**: Reports can be assigned to specific groups:
  - Engineering Group
  - Field Group
  - Maintenance Group
  - Other
- **Assigned Patroller**: Shows which patrol officer is handling the case
- **Visibility**: Assignment information is visible in both patrol and user views

### 4. Comments & Logs System
- **Comment Types**:
  - Comment: General comments
  - Status Update: Status change notifications
  - Assignment: Assignment notifications
  - Resolution: Resolution updates
- **Real-time Updates**: Comments are updated in real-time
- **User Attribution**: Comments show who made them and when
- **Edit/Delete**: Patrol officers can edit and delete their own comments

### 5. Ticket Cancellation
- **Cancel Option**: Reports can be cancelled with a reason
- **Duplicate Handling**: Helps manage duplicate reports
- **Audit Trail**: Cancellation reasons are logged as comments

### 6. Enhanced UI Features
- **Case Info Modal**: Detailed view of case information and comments
- **Quick Status Filters**: Easy filtering by status (Pending, In Progress, Resolved, Rejected)
- **Case Number Display**: Case numbers shown on report cards
- **Priority Indicators**: Visual priority level indicators
- **Assignment Status**: Clear indication of assignment status

## Database Schema Changes

### Reports Table Additions
```sql
-- New columns added to reports table
case_number TEXT UNIQUE                    -- Unique case identifier
priority_level INTEGER DEFAULT 3          -- 1-5 priority scale
assigned_group TEXT                       -- Assigned group
assigned_patroller_name TEXT              -- Assigned patroller name
can_cancel BOOLEAN DEFAULT true           -- Can be cancelled
```

### New Tables
```sql
-- Report comments table
CREATE TABLE report_comments (
    id UUID PRIMARY KEY,
    report_id UUID REFERENCES reports(id),
    user_id UUID REFERENCES auth.users(id),
    comment TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment',
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## API Services

### CommentsService
- `getComments(reportId)`: Get all comments for a report
- `addComment(reportId, comment, type)`: Add a new comment
- `updateComment(commentId, comment)`: Update an existing comment
- `deleteComment(commentId)`: Delete a comment
- `subscribeToCommentsChanges(reportId, callback)`: Real-time comment updates

### ReportsService Extensions
- `updateReportTicketing(reportId, updates)`: Update ticketing fields
- `cancelReport(reportId, reason)`: Cancel a report with reason
- `getReportWithComments(reportId)`: Get report with all comments

## UI Components

### CaseInfo Component
- Displays case number, priority level, assigned group, and patroller
- Shows all comments and logs with timestamps
- Allows adding new comments (patrol view only)
- Supports editing and deleting comments

### Enhanced Patrol Dashboard
- Case number display on report cards
- Priority level indicators
- Assignment status visibility
- Quick access to case details via hash button
- Enhanced report detail modal with ticketing information

### Enhanced Reports Page
- Case number display on report cards
- Quick status filter buttons
- Improved visual hierarchy

## Usage Instructions

### For Patrol Officers
1. **View Cases**: Click the hash (#) button on any report to view case details
2. **Assign Groups**: Use the case info modal to assign reports to groups
3. **Set Priority**: Adjust priority levels as needed
4. **Add Comments**: Add status updates, assignments, or general comments
5. **Cancel Tickets**: Cancel duplicate or invalid reports with reasons

### For Users
1. **View Case Numbers**: Case numbers are displayed on all report cards
2. **Track Progress**: See assignment status and priority levels
3. **View Comments**: See patrol officer updates and responses

## Database Migration

To apply the ticketing system to your database, run the SQL script in `apply_ticketing_system.sql` in your Supabase SQL Editor.

## Benefits

1. **Better Tracking**: Unique case numbers make it easy to reference specific reports
2. **Clear Assignment**: Know exactly which group and patroller is handling each case
3. **Priority Management**: Visual priority indicators help prioritize work
4. **Audit Trail**: Complete comment history for accountability
5. **Duplicate Management**: Easy cancellation of duplicate reports
6. **Improved Communication**: Two-way communication between users and patrol officers

## Future Enhancements

- Email notifications for status changes
- SMS alerts for high-priority cases
- Mobile app integration
- Advanced reporting and analytics
- Integration with external ticketing systems
- Automated assignment based on location or category
