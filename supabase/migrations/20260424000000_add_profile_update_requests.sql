CREATE TABLE public.profile_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_update_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
    ON public.profile_update_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requests"
    ON public.profile_update_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
    ON public.profile_update_requests FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all requests"
    ON public.profile_update_requests FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Timestamp trigger
CREATE TRIGGER update_profile_requests_updated_at
BEFORE UPDATE ON public.profile_update_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
