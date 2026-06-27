import type { UserJourneyRecord } from '../types/journey';

const ADMIN_TOKEN_STORAGE_KEY = 'travel-tracker-admin-token';
const AUTO_SYNC_STORAGE_KEY = 'travel-tracker-auto-cloud-sync';

export type CloudRecordLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type CloudPublishStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface CloudRecordSource {
  target: string;
  repo: string;
  branch: string;
  path: string;
  sha: string;
  htmlUrl?: string;
}

export interface CloudRecordResponse {
  ok: true;
  personalRecord: UserJourneyRecord;
  source?: CloudRecordSource;
}

export interface CloudPublishCommit {
  target: string;
  repo: string;
  branch: string;
  path: string;
  status: 'updated' | 'unchanged';
  sha?: string;
  commitSha?: string;
  htmlUrl?: string;
  commitUrl?: string;
}

export interface CloudPublishResponse {
  ok: true;
  personalRecord: UserJourneyRecord;
  commits: CloudPublishCommit[];
  updatedAt: string;
}

interface CloudErrorPayload {
  ok?: false;
  code?: string;
  error?: string;
}

export class TravelRecordCloudError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'TravelRecordCloudError';
    this.status = status;
    this.code = code;
  }
}

function getApiUrl() {
  return '/api/travel-record';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCloudErrorPayload(value: unknown): value is CloudErrorPayload {
  return isObject(value);
}

async function parseJsonResponse(response: Response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const code = isCloudErrorPayload(payload) && typeof payload.code === 'string'
      ? payload.code
      : 'TRAVEL_RECORD_CLOUD_ERROR';
    const message = isCloudErrorPayload(payload) && typeof payload.error === 'string'
      ? payload.error
      : `Travel record API returned HTTP ${response.status}`;

    throw new TravelRecordCloudError(response.status, code, message);
  }

  return payload;
}

export async function fetchCloudPersonalRecord(signal?: AbortSignal): Promise<CloudRecordResponse> {
  const response = await fetch(getApiUrl(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });
  const payload = await parseJsonResponse(response);

  if (!isObject(payload) || payload.ok !== true || !isObject(payload.personalRecord)) {
    throw new TravelRecordCloudError(502, 'BAD_CLOUD_PAYLOAD', '云端旅行档案格式异常。');
  }

  return payload as unknown as CloudRecordResponse;
}

export async function publishCloudPersonalRecord(
  personalRecord: UserJourneyRecord,
  adminToken: string,
  signal?: AbortSignal,
): Promise<CloudPublishResponse> {
  const response = await fetch(getApiUrl(), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ personalRecord }),
    signal,
  });
  const payload = await parseJsonResponse(response);

  if (!isObject(payload) || payload.ok !== true || !Array.isArray(payload.commits)) {
    throw new TravelRecordCloudError(502, 'BAD_PUBLISH_PAYLOAD', '云端保存响应格式异常。');
  }

  return payload as unknown as CloudPublishResponse;
}

export function readStoredAdminToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ?? '';
}

export function writeStoredAdminToken(token: string) {
  if (typeof window === 'undefined') return;

  const trimmedToken = token.trim();
  if (trimmedToken) {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, trimmedToken);
  } else {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
}

export function readStoredAutoSyncPreference() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(AUTO_SYNC_STORAGE_KEY) === '1';
}

export function writeStoredAutoSyncPreference(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? '1' : '0');
}
