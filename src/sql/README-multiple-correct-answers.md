# Multiple Correct Answers Feature

This update adds support for multiple correct answers in questions and unlimited options.

## Changes Made

### Database Schema
- Updated `questions` table: `correct_option` column changed from `integer` to `integer[]`
- Created migration script: `migration-multiple-correct-answers.sql`

### Backend Changes
- Updated `Question` interface to support `correct_option: number[]`
- Modified question controller to handle array of correct answers
- Updated score calculation logic in aptitude and user controllers
- Updated AI explanation to handle multiple correct answers

### Frontend Changes
- Updated `Question` type to support `correct_option: number[]`
- Enhanced `AddQuestionDialog` component:
  - Added unlimited options support with add/remove buttons
  - Added checkboxes for multiple correct answer selection
  - Updated validation logic
- Updated `AptitudeQuestions` and `AptitudeResult` components to display multiple correct answers

## Migration Instructions

### For New Installations
If you're setting up the database for the first time, the schema already includes the updated structure.

### For Existing Installations
If you have an existing database, run the migration script:

```sql
-- Run this in your PostgreSQL database
\i ppp-server/src/sql/migration-multiple-correct-answers.sql
```

This migration will:
1. Add a temporary column for the new array format
2. Convert existing single correct_option values to arrays
3. Drop the old column and rename the new one
4. Make the column NOT NULL

## Features

### Unlimited Options
- Questions can now have any number of options (minimum 2)
- Add/remove options dynamically in the question creation form
- Options are automatically renumbered when removed

### Multiple Correct Answers
- Questions can have multiple correct answers
- Users can select multiple correct answers using checkboxes
- Score calculation considers any of the correct answers as valid
- Display logic shows all correct answers highlighted in green

### Backward Compatibility
- Existing questions with single correct answers are automatically converted to arrays
- All existing functionality continues to work
- API responses maintain the same structure

## Usage

### Creating Questions with Multiple Correct Answers
1. Go to the Question Set page
2. Click "Add Question"
3. Fill in the question details
4. Add options using the "Add Option" button
5. Check the "Correct" checkbox for each correct answer
6. Save the question

### Viewing Questions
- Questions with multiple correct answers will show all correct options highlighted in green
- The correct answers are displayed as "Option 1, Option 3" format

## API Changes

### Question Creation
- `correct_option` now accepts an array of numbers
- Example: `"correct_option": [1, 3]` for options 1 and 3 being correct

### Question Retrieval
- `correct_option` is returned as an array of numbers
- Example: `"correct_option": [1, 3]`

### Score Calculation
- Any selected option that matches any correct answer is considered correct
- Uses PostgreSQL `ANY` operator for efficient array comparison 