import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const travelTrackerRoot = path.resolve(__dirname, '..');
const markBlogRoot = path.resolve(travelTrackerRoot, '../Mark-blog');
const PERSONAL_RECORD_ID = 'mark';
const PERSONAL_RECORD_NAME = 'Mark';

const trackerLibraryPath = path.resolve(travelTrackerRoot, 'src/data/personalJourneyLibrary.json');
const blogContentRecordPath = path.resolve(markBlogRoot, 'content/travel/records/mark.json');
const legacyBlogContentRecordPath = path.resolve(markBlogRoot, 'content/travel/personal-record.json');
const legacyBlogSnapshotPath = path.resolve(markBlogRoot, 'apps/web/src/data/travelFootprintRecord.json');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function looksLikePersonalRecord(value) {
  return isObject(value)
    && typeof value.userId === 'string'
    && typeof value.userName === 'string'
    && Array.isArray(value.journeys);
}

function looksLikeLibraryState(value) {
  return isObject(value)
    && looksLikePersonalRecord(value.personalRecord)
    && Array.isArray(value.historicalRecords)
    && typeof value.activeRecordId === 'string';
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveSourcePath() {
  const explicitSource = process.argv[2];
  const candidates = [
    explicitSource ? path.resolve(process.cwd(), explicitSource) : null,
    trackerLibraryPath,
    blogContentRecordPath,
    legacyBlogContentRecordPath,
    legacyBlogSnapshotPath,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'No travel record source found. Pass a JSON file path, or ensure an existing record is present.'
  );
}

async function loadSourceData(sourcePath) {
  const raw = await fs.readFile(sourcePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (looksLikeLibraryState(parsed)) {
    return {
      personalRecord: parsed.personalRecord,
      libraryState: {
        personalRecord: parsed.personalRecord,
        historicalRecords: parsed.historicalRecords,
        activeRecordId: parsed.activeRecordId || parsed.personalRecord.userId,
        dismissedPresetRecordIds: [],
      },
    };
  }

  if (looksLikePersonalRecord(parsed)) {
    return {
      personalRecord: parsed,
      libraryState: {
        personalRecord: parsed,
        historicalRecords: [],
        activeRecordId: parsed.userId,
        dismissedPresetRecordIds: [],
      },
    };
  }

  throw new Error(
    `Unsupported JSON shape in ${sourcePath}. Expected a personal record or a library state.`
  );
}

async function writeJson(targetPath, value) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function removeIfExists(targetPath) {
  await fs.rm(targetPath, { force: true });
}

function normalizePersonalRecordIdentity(personalRecord) {
  return {
    ...personalRecord,
    userId: PERSONAL_RECORD_ID,
    userName: PERSONAL_RECORD_NAME,
  };
}

async function main() {
  const sourcePath = await resolveSourcePath();
  const { personalRecord, libraryState } = await loadSourceData(sourcePath);
  const normalizedPersonalRecord = normalizePersonalRecordIdentity(personalRecord);
  const normalizedLibraryState = {
    ...libraryState,
    personalRecord: normalizePersonalRecordIdentity(libraryState.personalRecord),
    activeRecordId:
      libraryState.activeRecordId === libraryState.personalRecord.userId
        ? PERSONAL_RECORD_ID
        : libraryState.activeRecordId,
  };

  await writeJson(trackerLibraryPath, normalizedLibraryState);
  await writeJson(blogContentRecordPath, normalizedPersonalRecord);
  await removeIfExists(legacyBlogContentRecordPath);
  await removeIfExists(legacyBlogSnapshotPath);

  console.log(`Synced travel data from ${sourcePath}`);
  console.log(`  -> ${trackerLibraryPath}`);
  console.log(`  -> ${blogContentRecordPath}`);
  console.log(`  cleaned ${legacyBlogContentRecordPath}`);
  console.log(`  cleaned ${legacyBlogSnapshotPath}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
