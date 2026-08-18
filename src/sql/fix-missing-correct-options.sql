-- Script to fix missing or malformed correct_option data
-- This script should be run if questions are missing correct_option data

-- First, let's see what questions have issues
SELECT id, description, correct_option, 
       CASE 
         WHEN correct_option IS NULL THEN 'NULL'
         WHEN correct_option = '{}' THEN 'EMPTY_ARRAY'
         WHEN NOT (correct_option IS NOT NULL AND array_length(correct_option, 1) > 0) THEN 'INVALID'
         ELSE 'OK'
       END as status
FROM questions 
WHERE correct_option IS NULL 
   OR correct_option = '{}' 
   OR NOT (correct_option IS NOT NULL AND array_length(correct_option, 1) > 0);

-- Fix questions with NULL correct_option by setting default to [1]
UPDATE questions 
SET correct_option = ARRAY[1] 
WHERE correct_option IS NULL;

-- Fix questions with empty array correct_option by setting default to [1]
UPDATE questions 
SET correct_option = ARRAY[1] 
WHERE correct_option = '{}';

-- Fix questions with invalid array by setting default to [1]
UPDATE questions 
SET correct_option = ARRAY[1] 
WHERE NOT (correct_option IS NOT NULL AND array_length(correct_option, 1) > 0);

-- Verify the fixes
SELECT id, description, correct_option, 
       CASE 
         WHEN correct_option IS NULL THEN 'NULL'
         WHEN correct_option = '{}' THEN 'EMPTY_ARRAY'
         WHEN NOT (correct_option IS NOT NULL AND array_length(correct_option, 1) > 0) THEN 'INVALID'
         ELSE 'OK'
       END as status
FROM questions 
ORDER BY id; 