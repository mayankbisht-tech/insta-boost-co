import { env } from '../config/env.js';
import { extractInstagramReelCode, normalizeInstagramReelUrl, normalizeInstagramUsername } from './reels.js';

type ApifyDatasetItem = {
  id?: string;
  inputUrl?: string;
  shortCode?: string;
  url?: string;
  timestamp?: string;
  ownerUsername?: string;
  videoViewCount?: number;
  videoPlayCount?: number;
  likesCount?: number;
  commentsCount?: number;
};

type ApifyRunResponse = {
  data?: {
    status?: string;
    startedAt?: string;
    finishedAt?: string;
  };
};

type ApifyProfileItem = {
  username?: string;
  biography?: string;
  bio?: string;
  followersCount?: number;
  followers?: number;
  followerCount?: number;
  id?: string;
  inputUrl?: string;
};

export type ReelAnalyticsSnapshot = {
  datasetItemId: string | null;
  reelCode: string;
  normalizedReelUrl: string | null;
  uploadedAt: Date | null;
  ownerUsername: string | null;
  views: number;
  playCount: number;
  likesCount: number;
  commentsCount: number;
  source: 'apify-dataset';
};

const buildHeaders = (hasBody?: boolean) => {
  const headers: Record<string, string> = {};
  if (env.APIFY_API_TOKEN) {
    headers.Authorization = `Bearer ${env.APIFY_API_TOKEN}`;
  }
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(Boolean(options?.body)),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Apify request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
};

export const isApifyConfigured = () => Boolean(env.APIFY_DATASET_ITEMS_URL);
export const isApifyProfileConfigured = () =>
  Boolean(env.APIFY_PROFILE_RUN_SYNC_GET_URL || env.APIFY_PROFILE_DATASET_ITEMS_URL);

export const findApifyAnalyticsByReelCode = async (reelCode: string) => {
  if (!env.APIFY_DATASET_ITEMS_URL) {
    return null;
  }

  const datasetUrl = new URL(env.APIFY_DATASET_ITEMS_URL);
  datasetUrl.searchParams.set('clean', '1');
  datasetUrl.searchParams.set('format', 'json');
  datasetUrl.searchParams.set('limit', '200');
  datasetUrl.searchParams.set('desc', '1');

  const items = await fetchJson<ApifyDatasetItem[]>(datasetUrl.toString());
  const target = reelCode.toLowerCase();
  const match = items.find(item => {
    const candidateCode = item.shortCode ?? extractInstagramReelCode(item.url ?? item.inputUrl ?? '');
    return candidateCode?.toLowerCase() === target;
  });

  if (!match) {
    return null;
  }

  const uploadedAt = match.timestamp ? new Date(match.timestamp) : null;

  return {
    datasetItemId: match.id ?? null,
    reelCode,
    normalizedReelUrl: normalizeInstagramReelUrl(match.url ?? match.inputUrl ?? ''),
    uploadedAt: uploadedAt && !Number.isNaN(uploadedAt.getTime()) ? uploadedAt : null,
    ownerUsername: normalizeInstagramUsername(match.ownerUsername),
    views: match.videoViewCount ?? 0,
    playCount: match.videoPlayCount ?? 0,
    likesCount: match.likesCount ?? 0,
    commentsCount: match.commentsCount ?? 0,
    source: 'apify-dataset' as const,
  } satisfies ReelAnalyticsSnapshot;
};

export const getApifyRunOverview = async () => {
  if (!env.APIFY_ACTOR_RUN_URL) {
    return null;
  }

  const payload = await fetchJson<ApifyRunResponse>(env.APIFY_ACTOR_RUN_URL);

  return {
    status: payload.data?.status ?? 'unknown',
    startedAt: payload.data?.startedAt ?? null,
    finishedAt: payload.data?.finishedAt ?? null,
  };
};

export type InstagramProfileSnapshot = {
  username: string;
  bio: string | null;
  followers: number | null;
  datasetItemId: string | null;
  source: 'apify-profile';
};

const normalizeProfileUsername = (value: string) => value.trim().replace(/^@/, '').toLowerCase();

export const findApifyProfileByUsername = async (username: string) => {
  if (!isApifyProfileConfigured()) {
    return null;
  }

  const target = normalizeProfileUsername(username);

  if (env.APIFY_PROFILE_RUN_SYNC_GET_URL) {
    const payload = {
      usernames: [target],
    };

    const items = await fetchJson<ApifyProfileItem[]>(env.APIFY_PROFILE_RUN_SYNC_GET_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const match = items.find(item => item.username && normalizeProfileUsername(item.username) === target);

    if (!match) {
      return null;
    }

    const followers =
      typeof match.followersCount === 'number'
        ? match.followersCount
        : typeof match.followers === 'number'
        ? match.followers
        : typeof match.followerCount === 'number'
        ? match.followerCount
        : null;

    return {
      username: match.username ?? username,
      bio: match.biography ?? match.bio ?? null,
      followers,
      datasetItemId: match.id ?? null,
      source: 'apify-profile' as const,
    } satisfies InstagramProfileSnapshot;
  }

  const datasetUrl = new URL(env.APIFY_PROFILE_DATASET_ITEMS_URL);
  datasetUrl.searchParams.set('clean', '1');
  datasetUrl.searchParams.set('format', 'json');
  datasetUrl.searchParams.set('limit', '200');
  datasetUrl.searchParams.set('desc', '1');

  const items = await fetchJson<ApifyProfileItem[]>(datasetUrl.toString());
  const match = items.find(item => item.username && normalizeProfileUsername(item.username) === target);

  if (!match) {
    return null;
  }

  const followers =
    typeof match.followersCount === 'number'
      ? match.followersCount
      : typeof match.followers === 'number'
      ? match.followers
      : typeof match.followerCount === 'number'
      ? match.followerCount
      : null;

  return {
    username: match.username ?? username,
    bio: match.biography ?? match.bio ?? null,
    followers,
    datasetItemId: match.id ?? null,
    source: 'apify-profile' as const,
  } satisfies InstagramProfileSnapshot;
};
