-- Remove unused views to address security definer warnings
-- These views are not being used by the application and pose potential security risks

DROP VIEW IF EXISTS comment_details;
DROP VIEW IF EXISTS report_details; 