const INSTAGRAM_REEL_REGEX = /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p)\/([\w-]+)(?:\/|\?|$)/i;

export const extractInstagramReelCode = (url: string) => {
  const match = url.trim().match(INSTAGRAM_REEL_REGEX);
  return match?.[1] ?? null;
};

export const normalizeInstagramReelUrl = (url: string) => {
  const reelCode = extractInstagramReelCode(url);
  if (!reelCode) {
    return null;
  }

  return `https://www.instagram.com/reel/${reelCode}/`;
};

export const normalizeInstagramUsername = (username: string | null | undefined) =>
  username?.trim().replace(/^@/, '').toLowerCase() ?? null;
