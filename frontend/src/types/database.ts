export type PickupType = 'foodbank' | 'community' | 'both';
export type RescueStatus = 'available' | 'claimed' | 'expired';
export type PostType = 'general' | 'question' | 'tip';
export type ChatRoomType = 'shelter' | 'topic';

export const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten-free',
  'dairy-free',
  'nut-free',
] as const;
export type DietaryPreference = (typeof DIETARY_OPTIONS)[number];

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  dietary_preferences: string[];
  saved_shelters: string[];
  is_private: boolean;
  created_at: string;
}

export interface ShelterPhoto {
  id: string;
  shelter_id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  is_anonymous: boolean;
  is_staff: boolean;
  analysis: FoodDetectionDb | null;
  created_at: string;
}

export interface FoodDetectionDb {
  items: { name: string; quantity: string; details?: string }[];
}

export interface FoodRescuePost {
  id: string;
  user_id: string;
  event_name: string;
  description: string | null;
  quantity: string | null;
  photo_url: string | null;
  location: string | null;
  location_lat: number | null;
  location_lng: number | null;
  pickup_type: PickupType;
  expiry_time: string;
  status: RescueStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  is_anonymous: boolean;
  special_notes: string | null;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  shelter_id: string;
  content: string;
  is_anonymous: boolean;
  post_type: PostType;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  shelter_id: string | null;
  name: string;
  type: ChatRoomType;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  is_pinned: boolean;
  created_at: string;
}

export interface ActivityFeedItem {
  id: string;
  type: string;
  user_id: string | null;
  reference_id: string | null;
  shelter_id: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  body: string | null;
  link_url: string | null;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const REPORT_REASONS = ['inappropriate', 'spam', 'false_info', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
