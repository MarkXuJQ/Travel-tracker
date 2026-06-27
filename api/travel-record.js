import { timingSafeEqual } from 'node:crypto';
import process from 'node:process';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const DEFAULT_TRACKER_REPO = 'MarkXuJQ/Travel-tracker';
const DEFAULT_TRACKER_BRANCH = process.env.VERCEL_GIT_COMMIT_REF || 'main';
const DEFAULT_TRACKER_PATH = 'src/data/personalJourneyLibrary.json';
const DEFAULT_BLOG_REPO = 'MarkXuJQ/Mark-blog';
const DEFAULT_BLOG_BRANCH = 'main';
const DEFAULT_BLOG_PATH = 'content/travel/records/mark.json';
const PERSONAL_RECORD_ID = 'mark';
const PERSONAL_RECORD_NAME = 'Mark';
const MAX_BODY_BYTES = 1024 * 1024;

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Travel-Admin-Token');
}

function parseRepo(value, fallback) {
  const repo = (value || fallback).trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new ApiError(500, 'BAD_REPO_CONFIG', `Invalid GitHub repository config: ${repo}`);
  }
  return repo;
}

function getGithubToken() {
  return (
    process.env.TRAVEL_RECORD_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    ''
  ).trim();
}

function getTargets() {
  return [
    {
      id: 'travel-tracker',
      label: 'TravelTracker',
      repo: parseRepo(process.env.TRAVEL_TRACKER_REPO, DEFAULT_TRACKER_REPO),
      branch: (process.env.TRAVEL_TRACKER_BRANCH || DEFAULT_TRACKER_BRANCH).trim(),
      path: (process.env.TRAVEL_TRACKER_RECORD_PATH || DEFAULT_TRACKER_PATH).trim(),
      shape: 'library',
    },
    {
      id: 'mark-blog',
      label: 'Mark-blog',
      repo: parseRepo(process.env.MARK_BLOG_REPO, DEFAULT_BLOG_REPO),
      branch: (process.env.MARK_BLOG_BRANCH || DEFAULT_BLOG_BRANCH).trim(),
      path: (process.env.MARK_BLOG_RECORD_PATH || DEFAULT_BLOG_PATH).trim(),
      shape: 'record',
    },
  ];
}

function encodePath(filePath) {
  return filePath.split('/').map(encodeURIComponent).join('/');
}

function getContentsUrl(target) {
  return `${GITHUB_API_BASE_URL}/repos/${target.repo}/contents/${encodePath(target.path)}`;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > MAX_BODY_BYTES) {
      throw new ApiError(413, 'BODY_TOO_LARGE', 'Request body is too large');
    }

    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    throw new ApiError(400, 'EMPTY_BODY', 'Request body is required');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, 'BAD_JSON', 'Request body must be valid JSON');
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(Array.isArray(header) ? header[0] : header);
  return match?.[1]?.trim() || '';
}

function getAdminTokenFromRequest(req) {
  const headerToken = req.headers['x-travel-admin-token'];
  return (
    getBearerToken(req) ||
    (Array.isArray(headerToken) ? headerToken[0] : headerToken) ||
    ''
  ).trim();
}

function safeTokenEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    timingSafeEqual(leftBuffer, leftBuffer);
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function requireAdmin(req) {
  const configuredToken = (process.env.TRAVEL_RECORD_ADMIN_TOKEN || '').trim();
  if (!configuredToken) {
    throw new ApiError(
      500,
      'MISSING_ADMIN_TOKEN',
      'TRAVEL_RECORD_ADMIN_TOKEN is not configured'
    );
  }

  const requestToken = getAdminTokenFromRequest(req);
  if (!requestToken || !safeTokenEqual(requestToken, configuredToken)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid travel record admin token');
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isJourneyLocation(value) {
  if (!isObject(value)) return false;

  return (
    (value.type === 'country' || value.type === 'province' || value.type === 'city') &&
    typeof value.name === 'string' &&
    typeof value.label === 'string' &&
    (
      value.coords === undefined ||
      (
        Array.isArray(value.coords) &&
        value.coords.length === 2 &&
        value.coords.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
      )
    )
  );
}

function isJourney(value) {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    (value.date === undefined || typeof value.date === 'string') &&
    (
      value.transportMode === undefined ||
      value.transportMode === 'default' ||
      value.transportMode === 'train' ||
      value.transportMode === 'flight'
    ) &&
    (value.showEndpoints === undefined || typeof value.showEndpoints === 'boolean') &&
    (value.departure === undefined || value.departure === null || isJourneyLocation(value.departure)) &&
    (value.destination === undefined || value.destination === null || isJourneyLocation(value.destination)) &&
    Array.isArray(value.locations) &&
    value.locations.every(isJourneyLocation) &&
    (value.description === undefined || typeof value.description === 'string') &&
    (value.url === undefined || typeof value.url === 'string')
  );
}

function isPersonalRecord(value) {
  return (
    isObject(value) &&
    typeof value.userId === 'string' &&
    typeof value.userName === 'string' &&
    (value.kind === undefined || value.kind === 'personal' || value.kind === 'historical') &&
    (value.source === undefined || value.source === 'preset' || value.source === 'custom') &&
    (value.description === undefined || typeof value.description === 'string') &&
    (value.birthplace === undefined || value.birthplace === null || isJourneyLocation(value.birthplace)) &&
    (value.passengerName === undefined || typeof value.passengerName === 'string') &&
    Array.isArray(value.journeys) &&
    value.journeys.every(isJourney)
  );
}

function isLibraryState(value) {
  return (
    isObject(value) &&
    isPersonalRecord(value.personalRecord) &&
    Array.isArray(value.historicalRecords) &&
    typeof value.activeRecordId === 'string'
  );
}

function cloneLocation(location) {
  return {
    type: location.type,
    name: location.name.trim(),
    label: location.label.trim(),
    ...(location.coords ? { coords: [location.coords[0], location.coords[1]] } : {}),
  };
}

function cloneJourney(journey) {
  return {
    title: journey.title.trim(),
    ...(journey.date ? { date: journey.date.trim() } : {}),
    ...(journey.transportMode ? { transportMode: journey.transportMode } : {}),
    ...(journey.showEndpoints !== undefined ? { showEndpoints: Boolean(journey.showEndpoints) } : {}),
    ...(journey.departure === undefined ? {} : { departure: journey.departure ? cloneLocation(journey.departure) : null }),
    ...(journey.destination === undefined ? {} : { destination: journey.destination ? cloneLocation(journey.destination) : null }),
    locations: journey.locations.map(cloneLocation),
    ...(journey.description ? { description: journey.description.trim() } : {}),
    ...(journey.url ? { url: journey.url.trim() } : {}),
    id: journey.id.trim(),
  };
}

function normalizePersonalRecord(record) {
  if (!isPersonalRecord(record)) {
    throw new ApiError(
      400,
      'BAD_RECORD',
      'personalRecord must contain userId, userName, and a valid journeys array'
    );
  }

  return {
    userId: PERSONAL_RECORD_ID,
    userName: PERSONAL_RECORD_NAME,
    kind: 'personal',
    description: typeof record.description === 'string' ? record.description.trim() : '',
    birthplace: record.birthplace ? cloneLocation(record.birthplace) : null,
    passengerName: typeof record.passengerName === 'string' ? record.passengerName.trim() : '',
    journeys: record.journeys.map(cloneJourney),
  };
}

function extractPersonalRecord(value) {
  if (isLibraryState(value)) return normalizePersonalRecord(value.personalRecord);
  if (isPersonalRecord(value)) return normalizePersonalRecord(value);

  throw new ApiError(502, 'BAD_REMOTE_RECORD', 'Remote travel record has an unsupported shape');
}

function buildTargetPayload(target, currentValue, personalRecord) {
  if (target.shape === 'record') return personalRecord;

  if (isLibraryState(currentValue)) {
    return {
      ...currentValue,
      personalRecord,
      activeRecordId:
        currentValue.activeRecordId === currentValue.personalRecord.userId
          ? PERSONAL_RECORD_ID
          : currentValue.activeRecordId,
      dismissedPresetRecordIds: Array.isArray(currentValue.dismissedPresetRecordIds)
        ? currentValue.dismissedPresetRecordIds
        : [],
    };
  }

  return {
    personalRecord,
    historicalRecords: [],
    activeRecordId: PERSONAL_RECORD_ID,
    dismissedPresetRecordIds: [],
  };
}

function getCommitter() {
  const name = (process.env.TRAVEL_RECORD_COMMITTER_NAME || '').trim();
  const email = (process.env.TRAVEL_RECORD_COMMITTER_EMAIL || '').trim();

  return name && email ? { name, email } : undefined;
}

async function githubRequest(url, options = {}) {
  const token = getGithubToken();
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.ok) return response;

  let details = null;
  try {
    details = await response.json();
  } catch {
    details = await response.text();
  }

  throw new ApiError(
    response.status,
    'GITHUB_REQUEST_FAILED',
    `GitHub request failed with HTTP ${response.status}`,
    details
  );
}

async function readGithubJson(target) {
  const url = `${getContentsUrl(target)}?ref=${encodeURIComponent(target.branch)}`;
  const response = await githubRequest(url);
  const payload = await response.json();

  if (payload.type !== 'file' || typeof payload.content !== 'string') {
    throw new ApiError(502, 'GITHUB_BAD_CONTENT', `${target.label} record path is not a file`);
  }

  const raw = Buffer.from(payload.content.replace(/\n/g, ''), 'base64').toString('utf8');

  try {
    return {
      value: JSON.parse(raw),
      raw,
      sha: payload.sha,
      htmlUrl: payload.html_url,
    };
  } catch {
    throw new ApiError(502, 'GITHUB_BAD_JSON', `${target.label} record file is not valid JSON`);
  }
}

async function putGithubJson(target, nextValue, currentFile, message) {
  const nextRaw = `${JSON.stringify(nextValue, null, 2)}\n`;

  if (currentFile.raw === nextRaw) {
    return {
      target: target.id,
      repo: target.repo,
      branch: target.branch,
      path: target.path,
      status: 'unchanged',
      sha: currentFile.sha,
      htmlUrl: currentFile.htmlUrl,
    };
  }

  const response = await githubRequest(getContentsUrl(target), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(nextRaw, 'utf8').toString('base64'),
      sha: currentFile.sha,
      branch: target.branch,
      ...(getCommitter() ? { committer: getCommitter() } : {}),
    }),
  });
  const payload = await response.json();

  return {
    target: target.id,
    repo: target.repo,
    branch: target.branch,
    path: target.path,
    status: 'updated',
    sha: payload.content?.sha || currentFile.sha,
    commitSha: payload.commit?.sha,
    htmlUrl: payload.content?.html_url || currentFile.htmlUrl,
    commitUrl: payload.commit?.html_url,
  };
}

async function handleGet(res) {
  const target = getTargets()[0];
  const currentFile = await readGithubJson(target);
  const personalRecord = extractPersonalRecord(currentFile.value);

  return json(res, 200, {
    ok: true,
    personalRecord,
    source: {
      target: target.id,
      repo: target.repo,
      branch: target.branch,
      path: target.path,
      sha: currentFile.sha,
      htmlUrl: currentFile.htmlUrl,
    },
  });
}

async function handlePut(req, res) {
  requireAdmin(req);

  if (!getGithubToken()) {
    throw new ApiError(
      500,
      'MISSING_GITHUB_TOKEN',
      'TRAVEL_RECORD_GITHUB_TOKEN or GITHUB_TOKEN is not configured'
    );
  }

  const body = await readJsonBody(req);
  const personalRecord = normalizePersonalRecord(body.personalRecord ?? body);
  const targets = getTargets();
  const message = typeof body.message === 'string' && body.message.trim()
    ? body.message.trim()
    : `chore(travel): publish ${PERSONAL_RECORD_NAME} travel record`;
  const commits = [];

  for (const target of targets) {
    const currentFile = await readGithubJson(target);
    const nextValue = buildTargetPayload(target, currentFile.value, personalRecord);
    commits.push(await putGithubJson(target, nextValue, currentFile, message));
  }

  return json(res, 200, {
    ok: true,
    personalRecord,
    commits,
    updatedAt: new Date().toISOString(),
  });
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    if (req.method === 'GET') return await handleGet(res);
    if (req.method === 'PUT') return await handlePut(req, res);

    res.setHeader('Allow', 'GET, PUT, OPTIONS');
    return json(res, 405, {
      ok: false,
      code: 'METHOD_NOT_ALLOWED',
      error: 'Only GET and PUT are supported',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return json(res, error.status, {
        ok: false,
        code: error.code,
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
    }

    return json(res, 500, {
      ok: false,
      code: 'TRAVEL_RECORD_API_ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
