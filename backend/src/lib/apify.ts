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

type ApifyReelRunInput = {
  directUrls: string[];
  resultsType?: 'posts';
  resultsLimit?: number;
  searchLimit?: number;
};

export type ReelAnalyticsLookup =
  | { status: 'not-configured' }
  | { status: 'not-found' }
  | { status: 'missing-timestamp'; snapshot: ReelAnalyticsSnapshot }
  | { status: 'invalid-timestamp'; snapshot: ReelAnalyticsSnapshot }
  | { status: 'ok'; snapshot: ReelAnalyticsSnapshot };

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

const sanitizeApifyUrl = (url: string) => {
  const parsed = new URL(url);
  if (parsed.searchParams.has('token')) {
    parsed.searchParams.set('token', '[redacted]');
  }
  return parsed.toString();
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

const getDatasetCandidateCode = (item: ApifyDatasetItem) =>
  item.shortCode ?? extractInstagramReelCode(item.url ?? item.inputUrl ?? '');

const buildDatasetDebugContext = (items: ApifyDatasetItem[]) => ({
  itemCount: items.length,
  recentShortCodes: items
    .map(getDatasetCandidateCode)
    .filter((value): value is string => Boolean(value))
    .slice(0, 10),
});

const getReelDatasetItemsUrl = () => env.APIFY_LAST_RUN_DATASET_ITEMS_URL || env.APIFY_DATASET_ITEMS_URL;

export const isApifyConfigured = () => Boolean(getReelDatasetItemsUrl());
export const isApifyProfileConfigured = () =>
  Boolean(env.APIFY_PROFILE_RUN_SYNC_GET_URL || env.APIFY_PROFILE_DATASET_ITEMS_URL);

export const findApifyAnalyticsByReelCode = async (reelCode: string) => {
  const result = await getApifyAnalyticsByReelCode(reelCode);
  return result.status === 'ok' ? result.snapshot : null;
};

const toReelAnalyticsSnapshot = (reelCode: string, match: ApifyDatasetItem) => {
  const rawUploadedAt = match.timestamp ? new Date(match.timestamp) : null;

  return {
    datasetItemId: match.id ?? null,
    reelCode,
    normalizedReelUrl: normalizeInstagramReelUrl(match.url ?? match.inputUrl ?? ''),
    uploadedAt: rawUploadedAt && !Number.isNaN(rawUploadedAt.getTime()) ? rawUploadedAt : null,
    ownerUsername: normalizeInstagramUsername(match.ownerUsername),
    views: match.videoViewCount ?? 0,
    playCount: match.videoPlayCount ?? 0,
    likesCount: match.likesCount ?? 0,
    commentsCount: match.commentsCount ?? 0,
    source: 'apify-dataset' as const,
  } satisfies ReelAnalyticsSnapshot;
};

const toReelAnalyticsLookup = (reelCode: string, match: ApifyDatasetItem | undefined | null): ReelAnalyticsLookup => {
  if (!match) {
    return { status: 'not-found' };
  }

  const snapshot = toReelAnalyticsSnapshot(reelCode, match);

  if (!match.timestamp) {
    console.warn('Apify reel lookup found a reel without timestamp.', {
      reelCode,
      datasetItemId: match.id ?? null,
      matchedUrl: match.url ?? match.inputUrl ?? null,
      ownerUsername: match.ownerUsername ?? null,
    });
    return { status: 'missing-timestamp', snapshot };
  }

  if (!snapshot.uploadedAt) {
    console.warn('Apify reel lookup found an invalid timestamp.', {
      reelCode,
      datasetItemId: match.id ?? null,
      rawTimestamp: match.timestamp,
      matchedUrl: match.url ?? match.inputUrl ?? null,
    });
    return { status: 'invalid-timestamp', snapshot };
  }

  return { status: 'ok', snapshot };
};

export const refreshApifyAnalyticsForReelUrl = async (reelUrl: string): Promise<ReelAnalyticsLookup> => {
  const reelCode = extractInstagramReelCode(reelUrl);
  if (!reelCode) {
    return { status: 'not-found' };
  }

  if (!env.APIFY_REEL_RUN_SYNC_GET_URL) {
    return getApifyAnalyticsByReelCode(reelCode);
  }

  const normalizedReelUrl = normalizeInstagramReelUrl(reelUrl) ?? reelUrl.trim();
  const payload: ApifyReelRunInput = {
    directUrls: [normalizedReelUrl],
    resultsType: 'posts',
    resultsLimit: 1,
    searchLimit: 1,
  };

  try {
    const items = await fetchJson<ApifyDatasetItem[]>(env.APIFY_REEL_RUN_SYNC_GET_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const target = reelCode.toLowerCase();
    const match = items.find(item => {
      const candidateCode = getDatasetCandidateCode(item);
      return candidateCode?.toLowerCase() === target;
    });

    if (!match) {
      console.warn('Apify reel run-sync refresh did not find a matching dataset item.', {
        reelCode,
        requestUrl: sanitizeApifyUrl(env.APIFY_REEL_RUN_SYNC_GET_URL),
        requestInput: payload,
        ...buildDatasetDebugContext(items),
      });
    }

    return toReelAnalyticsLookup(reelCode, match);
  } catch (error) {
    console.warn('Apify reel run-sync refresh failed, falling back to latest dataset.', {
      reelCode,
      requestUrl: sanitizeApifyUrl(env.APIFY_REEL_RUN_SYNC_GET_URL),
      message: error instanceof Error ? error.message : 'Unknown Apify refresh error.',
    });
    return getApifyAnalyticsByReelCode(reelCode);
  }
};

export const getApifyAnalyticsByReelCode = async (reelCode: string): Promise<ReelAnalyticsLookup> => {
  const baseDatasetUrl = getReelDatasetItemsUrl();
  if (!baseDatasetUrl) {
    return { status: 'not-configured' };
  }

  const datasetUrl = new URL(baseDatasetUrl);
  datasetUrl.searchParams.set('clean', '1');
  datasetUrl.searchParams.set('format', 'json');
  datasetUrl.searchParams.set('limit', String(env.APIFY_DATASET_ITEMS_LIMIT));
  datasetUrl.searchParams.set('desc', '1');

  const items = await fetchJson<ApifyDatasetItem[]>(datasetUrl.toString());
  const target = reelCode.toLowerCase();
  const match = items.find(item => {
    const candidateCode = getDatasetCandidateCode(item);
    return candidateCode?.toLowerCase() === target;
  });

  if (!match) {
    console.warn('Apify reel lookup did not find a matching dataset item.', {
      reelCode,
      datasetUrl: sanitizeApifyUrl(datasetUrl.toString()),
      ...buildDatasetDebugContext(items),
    });
    return { status: 'not-found' };
  }

  return toReelAnalyticsLookup(reelCode, match);
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

  const datasetItemsUrl = env.APIFY_PROFILE_DATASET_ITEMS_URL;
  if (!datasetItemsUrl) {
    return null;
  }

  const datasetUrl = new URL(datasetItemsUrl);
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
