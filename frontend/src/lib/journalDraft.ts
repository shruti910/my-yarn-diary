export const TEXT_DRAFT_PREFIX = 'journal_draft_';
export const PHOTO_DRAFT_PREFIX = 'journal_draft_photo_';
export const PATTERN_DRAFT_PREFIX = 'pattern_text_draft_';

/** ~1.4M base64 chars is roughly 1MB of JPEG. */
export const MAX_DRAFT_PHOTO_CHARS = 1_400_000;

export interface PhotoDraft {
  mime: string;
  b64: string;
}

export type DraftSaveResult = 'saved' | 'too-large' | 'quota-exceeded';

export function encodePhotoDraft(mime: string, b64: string): string {
  return JSON.stringify({ v: 2, mime, b64 });
}

/** Accepts the v2 shape and the legacy v1 shape, so drafts written by the
 *  previous build survive the first load after deploy. */
export function decodePhotoDraft(raw: string | null): PhotoDraft | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (parsed?.v === 2 && typeof parsed.b64 === 'string' && parsed.b64) {
      return {
        mime: typeof parsed.mime === 'string' && parsed.mime ? parsed.mime : 'image/jpeg',
        b64: parsed.b64,
      };
    }

    const legacyB64 =
      typeof parsed?.logImageBase64 === 'string' && parsed.logImageBase64
        ? parsed.logImageBase64
        : typeof parsed?.logImage === 'string'
          ? (parsed.logImage.split(',')[1] ?? '')
          : '';

    if (!legacyB64) return null;

    return {
      mime:
        typeof parsed?.logImageMime === 'string' && parsed.logImageMime
          ? parsed.logImageMime
          : 'image/jpeg',
      b64: legacyB64,
    };
  } catch {
    return null;
  }
}

export function toDataUrl(draft: PhotoDraft): string {
  return `data:${draft.mime};base64,${draft.b64}`;
}

/** Never throws; on quota failure evicts other projects' photo drafts and
 *  retries once before giving up. */
export function savePhotoDraft(projectId: string, mime: string, b64: string): DraftSaveResult {
  const key = PHOTO_DRAFT_PREFIX + projectId;

  if (!b64) {
    localStorage.removeItem(key);
    return 'saved';
  }

  if (b64.length > MAX_DRAFT_PHOTO_CHARS) {
    localStorage.removeItem(key);
    return 'too-large';
  }

  const payload = encodePhotoDraft(mime, b64);

  try {
    localStorage.setItem(key, payload);
    return 'saved';
  } catch {
    clearPhotoDraftsExcept(projectId);
    try {
      localStorage.setItem(key, payload);
      return 'saved';
    } catch {
      localStorage.removeItem(key);
      return 'quota-exceeded';
    }
  }
}

export function loadPhotoDraft(projectId: string): PhotoDraft | null {
  return decodePhotoDraft(localStorage.getItem(PHOTO_DRAFT_PREFIX + projectId));
}

export function clearPhotoDraft(projectId: string): void {
  localStorage.removeItem(PHOTO_DRAFT_PREFIX + projectId);
}

export function clearTextDraft(projectId: string): void {
  localStorage.removeItem(TEXT_DRAFT_PREFIX + projectId);
}

/** Never throws: this runs inside a render effect. */
export function saveTextDraft(projectId: string, text: string): DraftSaveResult {
  try {
    localStorage.setItem(TEXT_DRAFT_PREFIX + projectId, text);
    return 'saved';
  } catch {
    return 'quota-exceeded';
  }
}

/** Iterates backwards: removeItem reindexes localStorage as we go. */
function removeByPrefix(prefixes: string[], keep?: string): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key !== keep && prefixes.some(prefix => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

function clearPhotoDraftsExcept(projectId: string): void {
  removeByPrefix([PHOTO_DRAFT_PREFIX], PHOTO_DRAFT_PREFIX + projectId);
}

/** TEXT_DRAFT_PREFIX is a prefix of PHOTO_DRAFT_PREFIX, so this clears both. */
export function clearAllDrafts(): void {
  removeByPrefix([TEXT_DRAFT_PREFIX, PATTERN_DRAFT_PREFIX]);
}
