CREATE TABLE public.user_otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Stored securely, RLS prevents access
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT DEFAULT 0,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deny all read/write from frontend. Only Edge Functions (Service Role) can access it.
ALTER TABLE public.user_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.verified_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users can only read their own devices
ALTER TABLE public.verified_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verified devices"
    ON public.verified_devices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own verified devices"
    ON public.verified_devices FOR DELETE
    USING (auth.uid() = user_id);
