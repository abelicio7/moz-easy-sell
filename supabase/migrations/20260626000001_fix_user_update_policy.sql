-- 1. Add missing cpf column to public.profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;

-- 2. Drop and recreate the UPDATE policy for users on public.profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
