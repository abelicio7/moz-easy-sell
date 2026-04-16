CREATE TYPE quiz_status AS ENUM ('draft', 'active', 'inactive');

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    title text NOT NULL,
    description text,
    slug text UNIQUE NOT NULL,
    status quiz_status DEFAULT 'draft' NOT NULL,
    cover_image text,
    call_to_action_text text,
    call_to_action_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.quiz_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    order_index integer NOT NULL DEFAULT 0,
    question_type text DEFAULT 'multiple_choice' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.quiz_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id uuid REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
    option_text text NOT NULL,
    option_value text,
    score integer DEFAULT 0 NOT NULL,
    result_tag text,
    order_index integer NOT NULL DEFAULT 0
);

CREATE TABLE public.quiz_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    min_score integer,
    max_score integer,
    result_key text,
    recommended_product_url text,
    cta_text text
);

CREATE TABLE public.quiz_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    answers_json jsonb,
    total_score integer,
    result_title text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

-- Policies for quizzes
CREATE POLICY "Users can manage their own quizzes" ON public.quizzes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view active quizzes" ON public.quizzes FOR SELECT USING (status = 'active');

-- Policies for questions
CREATE POLICY "Users can manage their own quiz questions" ON public.quiz_questions FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.quizzes WHERE id = quiz_id));
CREATE POLICY "Public can view questions of active quizzes" ON public.quiz_questions FOR SELECT USING (quiz_id IN (SELECT id FROM public.quizzes WHERE status = 'active'));

-- Policies for options
CREATE POLICY "Users can manage their own quiz options" ON public.quiz_options FOR ALL 
USING (
  auth.uid() IN (
    SELECT q.user_id FROM public.quizzes q
    JOIN public.quiz_questions qq ON q.id = qq.quiz_id
    WHERE qq.id = question_id
  )
);
CREATE POLICY "Public can view options of active quizzes" ON public.quiz_options FOR SELECT 
USING (
  question_id IN (
    SELECT qq.id FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE q.status = 'active'
  )
);

-- Policies for results
CREATE POLICY "Users can manage their own quiz results" ON public.quiz_results FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.quizzes WHERE id = quiz_id));
CREATE POLICY "Public can view results of active quizzes" ON public.quiz_results FOR SELECT USING (quiz_id IN (SELECT id FROM public.quizzes WHERE status = 'active'));

-- Policies for leads
CREATE POLICY "Users can view leads of their quizzes" ON public.quiz_leads FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.quizzes WHERE id = quiz_id));
CREATE POLICY "Public can insert leads" ON public.quiz_leads FOR INSERT WITH CHECK (true);
