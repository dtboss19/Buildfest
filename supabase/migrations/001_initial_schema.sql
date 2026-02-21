-- Common Table - Supabase schema
-- Run in Supabase SQL Editor or via supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ TABLES ============

-- user_profiles: extends auth.users
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  dietary_preferences TEXT[] DEFAULT '{}',
  saved_shelters TEXT[] DEFAULT '{}',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- shelter_photos: community + staff photos per shelter
CREATE TABLE public.shelter_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shelter_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_staff BOOLEAN DEFAULT false,
  analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- food_rescue_posts
CREATE TYPE pickup_type_enum AS ENUM ('foodbank', 'community', 'both');
CREATE TYPE rescue_status_enum AS ENUM ('available', 'claimed', 'expired');

CREATE TABLE public.food_rescue_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  description TEXT,
  quantity TEXT,
  photo_url TEXT,
  location TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  pickup_type pickup_type_enum NOT NULL DEFAULT 'both',
  expiry_time TIMESTAMPTZ NOT NULL,
  status rescue_status_enum NOT NULL DEFAULT 'available',
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  is_anonymous BOOLEAN DEFAULT false,
  special_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- community_posts: per-shelter posts
CREATE TYPE post_type_enum AS ENUM ('general', 'question', 'tip');

CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shelter_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  post_type post_type_enum NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- comments: on community_posts only
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- chat_rooms: shelter-specific or topic
CREATE TYPE chat_room_type_enum AS ENUM ('shelter', 'topic');

CREATE TABLE public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shelter_id TEXT,
  name TEXT NOT NULL,
  type chat_room_type_enum NOT NULL DEFAULT 'topic',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- chat_messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- activity_feed
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reference_id UUID,
  shelter_id TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- reports: moderation
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- notifications (in-app)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  link_url TEXT,
  reference_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_shelter_photos_shelter ON public.shelter_photos(shelter_id);
CREATE INDEX idx_shelter_photos_created ON public.shelter_photos(created_at DESC);
CREATE INDEX idx_food_rescue_status_expiry ON public.food_rescue_posts(status, expiry_time);
CREATE INDEX idx_community_posts_shelter ON public.community_posts(shelter_id);
CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_chat_messages_room ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at DESC);
CREATE INDEX idx_activity_feed_created ON public.activity_feed(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- ============ ENABLE REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============ STORAGE ============
-- Create buckets in Dashboard: avatars, shelter-photos, food-rescue-photos (all public).
-- Then add policies in Dashboard or run after buckets exist:
-- Storage policies: allow authenticated upload, public read (run after buckets exist).

-- ============ RLS ============
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelter_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_rescue_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- user_profiles: anyone read non-private or own
CREATE POLICY "profiles_read_public" ON public.user_profiles FOR SELECT USING (
  (is_private = false) OR (auth.uid() = user_id)
);
CREATE POLICY "profiles_insert_own" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- shelter_photos: all read; insert/update/delete own
CREATE POLICY "shelter_photos_read" ON public.shelter_photos FOR SELECT TO public USING (true);
CREATE POLICY "shelter_photos_insert" ON public.shelter_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shelter_photos_update_own" ON public.shelter_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "shelter_photos_delete_own" ON public.shelter_photos FOR DELETE USING (auth.uid() = user_id);

-- food_rescue_posts: all read; insert/update/delete own
CREATE POLICY "food_rescue_read" ON public.food_rescue_posts FOR SELECT TO public USING (true);
CREATE POLICY "food_rescue_insert" ON public.food_rescue_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "food_rescue_update_own" ON public.food_rescue_posts FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = claimed_by);
CREATE POLICY "food_rescue_delete_own" ON public.food_rescue_posts FOR DELETE USING (auth.uid() = user_id);

-- community_posts: all read; insert/update/delete own
CREATE POLICY "community_posts_read" ON public.community_posts FOR SELECT TO public USING (true);
CREATE POLICY "community_posts_insert" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_posts_update_own" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "community_posts_delete_own" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- comments: all read; insert/update/delete own
CREATE POLICY "comments_read" ON public.comments FOR SELECT TO public USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- chat_rooms: all read (no insert from app for topic rooms - pre-seeded)
CREATE POLICY "chat_rooms_read" ON public.chat_rooms FOR SELECT TO public USING (true);

-- chat_messages: all read; insert own; delete own
CREATE POLICY "chat_messages_read" ON public.chat_messages FOR SELECT TO public USING (true);
CREATE POLICY "chat_messages_insert" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chat_messages_delete_own" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- activity_feed: all read; insert via service/auth
CREATE POLICY "activity_feed_read" ON public.activity_feed FOR SELECT TO public USING (true);
CREATE POLICY "activity_feed_insert" ON public.activity_feed FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- reports: insert own; read only own (moderators would use service role)
CREATE POLICY "reports_insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_read_own" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- notifications: read/update own
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============ TRIGGER: create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), split_part(NEW.email, '@', 1), 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEED TOPIC CHAT ROOMS ============
INSERT INTO public.chat_rooms (name, type) VALUES
  ('General Discussion', 'topic'),
  ('SNAP Help & Benefits', 'topic'),
  ('Recipes with Food Shelf Items', 'topic'),
  ('Transportation & Rides to Food Shelves', 'topic'),
  ('Mental Health & Support', 'topic'),
  ('Event Food Donations', 'topic');
