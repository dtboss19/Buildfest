-- Explicitly allow authenticated role (including anonymous users) to insert.
-- Run this if you see "new row violates row-level security policy" when posting or sending chat.
-- Supabase anonymous sign-in uses the 'authenticated' role; TO authenticated ensures those requests pass RLS.

DROP POLICY IF EXISTS "food_rescue_insert" ON public.food_rescue_posts;
CREATE POLICY "food_rescue_insert" ON public.food_rescue_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.user_profiles;
CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
