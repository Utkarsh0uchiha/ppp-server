-- Migration script to support multiple correct answers
-- This script should be run on existing databases to update the correct_option column

-- Step 1: Add a temporary column
ALTER TABLE questions ADD COLUMN correct_option_new integer[];

-- Step 2: Convert existing single correct_option values to arrays
UPDATE questions SET correct_option_new = ARRAY[correct_option] WHERE correct_option IS NOT NULL;

-- Step 3: Drop the old column
ALTER TABLE questions DROP COLUMN correct_option;

-- Step 4: Rename the new column to the original name
ALTER TABLE questions RENAME COLUMN correct_option_new TO correct_option;

-- Step 5: Make the column NOT NULL
ALTER TABLE questions ALTER COLUMN correct_option SET NOT NULL; 