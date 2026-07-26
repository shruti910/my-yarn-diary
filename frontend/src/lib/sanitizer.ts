import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content using DOMPurify to neutralize XSS vulnerabilities.
 * Configured with safe defaults for rendering formatted rich text and Markdown.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'class', 'className',
      'id', 'title', 'width', 'height', 'align', 'style'
    ],
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'style', 'base'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  });
}

/**
 * Sanitizes plain text input by stripping all HTML tags and unescaping dangerous entities.
 */
export function sanitizeText(dirtyText: string): string {
  if (!dirtyText) return '';
  return DOMPurify.sanitize(dirtyText, { ALLOWED_TAGS: [] });
}
