-- Backfill user_profiles for auth users who don't have a row (e.g. registered before trigger existed).
-- Safe to run multiple times (only inserts missing rows).
INSERT INTO public.user_profiles (user_id, display_name)
SELECT u.id, COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'display_name'), ''), split_part(u.email, '@', 1), 'User')
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.user_profiles)
ON CONFLICT (user_id) DO NOTHING;
