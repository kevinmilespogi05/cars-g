# Anonymous Reporting Feature

## Overview

The anonymous reporting feature allows users to submit reports without revealing their identity publicly, providing a safe way to report sensitive issues while maintaining accountability through backend tracking.

## Implementation Summary

### ✅ What Was Implemented

1. **Database Schema**
   - Added `is_anonymous` boolean column to the `reports` table
   - Defaults to `false` for existing and new reports
   - Indexed for query performance

2. **Frontend UI**
   - Added a user-friendly toggle on the Create Report form
   - Visual indicators (shield icon) for anonymous mode
   - Dynamic UI that shows/hides points reward based on selection
   - Clear messaging about privacy implications

3. **Backend Integration**
   - Updated API endpoint to accept and store `is_anonymous` flag
   - Modified reports service to handle anonymous reports
   - Points system skips awarding points for anonymous reports

4. **Display Components**
   - Reports list shows "Anonymous Reporter" instead of username
   - Report detail page hides user identity for anonymous reports
   - Special avatar with "?" symbol for anonymous reports

## How It Works

### User Experience

1. **Creating Anonymous Report**
   - User navigates to Create Report page
   - Below the form fields, there's a prominent toggle box:
     - ☑️ **"Submit Anonymously"** checkbox
     - Eye/EyeOff icon indicates current state
     - Clear explanation of what anonymous means
   
2. **Anonymous Mode Benefits**
   - ✅ Identity hidden from public view
   - ✅ Only admins can see reporter info (for moderation)
   - ✅ Users can still manage their own anonymous reports
   - ⚠️ No points awarded for anonymous reports

3. **Public Display**
   - Anonymous reports show:
     - Avatar: Blue circle with "?" symbol
     - Name: "Anonymous Reporter"
     - All other report details remain visible

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Creates Report                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            Toggle: Submit Anonymously (ON/OFF)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Report Submitted                            │
│  • user_id: STORED (for admin/moderation)                   │
│  • is_anonymous: true/false                                  │
│  • points: NOT awarded if anonymous                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Display Logic                              │
│  IF is_anonymous = true:                                     │
│    • Show "Anonymous Reporter"                               │
│    • Hide avatar/username                                    │
│  ELSE:                                                       │
│    • Show actual user profile                                │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified

### Database
- `supabase/migrations/20250314000001_add_anonymous_reports.sql` - New migration

### Frontend (React/TypeScript)
- `src/types/index.ts` - Added `is_anonymous` field to Report interface
- `src/pages/CreateReport.tsx` - Added anonymous toggle UI
- `src/services/reportsService.ts` - Updated report creation service
- `src/components/ReportsList.tsx` - Updated report cards display
- `src/pages/ReportDetail.tsx` - Updated report detail page

### Backend (Node.js/Express)
- `server/server.js` - Updated POST `/api/reports` endpoint

## Security & Privacy Considerations

### ✅ Privacy Protected
- User identity is hidden from:
  - Public report listings
  - Report detail pages
  - Other users
  - Leaderboards (anonymous reports don't affect rankings)

### ✅ Accountability Maintained
- User ID is still stored in the database
- Admins can view the real reporter for:
  - Abuse prevention
  - Moderation purposes
  - Investigation if needed
  - Contacting reporter if necessary

### ✅ Data Integrity
- All reports maintain referential integrity
- No orphaned reports
- Easy to filter/query anonymous vs. non-anonymous reports
- Audit trails remain intact

## Usage Guidelines

### When to Use Anonymous Reporting

**Recommended for:**
- Safety concerns (reporting dangerous situations)
- Whistleblowing
- Sensitive issues that might cause retaliation
- Personal privacy concerns
- Controversial topics

**Not Recommended for:**
- General issues (users earn points for public reports)
- Building community reputation
- Establishing credibility
- Follow-up requiring direct contact

## Future Enhancements (Optional)

### Possible Improvements
1. **Optional Contact Method**
   - Allow anonymous reporters to provide optional anonymous contact (email/phone)
   - Only visible to admins

2. **Anonymous Comments**
   - Extend anonymity to comments on reports
   - Allow report owner to remain anonymous in discussions

3. **Partial Anonymity**
   - Show partial info like "User from [City]"
   - Display report count without identity

4. **Admin Dashboard**
   - Statistics on anonymous vs. public reports
   - Filter views for anonymous reports
   - Contact management for anonymous reporters

5. **Selective Deanonymization**
   - Allow users to "claim" their anonymous reports later
   - Retroactively award points if desired

## Testing Checklist

- [x] Database migration runs successfully
- [x] Toggle appears on Create Report form
- [x] Anonymous reports save with correct flag
- [x] Points are NOT awarded for anonymous reports
- [x] Points ARE awarded for non-anonymous reports
- [x] Reports list shows "Anonymous Reporter"
- [x] Report detail page hides identity
- [x] Backend API accepts is_anonymous field
- [x] No TypeScript/linter errors

## Deployment Steps

### 1. Run Database Migration
```bash
# Apply the migration to your Supabase database
# Navigate to Supabase Dashboard → SQL Editor
# Run: supabase/migrations/20250314000001_add_anonymous_reports.sql
```

### 2. Deploy Backend Changes
```bash
cd server
npm install  # If needed
# Deploy to your hosting service (Render, Heroku, etc.)
```

### 3. Deploy Frontend Changes
```bash
npm install  # If needed
npm run build
# Deploy to Vercel/Netlify/your hosting service
```

### 4. Verify Deployment
1. Create a test report in anonymous mode
2. Verify identity is hidden on reports list
3. Check report detail page
4. Verify no points were awarded
5. As admin, verify user_id is still stored in database

## Support & Questions

If users have questions about anonymous reporting:

**For Users:**
- "Your identity will be completely hidden from other users"
- "Only system administrators can see your information for safety"
- "You won't earn points, but you'll be helping the community safely"

**For Admins:**
- Access the database directly to see reporter IDs
- Use Supabase dashboard to filter `is_anonymous = true`
- Contact reporters through their stored user_id if needed

## Configuration

No additional configuration required! The feature works out-of-the-box after deployment.

### Optional: Adjust UI Text
Edit these files to customize messaging:
- `src/pages/CreateReport.tsx` (lines 831-874) - Toggle UI text
- `src/components/ReportsList.tsx` (lines 525-553) - List display text
- `src/pages/ReportDetail.tsx` (lines 1351-1371) - Detail page text

---

**Feature Status:** ✅ Complete and Ready for Production

**Last Updated:** October 14, 2025

