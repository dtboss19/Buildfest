import type { FoodRescuePost } from '../types/database';
import type { ShelterPhoto } from '../types/database';
import type { ChatRoom, ChatMessage } from '../types/database';

export type SeedFeedItem = {
  id: string;
  type: 'photo' | 'post' | 'rescue';
  shelter_id: string | null;
  reference_id: string;
  created_at: string;
  is_anonymous: boolean;
  description?: string;
};

const NOW = Date.now();
const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;

// ---- Food Rescue (use when DB returns empty) ----
export function getSeedFoodRescuePosts(): FoodRescuePost[] {
  const created1 = new Date(NOW - 45 * MS_MIN).toISOString();
  const expiry1 = new Date(NOW + 3 * MS_HOUR).toISOString();
  const created2 = new Date(NOW - 2 * MS_HOUR).toISOString();
  const expiry2 = new Date(NOW + 5 * MS_HOUR).toISOString();
  const created3 = new Date(NOW - 24 * MS_HOUR).toISOString();
  const created4 = new Date(NOW - 90 * MS_MIN).toISOString();
  const expiry4 = new Date(NOW + 6 * MS_HOUR).toISOString();

  return [
    {
      id: 'seed-rescue-1',
      user_id: '00000000-0000-0000-0000-000000000001',
      event_name: 'Wedding Reception - Aria Event Center',
      description: 'Leftover catering — pasta pans, salads in trays, bread, desserts. All halal.',
      quantity: 'Large — feeds ~150 people',
      photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
      location: 'St. Paul, MN (address shared after claim)',
      location_lat: null,
      location_lng: null,
      pickup_type: 'both',
      expiry_time: expiry1,
      status: 'available',
      claimed_by: null,
      claimed_at: null,
      is_anonymous: true,
      special_notes: 'halal',
      created_at: created1,
    },
    {
      id: 'seed-rescue-2',
      user_id: '00000000-0000-0000-0000-000000000002',
      event_name: 'Corporate Lunch - Ecolab HQ',
      description: 'Unclaimed boxed lunches — sandwiches, chips, fruit. ~40 boxes left in cooler.',
      quantity: '40 individual boxes',
      photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
      location: null,
      location_lat: null,
      location_lng: null,
      pickup_type: 'foodbank',
      expiry_time: expiry2,
      status: 'available',
      claimed_by: null,
      claimed_at: null,
      is_anonymous: true,
      special_notes: null,
      created_at: created2,
    },
    {
      id: 'seed-rescue-3',
      user_id: '00000000-0000-0000-0000-000000000003',
      event_name: 'Church Potluck - Hamline United Methodist',
      description: 'Leftover homemade dishes — soups, casseroles, baked goods in disposable pans.',
      quantity: 'Serves ~30',
      photo_url: 'https://images.unsplash.com/photo-1587334207828-31d7d94d5792?w=400&q=80',
      location: null,
      location_lat: null,
      location_lng: null,
      pickup_type: 'community',
      expiry_time: new Date(NOW - MS_HOUR).toISOString(),
      status: 'claimed',
      claimed_by: null,
      claimed_at: new Date(NOW - 2 * MS_HOUR).toISOString(),
      is_anonymous: true,
      special_notes: null,
      created_at: created3,
    },
    {
      id: 'seed-rescue-4',
      user_id: '00000000-0000-0000-0000-000000000001',
      event_name: 'Campus Event - O\'Shaughnessy',
      description: 'Leftover sandwich platters, fruit in trays, bottled water. Pick up from loading dock.',
      quantity: '~50 servings',
      photo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
      location: 'St. Paul, MN',
      location_lat: null,
      location_lng: null,
      pickup_type: 'both',
      expiry_time: expiry4,
      status: 'available',
      claimed_by: null,
      claimed_at: null,
      is_anonymous: true,
      special_notes: null,
      created_at: created4,
    },
  ];
}

// ---- Shelter photos (2 per shelter: Keystone, Open Hands) ----
const SEED_SHELTER_IDS = ['keystone', 'open-hands-midway'] as const;

export function getSeedShelterPhotos(): ShelterPhoto[] {
  const out: ShelterPhoto[] = [];
  const photos: { shelter_id: string; caption: string; is_staff: boolean; url: string }[] = [
    { shelter_id: 'keystone', caption: 'Great volunteers here every Tuesday!', is_staff: true, url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&q=80' },
    { shelter_id: 'keystone', caption: 'Fresh produce available today', is_staff: false, url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80' },
    { shelter_id: 'keystone', caption: 'Pantry shelves stocked and ready', is_staff: true, url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80' },
    { shelter_id: 'open-hands-midway', caption: 'Community distribution day', is_staff: false, url: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400&q=80' },
    { shelter_id: 'open-hands-midway', caption: 'Fresh produce available today', is_staff: true, url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80' },
    { shelter_id: 'neighbors-inc', caption: 'Friendly staff and plenty of options', is_staff: true, url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80' },
    { shelter_id: 'hallie-q-brown', caption: 'Open and welcoming to all', is_staff: false, url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80' },
  ];
  photos.forEach((p, i) => {
    out.push({
      id: `seed-photo-${p.shelter_id}-${i}`,
      shelter_id: p.shelter_id,
      user_id: '00000000-0000-0000-0000-000000000001',
      photo_url: p.url,
      caption: p.caption,
      is_anonymous: false,
      is_staff: p.is_staff,
      analysis: null,
      created_at: new Date(NOW - (i + 1) * MS_HOUR).toISOString(),
    });
  });
  return out;
}

// ---- Chat: topic rooms + messages (by room name for fallback when DB has no rooms) ----
export const SEED_CHAT_ROOM_IDS = {
  'General Discussion': 'seed-room-general',
  'SNAP Help & Benefits': 'seed-room-snap',
  'Recipes with Food Shelf Items': 'seed-room-recipes',
} as const;

export function getSeedChatRooms(): ChatRoom[] {
  return [
    { id: SEED_CHAT_ROOM_IDS['General Discussion'], shelter_id: null, name: 'General Discussion', type: 'topic', created_at: new Date().toISOString() },
    { id: SEED_CHAT_ROOM_IDS['SNAP Help & Benefits'], shelter_id: null, name: 'SNAP Help & Benefits', type: 'topic', created_at: new Date().toISOString() },
    { id: SEED_CHAT_ROOM_IDS['Recipes with Food Shelf Items'], shelter_id: null, name: 'Recipes with Food Shelf Items', type: 'topic', created_at: new Date().toISOString() },
  ];
}

const SEED_MESSAGES: Record<string, { content: string; is_anonymous: boolean }[]> = {
  'General Discussion': [
    { content: 'Does anyone know if Keystone is open this Saturday?', is_anonymous: false },
    { content: 'They close at noon on Saturdays I think', is_anonymous: false },
    { content: 'Just got back from Open Hands — they had great produce today 🥕', is_anonymous: false },
    { content: 'Thanks for the tip!', is_anonymous: false },
  ],
  'SNAP Help & Benefits': [
    { content: 'Just found out grad students can qualify for SNAP in MN — apply at mn.gov/dhs', is_anonymous: false },
    { content: 'Did not know that, thank you!', is_anonymous: false },
    { content: 'The income limit is higher than most people think, worth checking', is_anonymous: false },
  ],
  'Recipes with Food Shelf Items': [
    { content: 'Got a ton of canned chickpeas last week — made the best curry!', is_anonymous: false },
    { content: 'Recipe please 🙏', is_anonymous: false },
    { content: '1 can chickpeas, 1 can tomatoes, curry powder, garlic, serve over rice. Done in 20 min', is_anonymous: false },
  ],
};

export function getSeedChatMessages(roomName: string): ChatMessage[] {
  const list = SEED_MESSAGES[roomName];
  if (!list) return [];
  const baseTime = NOW - 24 * MS_HOUR;
  return list.map((m, i) => ({
    id: `seed-msg-${roomName.replace(/\s/g, '-')}-${i}`,
    room_id: (SEED_CHAT_ROOM_IDS as Record<string, string>)[roomName] ?? '',
    user_id: '00000000-0000-0000-0000-000000000001',
    content: m.content,
    is_anonymous: m.is_anonymous,
    is_pinned: false,
    created_at: new Date(baseTime + i * 30 * MS_MIN).toISOString(),
  }));
}

export function getSeedChatMessagesByRoomId(roomId: string): ChatMessage[] {
  const name = Object.entries(SEED_CHAT_ROOM_IDS).find(([, id]) => id === roomId)?.[0];
  return name ? getSeedChatMessages(name) : [];
}

// ---- Community feed: fake posts for demo ----
const SEED_COMMUNITY_POSTS: { content: string; is_anonymous: boolean; shelter_id: string | null; created_at_offset_min: number }[] = [
  { content: 'Just picked up fresh produce at Keystone — they had tons of greens and root veggies today. So grateful!', is_anonymous: false, shelter_id: 'keystone', created_at_offset_min: -45 },
  { content: 'Does anyone know if the SNAP office on University is open on Saturdays? Need to renew my benefits.', is_anonymous: true, shelter_id: null, created_at_offset_min: -120 },
  { content: 'Made a big batch of lentil soup with food shelf items. Recipe: lentils, canned tomatoes, onion, garlic, cumin. Fed my family for two days.', is_anonymous: false, shelter_id: null, created_at_offset_min: -180 },
  { content: 'Hallie Q. Brown was really welcoming when I went yesterday. Staff helped me find halal options.', is_anonymous: true, shelter_id: 'hallie-q-brown', created_at_offset_min: -240 },
  { content: 'Tip: Open Cupboard has a community fridge — you can drop off or take leftovers no questions asked. Check their hours first.', is_anonymous: false, shelter_id: 'open-cupboard', created_at_offset_min: -300 },
  { content: 'Struggling to make the drive to Neighbors Inc. — anyone carpool from the St. Paul area?', is_anonymous: true, shelter_id: 'neighbors-inc', created_at_offset_min: -360 },
  { content: 'Recipe share: canned chickpeas + curry powder + coconut milk + rice = easy dinner in 20 min. Kids actually ate it!', is_anonymous: false, shelter_id: null, created_at_offset_min: -420 },
  { content: 'Just wanted to say this community is so helpful. Thank you to everyone who posts tips and support.', is_anonymous: true, shelter_id: null, created_at_offset_min: -500 },
];

// ---- Community feed items (from seed rescues + seed photos + seed posts) ----
export function getSeedCommunityFeedItems(): SeedFeedItem[] {
  const rescues = getSeedFoodRescuePosts().filter((r) => r.status === 'available').slice(0, 5);
  const photos = getSeedShelterPhotos();
  const postItems: SeedFeedItem[] = SEED_COMMUNITY_POSTS.map((p, i) => ({
    id: `seed-post-${i}`,
    type: 'post' as const,
    shelter_id: p.shelter_id,
    reference_id: `seed-post-${i}`,
    created_at: new Date(NOW + p.created_at_offset_min * MS_MIN).toISOString(),
    is_anonymous: p.is_anonymous,
    description: p.content,
  }));
  const items: SeedFeedItem[] = [
    ...photos.map((p) => ({
      id: p.id,
      type: 'photo' as const,
      shelter_id: p.shelter_id,
      reference_id: p.id,
      created_at: p.created_at,
      is_anonymous: p.is_anonymous,
      description: p.caption ?? undefined,
    })),
    ...rescues.map((r) => ({
      id: r.id,
      type: 'rescue' as const,
      shelter_id: null as string | null,
      reference_id: r.id,
      created_at: r.created_at,
      is_anonymous: r.is_anonymous,
      description: r.event_name,
    })),
    ...postItems,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items;
}
