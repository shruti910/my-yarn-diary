import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_DRAFT_PHOTO_CHARS,
  PATTERN_DRAFT_PREFIX,
  PHOTO_DRAFT_PREFIX,
  TEXT_DRAFT_PREFIX,
  clearAllDrafts,
  decodePhotoDraft,
  encodePhotoDraft,
  loadPhotoDraft,
  savePhotoDraft,
  saveTextDraft,
  toDataUrl,
} from './journalDraft';

/** localStorage stand-in with a settable byte cap, so the quota branch runs for real. */
class FakeStorage implements Storage {
  private store = new Map<string, string>();

  constructor(private capacity = Infinity) {}

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    const projected = this.usedExcluding(key) + key.length + value.length;
    if (projected > this.capacity) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  private usedExcluding(excludedKey: string): number {
    let total = 0;
    for (const [k, v] of this.store) {
      if (k !== excludedKey) total += k.length + v.length;
    }
    return total;
  }
}

function installStorage(capacity?: number): FakeStorage {
  const storage = new FakeStorage(capacity);
  globalThis.localStorage = storage;
  return storage;
}

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  delete (globalThis as Partial<typeof globalThis>).localStorage;
});

describe('decodePhotoDraft', () => {
  it('round-trips the v2 shape', () => {
    const decoded = decodePhotoDraft(encodePhotoDraft('image/png', 'AAAA'));
    expect(decoded).toEqual({ mime: 'image/png', b64: 'AAAA' });
  });

  it('rebuilds a data URL from the decoded draft', () => {
    expect(toDataUrl({ mime: 'image/jpeg', b64: 'AAAA' })).toBe('data:image/jpeg;base64,AAAA');
  });

  it('decodes the legacy v1 shape via logImageBase64', () => {
    const legacy = JSON.stringify({
      logImage: 'data:image/jpeg;base64,AAAA',
      logImageMime: 'image/jpeg',
      logImageBase64: 'AAAA',
    });
    expect(decodePhotoDraft(legacy)).toEqual({ mime: 'image/jpeg', b64: 'AAAA' });
  });

  it('decodes the legacy v1 shape when only the data URL is present', () => {
    const legacy = JSON.stringify({ logImage: 'data:image/png;base64,BBBB', logImageMime: 'image/png' });
    expect(decodePhotoDraft(legacy)).toEqual({ mime: 'image/png', b64: 'BBBB' });
  });

  it('defaults a missing mime to image/jpeg', () => {
    expect(decodePhotoDraft(JSON.stringify({ v: 2, b64: 'AAAA' }))?.mime).toBe('image/jpeg');
  });

  it('returns null instead of throwing on malformed JSON', () => {
    expect(decodePhotoDraft('{not json')).toBeNull();
    expect(decodePhotoDraft('null')).toBeNull();
    expect(decodePhotoDraft(null)).toBeNull();
    expect(decodePhotoDraft(JSON.stringify({ v: 2, b64: '' }))).toBeNull();
  });
});

describe('savePhotoDraft', () => {
  it('saves and loads a draft', () => {
    expect(savePhotoDraft('p1', 'image/jpeg', 'AAAA')).toBe('saved');
    expect(loadPhotoDraft('p1')).toEqual({ mime: 'image/jpeg', b64: 'AAAA' });
  });

  it('stores the base64 exactly once', () => {
    savePhotoDraft('p1', 'image/jpeg', 'PAYLOAD');
    const raw = localStorage.getItem(PHOTO_DRAFT_PREFIX + 'p1') ?? '';
    expect(raw.split('PAYLOAD').length - 1).toBe(1);
  });

  it('clears the key when the base64 is empty', () => {
    savePhotoDraft('p1', 'image/jpeg', 'AAAA');
    expect(savePhotoDraft('p1', 'image/jpeg', '')).toBe('saved');
    expect(loadPhotoDraft('p1')).toBeNull();
  });

  it('refuses an oversized photo without writing', () => {
    const oversized = 'A'.repeat(MAX_DRAFT_PHOTO_CHARS + 1);
    expect(savePhotoDraft('p1', 'image/jpeg', oversized)).toBe('too-large');
    expect(localStorage.getItem(PHOTO_DRAFT_PREFIX + 'p1')).toBeNull();
  });

  it('evicts other projects photo drafts and retries once when over quota', () => {
    installStorage(400);
    savePhotoDraft('other', 'image/jpeg', 'B'.repeat(200));

    expect(savePhotoDraft('mine', 'image/jpeg', 'A'.repeat(200))).toBe('saved');
    expect(loadPhotoDraft('mine')?.b64).toBe('A'.repeat(200));
    expect(loadPhotoDraft('other')).toBeNull();
  });

  it('reports quota-exceeded and leaves no partial key when eviction is not enough', () => {
    installStorage(50);
    expect(savePhotoDraft('mine', 'image/jpeg', 'A'.repeat(200))).toBe('quota-exceeded');
    expect(localStorage.getItem(PHOTO_DRAFT_PREFIX + 'mine')).toBeNull();
  });
});

describe('saveTextDraft', () => {
  it('saves the text draft', () => {
    expect(saveTextDraft('p1', 'some notes')).toBe('saved');
    expect(localStorage.getItem(`${TEXT_DRAFT_PREFIX}p1`)).toBe('some notes');
  });

  it('reports quota-exceeded rather than throwing', () => {
    installStorage(10);
    expect(() => saveTextDraft('p1', 'x'.repeat(500))).not.toThrow();
    expect(saveTextDraft('p1', 'x'.repeat(500))).toBe('quota-exceeded');
  });
});

describe('clearAllDrafts', () => {
  it('removes every draft prefix and leaves session keys alone', () => {
    localStorage.setItem(`${TEXT_DRAFT_PREFIX}p1`, 'notes');
    localStorage.setItem(`${PHOTO_DRAFT_PREFIX}p1`, encodePhotoDraft('image/jpeg', 'AAAA'));
    localStorage.setItem(`${PATTERN_DRAFT_PREFIX}x1`, 'pattern');
    localStorage.setItem('crochet_user', '{"id":1}');
    localStorage.setItem('crochet_sidebar_collapsed', 'true');

    clearAllDrafts();

    expect(localStorage.getItem(`${TEXT_DRAFT_PREFIX}p1`)).toBeNull();
    expect(localStorage.getItem(`${PHOTO_DRAFT_PREFIX}p1`)).toBeNull();
    expect(localStorage.getItem(`${PATTERN_DRAFT_PREFIX}x1`)).toBeNull();
    expect(localStorage.getItem('crochet_user')).toBe('{"id":1}');
    expect(localStorage.getItem('crochet_sidebar_collapsed')).toBe('true');
  });
});
