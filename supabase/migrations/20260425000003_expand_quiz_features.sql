-- Add layout and extra images to quiz_questions
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT 'list';
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS footer_image_url TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS secondary_image_url TEXT;

-- Add range properties to quiz_questions (for the Scale component)
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS min_value INTEGER DEFAULT 100;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS max_value INTEGER DEFAULT 220;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS step_value INTEGER DEFAULT 1;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'cm';

-- Add image support to quiz_options
ALTER TABLE public.quiz_options ADD COLUMN IF NOT EXISTS image_url TEXT;
