# Age-Based Usage Query - Problem Solved ✅

## Problem Summary
The age-based usage query was returning 0 values because of an incorrect date handling function in the SQL query.

## Root Cause
The database field `hr.view_hr.birth_date` is stored as a **timestamp** type, but the query was trying to use `TO_DATE(hr.birth_date, 'YYYY-MM-DD')` which is meant for converting strings to dates, not timestamps.

## Solution Applied

### File Modified
- **File**: `/server/models/dashboard.model.js`
- **Function**: `getAgeGroupUsage()` (lines 289-292)

### Change Made
**Before (BROKEN)**:
```sql
WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(hr.birth_date, 'YYYY-MM-DD'))) BETWEEN 20 AND 29 THEN '20-29세'
```

**After (FIXED)**:
```sql
WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 20 AND 29 THEN '20-29세'
```

The key change: `TO_DATE(hr.birth_date, 'YYYY-MM-DD')` → `hr.birth_date::date`

## Verification Results

✅ **Query now works successfully** and returns actual data:

### Current Data (June 2025):
- **20대**: 2,151 messages
- **30대**: 1,383 messages  
- **40대**: 341 messages
- **50대**: 873 messages

### Database Status:
- **Total employees with birth data**: 277 people
- **Age distribution**: 
  - 20-29세: 100 employees
  - 30-39세: 105 employees
  - 40-49세: 34 employees
  - 50-59세: 32 employees

## Expected Dashboard Behavior

The dashboard bar chart for "연령별 사용량" should now display:
1. X-axis labels: 20대, 30대, 40대, 50대
2. Y-axis values: Actual usage counts (2151, 1383, 341, 873)
3. No more "0" values across all age groups

## Database Connection Details
- **Host**: 211.43.205.49
- **Database**: aiagent
- **Schemas**: hr, aiagent_schema
- **Key tables**: hr.view_hr, aiagent_schema.user, aiagent_schema.archive_detail

## JOIN Relationship
```sql
hr.view_hr.email = aiagent_schema.user.user_id
```

## Testing
- ✅ Direct SQL query test: PASSED
- ✅ Dashboard model integration test: PASSED
- ✅ Data verification: PASSED

The age-based usage query is now fully functional and will provide meaningful data for the dashboard visualization.