# Database Age-Based Usage Query Analysis Report

## Issues Found and Solutions

### 1. **Primary Issue: Incorrect Date Handling**

**Problem**: The original query was using `TO_DATE(hr.birth_date, 'YYYY-MM-DD')` but `hr.view_hr.birth_date` is already a `timestamp` type, not a string.

**Original Code (BROKEN)**:
```sql
EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(hr.birth_date, 'YYYY-MM-DD')))
```

**Fixed Code**:
```sql
EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date))
```

### 2. **Database Structure Analysis**

#### Schema Information:
- **hr.view_hr.birth_date**: `timestamp without time zone` (NOT string)
- **hr.view_hr.email**: Maps to `aiagent_schema.user.user_id`
- **hr.view_hr.is_worked**: Text field with values like '재직'
- **aiagent_schema.archive_detail**: Contains all chat messages with timestamp

#### JOIN Relationship:
```sql
hr.view_hr.email = aiagent_schema.user.user_id
```

### 3. **Data Verification Results**

#### Current Status (June 2025):
- **Total employees with birth_date and active status**: 277
- **Age distribution**:
  - 20-29세: 100 employees (2,179 messages in last 30 days)
  - 30-39세: 105 employees (1,405 messages)
  - 40-49세: 34 employees (349 messages)
  - 50-59세: 32 employees (887 messages)
  - 기타: 6 employees (30 messages)

### 4. **Corrected Query**

```sql
SELECT 
  CASE 
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 20 AND 29 THEN '20-29세'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 30 AND 39 THEN '30-39세'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 40 AND 49 THEN '40-49세'
    WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 50 AND 59 THEN '50-59세'
    ELSE '기타'
  END as age_group,
  COUNT(ad.message) as usage_count
FROM aiagent_schema.archive_detail ad
JOIN aiagent_schema.user u ON ad.user_id = u.user_id
JOIN hr.view_hr hr ON u.user_id = hr.email
WHERE u.dept NOT IN ('admin', 'Biz AI사업부')
  AND ad.chat_time BETWEEN $1 AND $2
  AND hr.birth_date IS NOT NULL
  AND hr.is_worked = '재직'
  AND ad.message IS NOT NULL
GROUP BY age_group
ORDER BY age_group
```

### 5. **Why the Original Query Returned 0**

1. **Type Mismatch**: `TO_DATE()` function was trying to convert a timestamp to date using a format string, which caused an error
2. **PostgreSQL Error**: `function to_date(timestamp without time zone, unknown) does not exist`
3. **Data Filtering**: The error prevented any results from being returned

### 6. **Solution Implementation**

The fix requires updating the `dashboard.model.js` file to use the correct date casting:

**Change this line**:
```sql
WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(hr.birth_date, 'YYYY-MM-DD'))) BETWEEN 20 AND 29 THEN '20-29세'
```

**To this**:
```sql
WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, hr.birth_date::date)) BETWEEN 20 AND 29 THEN '20-29세'
```

### 7. **Expected Results After Fix**

Based on current data, the age-based usage chart should show:
- **20대**: ~2,100-2,200 messages
- **30대**: ~1,400 messages  
- **40대**: ~340-350 messages
- **50대**: ~880-900 messages

This will provide meaningful data for the bar chart visualization.

### 8. **Database Configuration**

**Connection Details** (from .env):
- Host: 211.43.205.49
- Database: aiagent
- User: aspn2
- Port: 5432

**Files to Update**:
- `/server/models/dashboard.model.js` (line 289-292)