-- Add image_url to quiz_questions
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image to quizzes (cover for result page too)
ALTER TABLE public.quiz_results ADD COLUMN IF NOT EXISTS result_image TEXT;
