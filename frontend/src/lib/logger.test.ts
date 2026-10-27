import { describe, expect, it } from 'vitest';
import { scrubUrl } from './logger';

describe('scrubUrl', () => {
  it('replaces UUID path segments', () => {
    expect(scrubUrl('/api/v1/projects/9f1c2b3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d/photos')).toBe(
      '/api/v1/projects/:id/photos',
    );
  });

  it('replaces a trailing UUID segment', () => {
    expect(scrubUrl('/api/v1/chats/9f1c2b3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d')).toBe('/api/v1/chats/:id');
  });

  it('replaces numeric id segments', () => {
    expect(scrubUrl('/api/v1/photos/4821')).toBe('/api/v1/photos/:id');
  });

  it('drops the origin and the query string', () => {
    const scrubbed = scrubUrl(
      'https://gateway.example.com/api/v1/projects/12/logs?token=secret&page=2',
    );
    expect(scrubbed).toBe('/api/v1/projects/:id/logs');
    expect(scrubbed).not.toContain('secret');
    expect(scrubbed).not.toContain('gateway.example.com');
    expect(scrubbed).not.toContain('?');
  });

  it('leaves route-shaped paths untouched', () => {
    expect(scrubUrl('/api/v1/projects')).toBe('/api/v1/projects');
  });

  it('returns a placeholder rather than throwing on garbage', () => {
    expect(scrubUrl('http://[::1')).toBe('/unparsable');
  });
});
