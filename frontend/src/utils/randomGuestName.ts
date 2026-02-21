const ADJECTIVES = ['Swift', 'Calm', 'Bold', 'Bright', 'Cool', 'Warm', 'Kind', 'Brave', 'Clear', 'Fair', 'Lucky', 'Gentle', 'Quick', 'Quiet', 'Happy'];
const NOUNS = ['Fox', 'Cat', 'Owl', 'Panda', 'Wolf', 'Bear', 'Hawk', 'Lion', 'Dove', 'Bee', 'Seal', 'Crow', 'Frog', 'Mole', 'Deer'];

/**
 * Returns a random guest display name (e.g. "SwiftFox42") for anonymous users.
 */
export function getRandomGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}${noun}${num}`;
}
