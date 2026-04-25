-- Add button fields to quiz_questions for "Message" type slides
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS button_text TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS button_url TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS is_external_link BOOLEAN DEFAULT false;
