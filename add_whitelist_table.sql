-- 1. Create a table for allowed emails
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email text PRIMARY KEY,
  role text DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Everyone can read (to check at login)
CREATE POLICY "Allowed emails are viewable by everyone"
  ON public.allowed_emails FOR SELECT
  USING ( true );

-- 4. Initial Whitelist (IMPORTANT: Replace or add after running)
-- INSERT INTO public.allowed_emails (email, role) VALUES ('user@example.com', 'admin');
