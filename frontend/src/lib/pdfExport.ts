/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { Project, JournalLog, Category, ProjectStatus, Pattern } from '../types';
import { GrandHotelBase64 } from './GrandHotelBase64';

/**
 * Detects whether a string contains emojis or complex Pictographic characters.
 */
export function containsEmoji(text: string): boolean {
  if (!text) return false;
  return /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F?/u.test(text);
}

/**
 * Sanitizes a string for use as a filesystem filename across Windows, macOS, and Linux.
 * PRESERVES ALL valid Unicode characters, emojis, accents, and international text.
 * ONLY replaces characters strictly forbidden by operating system filesystems:
 * < > : " / \ | ? * and ASCII control characters (0x00 - 0x1F).
 */
export function sanitizeFilename(name: string): string {
  if (!name) return 'Project';
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim()
    .replace(/\s+/g, ' ');
  return cleaned || 'Project';
}

export interface CanvasTextOptions {
  fontSizePt: number;
  textColor?: string;
  fontWeight?: string;
  fontFamily?: string;
  maxWidthMm?: number;
  lineHeightMultiplier?: number;
  align?: 'left' | 'center' | 'right';
}

/**
 * Renders text containing emojis onto an offscreen canvas with native OS emoji rendering
 * (Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji) and returns crisp PNG image bytes.
 * This preserves emojis in full color and prevents WinAnsi Latin-1 encoding corruption (e.g. Ø=ÜR).
 */
export function renderTextWithEmojiToDataUrl(
  text: string,
  options: CanvasTextOptions
): { dataUrl: string; widthMm: number; heightMm: number } {
  const {
    fontSizePt,
    textColor = '#242223',
    fontWeight = 'normal',
    fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    maxWidthMm,
    lineHeightMultiplier = 1.35,
    align = 'left'
  } = options;

  // 4x resolution factor for crisp retina-grade rendering in PDF
  const scale = 4;
  const ptToPx = fontSizePt * (96 / 72);
  const fontSizePx = ptToPx * scale;
  const lineHeightPx = fontSizePx * lineHeightMultiplier;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: '', widthMm: 0, heightMm: 0 };
  }

  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;

  const maxWidthPx = maxWidthMm ? maxWidthMm * (96 / 25.4) * scale : undefined;

  // Split lines by explicit newlines, then wrap lines by words
  const inputLines = text.split('\n');
  const wrappedLines: string[] = [];

  for (const rawLine of inputLines) {
    if (!rawLine) {
      wrappedLines.push('');
      continue;
    }
    const words = rawLine.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (maxWidthPx && metrics.width > maxWidthPx && currentLine) {
        wrappedLines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  // Calculate canvas dimensions
  let maxLineWidth = 0;
  for (const line of wrappedLines) {
    const w = ctx.measureText(line).width;
    if (w > maxLineWidth) maxLineWidth = w;
  }

  const paddingPx = 4 * scale;
  const targetWidthPx = Math.ceil(maxWidthPx ? Math.min(Math.max(maxLineWidth, 10), maxWidthPx) : maxLineWidth) + (paddingPx * 2);
  const targetHeightPx = Math.ceil(Math.max(wrappedLines.length, 1) * lineHeightPx) + (paddingPx * 2);

  canvas.width = targetWidthPx;
  canvas.height = targetHeightPx;

  // Clear transparent background and set styles
  ctx.clearRect(0, 0, targetWidthPx, targetHeightPx);
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';

  for (let idx = 0; idx < wrappedLines.length; idx++) {
    const line = wrappedLines[idx];
    if (!line) continue;
    let drawX = paddingPx;
    if (align === 'center') {
      const lineW = ctx.measureText(line).width;
      drawX = (targetWidthPx - lineW) / 2;
    } else if (align === 'right') {
      const lineW = ctx.measureText(line).width;
      drawX = targetWidthPx - lineW - paddingPx;
    }
    ctx.fillText(line, drawX, paddingPx + (idx * lineHeightPx));
  }

  // Convert canvas pixels back to mm for jsPDF dimensions (1 px at 96 DPI = 25.4 / 96 mm)
  const widthMm = (targetWidthPx / scale) * (25.4 / 96);
  const heightMm = (targetHeightPx / scale) * (25.4 / 96);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthMm,
    heightMm
  };
}

interface ImageCache {
 [url: string]: { width: number; height: number };
}

/**
 * Helper to parse image pattern content whether stored as a single base64 string
 * or a JSON string array of base64 images.
 */
function getImagePatternUrls(patternContent: string): string[] {
  if (!patternContent) return [];
  try {
    const parsed = JSON.parse(patternContent);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }
  } catch {
    // Single base64 string fallback
  }
  return [patternContent];
}

/**
 * Preloads all project images (cover photo, gallery photos, journal logs, pattern images)
 * to determine their natural dimensions for proportional rendering in the PDF.
 */
async function preloadImages(
  coverPhotoBase64: string | null,
  productPhotos: string[],
  logs: JournalLog[],
  patterns: Pattern[]
): Promise<ImageCache> {
  const cache: ImageCache = {};
  const urls: string[] = [];

  if (coverPhotoBase64) urls.push(coverPhotoBase64);
  productPhotos.forEach(p => {
    if (p) urls.push(p);
  });
  logs.forEach(log => {
    if (log.imageBase64) urls.push(log.imageBase64);
  });
  patterns.forEach(p => {
    if (p.patternType === 'image' && p.patternContent) {
      const imgs = getImagePatternUrls(p.patternContent);
      imgs.forEach(url => urls.push(url));
    }
  });

 const uniqueUrls = Array.from(new Set(urls));

 await Promise.all(
 uniqueUrls.map(url => {
 return new Promise<void>((resolve) => {
 const img = new Image();
 img.onload = () => {
 cache[url] = { width: img.naturalWidth, height: img.naturalHeight };
 resolve();
 };
 img.onerror = () => {
 // Fallback to default landscape aspect ratio
 cache[url] = { width: 400, height: 300 };
 resolve();
 };
 img.src = url;
 });
 })
 );

 return cache;
}

class PDFPageContext {
 doc: jsPDF;
 currentY: number;
 marginLeft = 20;
 marginRight = 20;
 marginTop = 30; // Content starts below header divider (y = 20)
 marginBottom = 25; // Content ends above footer divider (y = 280)
 pageWidth = 210; // A4 Portrait dimensions in mm
 pageHeight = 297;
 usableWidth = 170; // 210 - (20 * 2)

 constructor(doc: jsPDF) {
 this.doc = doc;
 this.currentY = this.marginTop;
 }

 /**
 * Checks if drawing the specified height will exceed the current page bounds.
 * If yes, pushes cursor to a new page.
 * Returns true if a page boundary was crossed.
 */
 ensureSpace(neededHeight: number): boolean {
 if (this.currentY + neededHeight > this.pageHeight - this.marginBottom) {
 this.doc.addPage();
 this.currentY = this.marginTop;
 return true;
 }
 return false;
 }
}

/**
 * Draws the logo, header running title, and footers with page numbers on a specific page.
 */
function drawHeaderAndFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  projectTitle: string,
  logoImg: HTMLImageElement | null
) {
  // --- HEADER SECTION ---
  let textX = 20; // Default fallback left-aligned X position

  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', 20.5, 11, 7, 7, undefined, 'FAST');
      textX = 30; // Shift text to make room for logo
    } catch (err) {
      console.warn('Failed to draw loaded logo, falling back to text only', err);
    }
  }

  // Website Brand Name Text
  doc.setFont('Grand Hotel', 'normal');
  doc.setFontSize(15);
  doc.setTextColor('#BC5873'); // Brand Logo color
  doc.text('My Yarn Diary', textX, 14.5);

  // Brand Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor('#813B4C');
  doc.text('CRAFTER COMPANION', textX, 18);

  // Right-aligned Project Title running text
  const safeProjectTitle = projectTitle || '';
  if (containsEmoji(safeProjectTitle)) {
    const truncatedTitle = safeProjectTitle.length > 35 ? safeProjectTitle.substring(0, 32) + '...' : safeProjectTitle;
    const rendered = renderTextWithEmojiToDataUrl(truncatedTitle, {
      fontSizePt: 8.5,
      textColor: '#813B4C',
      fontWeight: 'normal',
      align: 'right',
      maxWidthMm: 70
    });
    doc.addImage(rendered.dataUrl, 'PNG', 190 - rendered.widthMm, 10.5, rendered.widthMm, rendered.heightMm);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor('#813B4C');
    const truncatedTitle = safeProjectTitle.length > 35 ? safeProjectTitle.substring(0, 32) + '...' : safeProjectTitle;
    doc.text(truncatedTitle, 190, 14, { align: 'right' });
  }

  // Header Divider
  doc.setDrawColor('#BABABA');
  doc.setLineWidth(0.25);
  doc.line(20, 20, 190, 20);

  // --- FOOTER SECTION ---
  // Footer Divider
  doc.line(20, 280, 190, 280);

  // Left-aligned watermark tagline
  doc.setFont('Grand Hotel', 'normal');
  doc.setFontSize(12);
  doc.setTextColor('#BC5873');
  doc.text('My Yarn Diary', 20, 285.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor('#696868');
  doc.text(' - Handmade with Love', 42, 285.5);

  // Right-aligned Page numbering
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Page ${pageNum} of ${totalPages}`, 190, 285.5, { align: 'right' });
}

/**
 * Safely inserts a base64 image into the PDF. If the image is invalid, renders a fallback placeholder.
 */
function addImageSafe(
 doc: jsPDF,
 base64: string,
 x: number,
 y: number,
 w: number,
 h: number
) {
 try {
 // Strip headers if they exist to extract mime-type
 let format = 'JPEG';
 if (base64.startsWith('data:image/png;')) {
 format = 'PNG';
 } else if (base64.startsWith('data:image/webp;')) {
 format = 'WEBP';
 }
 doc.addImage(base64, format, x, y, w, h, undefined, 'FAST');
 } catch (err) {
 console.warn('PDF export: Failed to add image, rendering placeholder.', err);
 // Draw visual placeholder
 doc.setFillColor('#F4F0F0');
 doc.rect(x, y, w, h, 'F');
 doc.setDrawColor('#BABABA');
 doc.rect(x, y, w, h, 'S');

 doc.setFont('helvetica', 'italic');
 doc.setFontSize(8);
 doc.setTextColor('#696868');
 doc.text('[Image Unavailable]', x + w / 2, y + h / 2, { align: 'center' });
 }
}

/**
 * Generates and downloads the PDF export for a specific project.
 */
export async function exportProjectToPdf(
  project: Project,
  logs: JournalLog[],
  categoryName: string,
  selectedCoverPhotoIdOrBase64: string | null,
  rawProductPhotos?: string[],
  download: boolean = true
): Promise<Uint8Array> {
  const allProductPhotos = (rawProductPhotos && rawProductPhotos.length > 0)
    ? rawProductPhotos
    : (project.photos || []).map(p => p.photoBase64);

  // Resolve the cover photo base64
  let coverPhotoBase64: string | null = null;
  if (selectedCoverPhotoIdOrBase64) {
    const matched = project.photos?.find(p => String(p.id) === selectedCoverPhotoIdOrBase64 || p.photoBase64 === selectedCoverPhotoIdOrBase64);
    if (matched) {
      coverPhotoBase64 = matched.photoBase64;
    } else if (selectedCoverPhotoIdOrBase64.startsWith('data:image/')) {
      coverPhotoBase64 = selectedCoverPhotoIdOrBase64;
    }
  }
  if (!coverPhotoBase64 && allProductPhotos.length > 0) {
    const coverObj = project.photos?.find(p => p.isCover);
    coverPhotoBase64 = coverObj ? coverObj.photoBase64 : allProductPhotos[0];
  }

  // Check if there are any PDF patterns and count their pages beforehand
  const pdfPatterns = (project.patterns || []).filter(p => p.patternType === 'pdf' && p.patternContent);
  let pdfPatternsPageCount = 0;
  for (const pattern of pdfPatterns) {
    try {
      const base64Data = pattern.patternContent.replace(/^data:application\/pdf;base64,/, '');
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const patternPdfDoc = await PDFDocument.load(bytes);
      pdfPatternsPageCount += patternPdfDoc.getPageCount();
    } catch (e) {
      console.warn(`Failed to read PDF page count for ${pattern.fileName || ''}:`, e);
    }
  }

  // Preload all image assets to calculate dimensions
  const imageCache = await preloadImages(coverPhotoBase64, allProductPhotos, logs, project.patterns || []);

 // Load actual logo image
 let logoImg: HTMLImageElement | null = null;
 try {
   logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
     const img = new Image();
     img.crossOrigin = 'anonymous';
     img.onload = () => resolve(img);
     img.onerror = (e) => reject(e);
     img.src = '/pwa-192x192.png';
   });
 } catch (err) {
   console.warn('Failed to load logo image for PDF:', err);
 }

 const doc = new jsPDF({
 orientation: 'portrait',
 unit: 'mm',
 format: 'a4'
 });

 doc.addFileToVFS('GrandHotel-Regular.ttf', GrandHotelBase64);
 doc.addFont('GrandHotel-Regular.ttf', 'Grand Hotel', 'normal');

 const ctx = new PDFPageContext(doc);

 // ==========================================
 // 1. PROJECT HEADER TITLE & METADATA CARD
 // ==========================================
 const rawTitle = project.title || 'UNTITLED PROJECT';
 if (containsEmoji(rawTitle)) {
   const rendered = renderTextWithEmojiToDataUrl(rawTitle, {
     fontSizePt: 16,
     fontWeight: 'bold',
     textColor: '#242223',
     maxWidthMm: ctx.usableWidth
   });
   ctx.ensureSpace(rendered.heightMm + 35);
   doc.addImage(rendered.dataUrl, 'PNG', ctx.marginLeft, ctx.currentY + 2, rendered.widthMm, rendered.heightMm);
   ctx.currentY += rendered.heightMm + 3;
 } else {
   const titleLines = doc.splitTextToSize(rawTitle.toUpperCase(), ctx.usableWidth);
   const titleHeight = titleLines.length * 6;
   ctx.ensureSpace(titleHeight + 35);
   doc.setFont('helvetica', 'bold');
   doc.setFontSize(16);
   doc.setTextColor('#242223');
   doc.text(titleLines, ctx.marginLeft, ctx.currentY + 5);
   ctx.currentY += titleHeight + 3;
 }

 // Metadata Panel card
 const panelH = 26;
 doc.setFillColor('#F4F0F0');
 doc.roundedRect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, panelH, 2, 2, 'F');

 // Metadata keys & values
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(8);
 doc.setTextColor('#813B4C'); // Category label in accent color
 doc.text('CATEGORY', ctx.marginLeft + 5, ctx.currentY + 6);
 doc.text('STATUS', ctx.marginLeft + 60, ctx.currentY + 6);
 doc.text('TIMEFRAME', ctx.marginLeft + 115, ctx.currentY + 6);

 doc.setFont('helvetica', 'bold');
 doc.setFontSize(9.5);
 doc.setTextColor('#242223');
 doc.text(categoryName.toUpperCase() || 'GENERAL', ctx.marginLeft + 5, ctx.currentY + 11.5);

 // Status Badge
 const statusStr = (project.status || ProjectStatus.Planning).toUpperCase();
 let statusColor = '#696868'; // OnHold / Planning default greyish
 if (project.status === ProjectStatus.InProgress) statusColor = '#D4738B'; // Coral
 if (project.status === ProjectStatus.Completed) statusColor = '#813B4C'; // Sage
 doc.setTextColor(statusColor);
 doc.text(statusStr, ctx.marginLeft + 60, ctx.currentY + 11.5);

 // Dates
 doc.setTextColor('#242223');
 doc.setFont('helvetica', 'normal');
 doc.setFontSize(8.5);
 const dateRange = `${project.startDate || '—'} to ${project.endDate || '—'}`;
 doc.text(dateRange, ctx.marginLeft + 115, ctx.currentY + 11.5);

 // Row Count & Time Logs
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(8);
 doc.setTextColor('#813B4C');
 doc.text('CURRENT ROWS', ctx.marginLeft + 5, ctx.currentY + 18.5);
 doc.text('TOTAL TIME', ctx.marginLeft + 60, ctx.currentY + 18.5);
 doc.text('FAVORITE', ctx.marginLeft + 115, ctx.currentY + 18.5);

 doc.setFont('helvetica', 'normal');
 doc.setFontSize(9.5);
 doc.setTextColor('#242223');
 doc.text(String(project.rowCount || 0), ctx.marginLeft + 5, ctx.currentY + 23.5);
 doc.text(project.totalTime || '0 hrs', ctx.marginLeft + 60, ctx.currentY + 23.5);
 doc.text(project.isFavorite ? 'YES' : 'NO', ctx.marginLeft + 115, ctx.currentY + 23.5);

 ctx.currentY += panelH + 8;

 // ==========================================
 // 2. COVER PHOTO
 // ==========================================
 if (coverPhotoBase64 && imageCache[coverPhotoBase64]) {
 const dim = imageCache[coverPhotoBase64];
 // Fit into 130mm width x 80mm height
 const maxW = 130;
 const maxH = 80;
 const scale = Math.min(maxW / dim.width, maxH / dim.height);
 const w = dim.width * scale;
 const h = dim.height * scale;

 ctx.ensureSpace(h + 12);
 const imgX = ctx.marginLeft + (ctx.usableWidth - w) / 2;

 // Draw card background border frame
 doc.setFillColor('#FFFFFF');
 doc.roundedRect(imgX - 2, ctx.currentY, w + 4, h + 4, 1.5, 1.5, 'FD');

 // Add Image safely
 addImageSafe(doc, coverPhotoBase64, imgX, ctx.currentY + 2, w, h);

 // Cover caption
 doc.setFont('helvetica', 'italic');
 doc.setFontSize(7.5);
 doc.setTextColor('#696868');
 doc.text('Main Showcase Photo', ctx.marginLeft + ctx.usableWidth / 2, ctx.currentY + h + 8, { align: 'center' });

 ctx.currentY += h + 13;
 }

 // ==========================================
 // 3. YARNS SECTION
 // ==========================================
 if (project.yarns && project.yarns.length > 0) {
 ctx.ensureSpace(20);
 // Header
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(11);
 doc.setTextColor('#242223');
 doc.text('YARN DETAILS', ctx.marginLeft, ctx.currentY + 4);
 doc.setDrawColor('#D4738B');
 doc.setLineWidth(0.4);
 doc.line(ctx.marginLeft, ctx.currentY + 6, ctx.marginLeft + 15, ctx.currentY + 6);
 ctx.currentY += 10;

 // Draw Yarn Table header
 const tableHeaderY = ctx.currentY;
 doc.setFillColor('#F4F0F0');
 doc.rect(ctx.marginLeft, tableHeaderY, ctx.usableWidth, 7, 'F');

 doc.setFont('helvetica', 'bold');
 doc.setFontSize(7.5);
 doc.setTextColor('#813B4C');
 doc.text('BRAND / LINE', ctx.marginLeft + 2, tableHeaderY + 4.8);
 doc.text('COLORWAY', ctx.marginLeft + 42, tableHeaderY + 4.8);
 doc.text('DYE LOT', ctx.marginLeft + 67, tableHeaderY + 4.8);
 doc.text('WEIGHT', ctx.marginLeft + 87, tableHeaderY + 4.8);
 doc.text('FIBER CONTENT', ctx.marginLeft + 107, tableHeaderY + 4.8);
 doc.text('QUANTITY', ctx.marginLeft + 151, tableHeaderY + 4.8);

 ctx.currentY += 7;

 doc.setFont('helvetica', 'normal');
 doc.setFontSize(7.5);
 doc.setTextColor('#242223');

 for (const yarn of project.yarns) {
 const brandStr = `${yarn.brand || ''} ${yarn.lineName || ''}`.trim() || '—';
 const colorStr = yarn.colorway || '—';
 const dyeLotStr = yarn.dyeLot || '—';
 const weightStr = yarn.weight || '—';
 const fiberStr = yarn.fiberContent || '—';
 const qtyStr = yarn.quantityUsed !== undefined ? `${yarn.quantityUsed} ${yarn.unit || ''}` : '—';

 // Wrapping calculations to prevent clipping
 const brandLines = doc.splitTextToSize(brandStr, 38);
 const colorLines = doc.splitTextToSize(colorStr, 23);
 const dyeLotLines = doc.splitTextToSize(dyeLotStr, 18);
 const weightLines = doc.splitTextToSize(weightStr, 18);
 const fiberLines = doc.splitTextToSize(fiberStr, 42);
 const qtyLines = doc.splitTextToSize(qtyStr, 17);

 const cellHeight = Math.max(
 brandLines.length,
 colorLines.length,
 dyeLotLines.length,
 weightLines.length,
 fiberLines.length,
 qtyLines.length
 ) * 3.6 + 2;
 ctx.ensureSpace(cellHeight);

 doc.text(brandLines, ctx.marginLeft + 2, ctx.currentY + 3.2);
 doc.text(colorLines, ctx.marginLeft + 42, ctx.currentY + 3.2);
 doc.text(dyeLotLines, ctx.marginLeft + 67, ctx.currentY + 3.2);
 doc.text(weightLines, ctx.marginLeft + 87, ctx.currentY + 3.2);
 doc.text(fiberLines, ctx.marginLeft + 107, ctx.currentY + 3.2);
 doc.text(qtyLines, ctx.marginLeft + 151, ctx.currentY + 3.2);

 // Border separator
 doc.setDrawColor('#BABABA');
 doc.setLineWidth(0.15);
 doc.line(ctx.marginLeft, ctx.currentY + cellHeight, ctx.marginLeft + ctx.usableWidth, ctx.currentY + cellHeight);

 ctx.currentY += cellHeight;
 }
 ctx.currentY += 6;
 }

 // ==========================================
 // 4. HOOKS SECTION
 // ==========================================
 if (project.hooks && project.hooks.length > 0) {
 ctx.ensureSpace(20);
 // Header
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(11);
 doc.setTextColor('#242223');
 doc.text('HOOK SPECIFICATIONS', ctx.marginLeft, ctx.currentY + 4);
 doc.setDrawColor('#D4738B');
 doc.setLineWidth(0.4);
 doc.line(ctx.marginLeft, ctx.currentY + 6, ctx.marginLeft + 15, ctx.currentY + 6);
 ctx.currentY += 10;

 // Draw Hooks Table header
 const tableHeaderY = ctx.currentY;
 doc.setFillColor('#F4F0F0');
 doc.rect(ctx.marginLeft, tableHeaderY, ctx.usableWidth, 7, 'F');

 doc.setFont('helvetica', 'bold');
 doc.setFontSize(8);
 doc.setTextColor('#813B4C');
 doc.text('SIZE (METRIC)', ctx.marginLeft + 3, tableHeaderY + 4.8);
 doc.text('SIZE (US)', ctx.marginLeft + 45, tableHeaderY + 4.8);
 doc.text('MATERIAL', ctx.marginLeft + 85, tableHeaderY + 4.8);
 doc.text('BRAND / MANUFACTURER', ctx.marginLeft + 125, tableHeaderY + 4.8);

 ctx.currentY += 7;

 doc.setFont('helvetica', 'normal');
 doc.setFontSize(8);
 doc.setTextColor('#242223');

 for (const hook of project.hooks) {
 const metricStr = hook.sizeMm ? `${hook.sizeMm} mm` : '—';
 const usSizeStr = hook.sizeUs || '—';
 const matStr = hook.material || '—';
 const brandStr = hook.brand || '—';

 const metricLines = doc.splitTextToSize(metricStr, 38);
 const usLines = doc.splitTextToSize(usSizeStr, 36);
 const matLines = doc.splitTextToSize(matStr, 36);
 const brandLines = doc.splitTextToSize(brandStr, 42);

 const cellHeight = Math.max(metricLines.length, usLines.length, matLines.length, brandLines.length) * 3.8 + 2;
 ctx.ensureSpace(cellHeight);

 doc.text(metricLines, ctx.marginLeft + 3, ctx.currentY + 3.2);
 doc.text(usLines, ctx.marginLeft + 45, ctx.currentY + 3.2);
 doc.text(matLines, ctx.marginLeft + 85, ctx.currentY + 3.2);
 doc.text(brandLines, ctx.marginLeft + 125, ctx.currentY + 3.2);

 // Border separator
 doc.setDrawColor('#BABABA');
 doc.setLineWidth(0.15);
 doc.line(ctx.marginLeft, ctx.currentY + cellHeight, ctx.marginLeft + ctx.usableWidth, ctx.currentY + cellHeight);

 ctx.currentY += cellHeight;
 }
 ctx.currentY += 6;
 }

 // ==========================================
 // 5. NOTES & CARE INSTRUCTIONS
 // ==========================================
 if (project.notes || project.careInstructions) {
 ctx.ensureSpace(20);
 // Header
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(11);
 doc.setTextColor('#242223');
 doc.text('PROJECT REMARKS & CARE', ctx.marginLeft, ctx.currentY + 4);
 doc.setDrawColor('#D4738B');
 doc.setLineWidth(0.4);
 doc.line(ctx.marginLeft, ctx.currentY + 6, ctx.marginLeft + 15, ctx.currentY + 6);
 ctx.currentY += 10;

 // Render Notes
 if (project.notes) {
   if (containsEmoji(project.notes)) {
     const rendered = renderTextWithEmojiToDataUrl(project.notes, {
       fontSizePt: 8.5,
       textColor: '#242223',
       maxWidthMm: ctx.usableWidth - 8
     });
     const notesHeight = rendered.heightMm + 10;
     ctx.ensureSpace(notesHeight + 5);

     doc.setFillColor('#FFFFFF');
     doc.rect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, notesHeight, 'F');
     doc.setDrawColor('#BABABA');
     doc.rect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, notesHeight, 'S');

     doc.setFillColor('#D4738B');
     doc.rect(ctx.marginLeft, ctx.currentY, 1.2, notesHeight, 'F');

     doc.setFont('helvetica', 'bold');
     doc.setFontSize(8.5);
     doc.setTextColor('#D4738B');
     doc.text('NOTES:', ctx.marginLeft + 4, ctx.currentY + 4.8);

     doc.addImage(rendered.dataUrl, 'PNG', ctx.marginLeft + 4, ctx.currentY + 6.5, rendered.widthMm, rendered.heightMm);
     ctx.currentY += notesHeight + 5;
   } else {
     const notesLines = doc.splitTextToSize(project.notes, ctx.usableWidth - 6);
     const notesHeight = notesLines.length * 4.2 + 8;
     ctx.ensureSpace(notesHeight + 5);

     // Draw custom container mimicking a notebook block
     doc.setFillColor('#FFFFFF');
     doc.rect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, notesHeight, 'F');
     doc.setDrawColor('#BABABA');
     doc.rect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, notesHeight, 'S');

     // Accent colored note border (Left edge highlight)
     doc.setFillColor('#D4738B');
     doc.rect(ctx.marginLeft, ctx.currentY, 1.2, notesHeight, 'F');

     doc.setFont('helvetica', 'bold');
     doc.setFontSize(8.5);
     doc.setTextColor('#D4738B');
     doc.text('NOTES:', ctx.marginLeft + 4, ctx.currentY + 4.8);

     doc.setFont('helvetica', 'normal');
     doc.setFontSize(8.5);
     doc.setTextColor('#242223');
     doc.text(notesLines, ctx.marginLeft + 4, ctx.currentY + 9.5);

     ctx.currentY += notesHeight + 5;
   }
 }

 // Render Care Instructions
 if (project.careInstructions) {
   if (containsEmoji(project.careInstructions)) {
     const rendered = renderTextWithEmojiToDataUrl(project.careInstructions, {
       fontSizePt: 8.5,
       textColor: '#242223',
       maxWidthMm: ctx.usableWidth - 8
     });
     const careHeight = rendered.heightMm + 10;
     ctx.ensureSpace(careHeight + 5);

     doc.setFillColor('#FFFFFF');
     doc.rect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, careHeight, 'F');
     doc.setDrawColor('#BABABA');
     doc.rect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, careHeight, 'S');

     doc.setFillColor('#813B4C');
     doc.rect(ctx.marginLeft, ctx.currentY, 1.2, careHeight, 'F');

     doc.setFont('helvetica', 'bold');
     doc.setFontSize(8.5);
     doc.setTextColor('#813B4C');
     doc.text('CARE INSTRUCTIONS:', ctx.marginLeft + 4, ctx.currentY + 4.8);

     doc.addImage(rendered.dataUrl, 'PNG', ctx.marginLeft + 4, ctx.currentY + 6.5, rendered.widthMm, rendered.heightMm);
     ctx.currentY += careHeight + 5;
   } else {
     const careLines = doc.splitTextToSize(project.careInstructions, ctx.usableWidth - 6);
     const careHeight = careLines.length * 4.2 + 8;
     ctx.ensureSpace(careHeight + 5);

     doc.setFillColor('#FFFFFF');
     doc.rect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, careHeight, 'F');
     doc.setDrawColor('#BABABA');
     doc.rect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, careHeight, 'S');

     // Accent border for care instructions
     doc.setFillColor('#813B4C');
     doc.rect(ctx.marginLeft, ctx.currentY, 1.2, careHeight, 'F');

     doc.setFont('helvetica', 'bold');
     doc.setFontSize(8.5);
     doc.setTextColor('#813B4C');
     doc.text('CARE INSTRUCTIONS:', ctx.marginLeft + 4, ctx.currentY + 4.8);

     doc.setFont('helvetica', 'normal');
     doc.setFontSize(8.5);
     doc.setTextColor('#242223');
     doc.text(careLines, ctx.marginLeft + 4, ctx.currentY + 9.5);

     ctx.currentY += careHeight + 5;
   }
 }
 }

 // ==========================================
 // 6. PRODUCT GALLERY (excluding cover)
 // ==========================================
 const galleryPhotos = allProductPhotos.filter(p => {
 if (!p) return false;
 const cleanP = p.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
 const cleanCover = coverPhotoBase64 ? coverPhotoBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '') : '';
 return cleanP !== cleanCover;
 });
 if (galleryPhotos.length > 0) {
 ctx.ensureSpace(30);
 // Header
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(11);
 doc.setTextColor('#242223');
 doc.text('PRODUCT GALLERY', ctx.marginLeft, ctx.currentY + 4);
 doc.setDrawColor('#D4738B');
 doc.setLineWidth(0.4);
 doc.line(ctx.marginLeft, ctx.currentY + 6, ctx.marginLeft + 15, ctx.currentY + 6);
 ctx.currentY += 10;

 // Render photos in a 2-column layout grid. Width of each image: 81mm, Height: 55mm
 const gridW = 81;
 const gridH = 55;
 const gap = 8;

 for (let i = 0; i < galleryPhotos.length; i += 2) {
 ctx.ensureSpace(gridH + 6);

 // Photo 1
 const photo1 = galleryPhotos[i];
 const x1 = ctx.marginLeft;
 doc.setDrawColor('#BABABA');
 doc.rect(x1, ctx.currentY, gridW, gridH, 'S');
 addImageSafe(doc, photo1, x1 + 1, ctx.currentY + 1, gridW - 2, gridH - 2);

 // Photo 2 (if exists)
 if (i + 1 < galleryPhotos.length) {
 const photo2 = galleryPhotos[i + 1];
 const x2 = ctx.marginLeft + gridW + gap;
 doc.rect(x2, ctx.currentY, gridW, gridH, 'S');
 addImageSafe(doc, photo2, x2 + 1, ctx.currentY + 1, gridW - 2, gridH - 2);
 }

 ctx.currentY += gridH + 6;
 }
 ctx.currentY += 4;
 }

 // ==========================================
 // 7. ATTACHED PATTERNS
 // ==========================================
 if (project.patterns && project.patterns.length > 0) {
 ctx.ensureSpace(20);
 // Header
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(11);
 doc.setTextColor('#242223');
 doc.text('ATTACHED PATTERNS', ctx.marginLeft, ctx.currentY + 4);
 doc.setDrawColor('#D4738B');
 doc.setLineWidth(0.4);
 doc.line(ctx.marginLeft, ctx.currentY + 6, ctx.marginLeft + 15, ctx.currentY + 6);
 ctx.currentY += 10;

 // List them first as summary list
 for (const pattern of project.patterns) {
 ctx.ensureSpace(8);
 doc.setFillColor('#F4F0F0');
 doc.roundedRect(ctx.marginLeft, ctx.currentY, ctx.usableWidth, 6.5, 1, 1, 'F');

 doc.setFont('helvetica', 'bold');
 doc.setFontSize(8);
 doc.setTextColor('#813B4C');
 const pType = (pattern.patternType || 'File').toUpperCase();
 doc.text(`[${pType}]`, ctx.marginLeft + 3, ctx.currentY + 4.2);

 doc.setFont('helvetica', 'normal');
 doc.setFontSize(8.5);
 doc.setTextColor('#242223');
 const name = pattern.fileName || 'Unnamed Pattern File';
 let suffix = '';
 if (pattern.patternType === 'pdf') {
 suffix = ' (Appended below)';
 }
 const displayName = name + suffix;
 const truncatedName = displayName.length > 70 ? displayName.substring(0, 67) + '...' : displayName;
 doc.text(truncatedName, ctx.marginLeft + 16, ctx.currentY + 4.2);

 ctx.currentY += 8;
 }
 ctx.currentY += 6;

 // Render contents for TEXT and IMAGE patterns inline
 for (const pattern of project.patterns) {
    if (pattern.patternType === 'text' && pattern.patternContent) {
      ctx.ensureSpace(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor('#242223');
      doc.text(`PATTERN TEXT: ${pattern.fileName || 'Notes'}`, ctx.marginLeft, ctx.currentY + 4);
      ctx.currentY += 6;

      const textLines = doc.splitTextToSize(pattern.patternContent, ctx.usableWidth - 6);
      const lineH = 4.2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor('#242223');

      for (let l = 0; l < textLines.length; l++) {
        ctx.ensureSpace(lineH + 1);
        doc.text(textLines[l], ctx.marginLeft + 4, ctx.currentY + 3.5);
        doc.setFillColor('#813B4C');
        doc.rect(ctx.marginLeft, ctx.currentY, 1.2, lineH, 'F');
        ctx.currentY += lineH;
      }
      ctx.currentY += 6;
    } else if (pattern.patternType === 'image' && pattern.patternContent) {
      const images = getImagePatternUrls(pattern.patternContent);
      for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
        const imgUrl = images[imgIdx];
        const dim = imageCache[imgUrl] || { width: 400, height: 300 };
        const maxW = 130;
        const maxH = 80;
        const scale = Math.min(maxW / dim.width, maxH / dim.height);
        const w = dim.width * scale;
        const h = dim.height * scale;

        ctx.ensureSpace(h + 16);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor('#242223');
        const titleLabel = images.length > 1
          ? `PATTERN IMAGE (${imgIdx + 1}/${images.length}): ${pattern.fileName || 'Image'}`
          : `PATTERN IMAGE: ${pattern.fileName || 'Image'}`;
        doc.text(titleLabel, ctx.marginLeft, ctx.currentY + 4);
        ctx.currentY += 6;

        const imgX = ctx.marginLeft + (ctx.usableWidth - w) / 2;
        doc.setFillColor('#FFFFFF');
        doc.roundedRect(imgX - 2, ctx.currentY, w + 4, h + 4, 1.5, 1.5, 'FD');
        addImageSafe(doc, imgUrl, imgX, ctx.currentY + 2, w, h);

        ctx.currentY += h + 10;
      }
    }
  }
 }

 // Save page count right here before progress journal starts!
 const pageCountA = doc.getNumberOfPages();

 // ==========================================
 // 8. PROGRESS JOURNAL TIMELINE
 // ==========================================
 if (logs && logs.length > 0) {
 // Force a new page for the timeline so that PDF pages can be inserted without splitting/sandwiching it.
 doc.addPage();
 ctx.currentY = ctx.marginTop;

 ctx.ensureSpace(20);
 // Header
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(11);
 doc.setTextColor('#242223');
 doc.text('PROGRESS JOURNAL TIMELINE', ctx.marginLeft, ctx.currentY + 4);
 doc.setDrawColor('#D4738B');
 doc.setLineWidth(0.4);
 doc.line(ctx.marginLeft, ctx.currentY + 6, ctx.marginLeft + 15, ctx.currentY + 6);
 ctx.currentY += 10;

 // Arrange chronological progression (oldest to newest)
 const chronoLogs = [...logs].sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());

 const lineX = ctx.marginLeft + 22;
 const contentX = lineX + 6;
 const contentW = ctx.usableWidth - 28;

 for (let i = 0; i < chronoLogs.length; i++) {
 const log = chronoLogs[i];

 // Format date
 const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString(undefined, {
 month: 'short',
 day: 'numeric',
 year: 'numeric'
 }) : '—';

 // Parse log entry text lines
 const rawLogText = log.textEntry || '';
 const isEmojiLog = containsEmoji(rawLogText);
 let renderedLog: { dataUrl: string; widthMm: number; heightMm: number } | null = null;
 let textH = 0;
 let logLines: string[] = [];

 if (isEmojiLog) {
   renderedLog = renderTextWithEmojiToDataUrl(rawLogText, {
     fontSizePt: 8.5,
     textColor: '#242223',
     maxWidthMm: contentW
   });
   textH = renderedLog.heightMm;
 } else {
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(8.5);
   logLines = doc.splitTextToSize(rawLogText, contentW);
   textH = logLines.length * 3.8;
 }

 // Calculate photo attachment dimensions
 let photoH = 0;
 let scaledW = 0;
 let scaledH = 0;
 let hasPhoto = false;

 if (log.imageBase64 && imageCache[log.imageBase64]) {
 hasPhoto = true;
 const dim = imageCache[log.imageBase64];
 // Fit into contentW x 50mm height
 const maxW = 90;
 const maxH = 50;
 const scale = Math.min(maxW / dim.width, maxH / dim.height);
 scaledW = dim.width * scale;
 scaledH = dim.height * scale;
 photoH = scaledH + 8; // image height + spacing
 }

 // Compute total item block height (Header + Text + Photo + Bottom padding)
 const itemBlockH = 5 + textH + photoH + 6;
 ctx.ensureSpace(itemBlockH);

 const itemStartY = ctx.currentY;

 // 1. Date (Left of timeline)
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(8.5);
 doc.setTextColor('#813B4C');
 doc.text(dateStr, ctx.marginLeft, itemStartY + 3.8);

 // 2. Timeline Line segment (Draw behind circles)
 doc.setDrawColor('#BABABA');
 doc.setLineWidth(0.45);
 // Draw line down to bottom of current block (or a bit past if not last)
 const lineEndY = itemStartY + itemBlockH;
 if (i < chronoLogs.length - 1) {
 doc.line(lineX, itemStartY + 3, lineX, lineEndY);
 } else {
 // Just a short line segment ending shortly after last dot
 doc.line(lineX, itemStartY + 3, lineX, itemStartY + 12);
 }

 // 3. Timeline Circle Node (highlighted)
 doc.setFillColor('#D4738B');
 doc.circle(lineX, itemStartY + 3.2, 1.4, 'F');

 // 4. Row Count Snapshot Badge (if exists)
 if (log.rowCountSnapshot !== undefined && log.rowCountSnapshot !== null) {
 const rowText = `ROW ${log.rowCountSnapshot}`;
 doc.setFont('helvetica', 'bold');
 doc.setFontSize(7);
 const txtW = doc.getTextWidth(rowText);
 const bW = txtW + 3;
 const bH = 4;
 const bX = ctx.marginLeft + ctx.usableWidth - bW;
 const bY = itemStartY + 0.8;

 doc.setFillColor('#813B4C');
 doc.roundedRect(bX, bY, bW, bH, 0.8, 0.8, 'F');
 doc.setTextColor('#FFFFFF');
 doc.text(rowText, bX + 1.5, bY + 2.9);
 }

 // 5. Journal text body
 if (isEmojiLog && renderedLog) {
   doc.addImage(renderedLog.dataUrl, 'PNG', contentX, itemStartY + 4.5, renderedLog.widthMm, renderedLog.heightMm);
 } else {
   doc.setFont('helvetica', 'normal');
   doc.setFontSize(8.5);
   doc.setTextColor('#242223');
   doc.text(logLines, contentX, itemStartY + 4.5);
 }

 // 6. Log photo attachment
 if (hasPhoto && log.imageBase64) {
 const photoY = itemStartY + 4.5 + textH + 3;
 // Frame
 doc.setDrawColor('#BABABA');
 doc.rect(contentX - 0.5, photoY - 0.5, scaledW + 1, scaledH + 1, 'S');
 addImageSafe(doc, log.imageBase64, contentX, photoY, scaledW, scaledH);
 }

 ctx.currentY += itemBlockH;
 }
 }

 // ==========================================
 // LOOP THROUGH ALL PAGES TO APPLY HEADERS/FOOTERS
 // ==========================================
 const totalPages = doc.getNumberOfPages();
 for (let i = 1; i <= totalPages; i++) {
 doc.setPage(i);
 const physicalPageNum = i <= pageCountA ? i : i + pdfPatternsPageCount;
 drawHeaderAndFooter(doc, physicalPageNum, totalPages + pdfPatternsPageCount, project.title, logoImg);
 }

 // Save/Merge the document
 const cleanProjectName = sanitizeFilename(project.title);
 const fileName = `${cleanProjectName}_MyYarnDiary.pdf`;

 if (pdfPatterns.length > 0) {
 try {
 const pdfBytes = doc.output('arraybuffer');
 const mainPdfDoc = await PDFDocument.load(pdfBytes);

 let insertIndex = pageCountA;
 for (const pattern of pdfPatterns) {
 try {
 const base64Data = pattern.patternContent.replace(/^data:application\/pdf;base64,/, '');
 const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
 const patternPdfDoc = await PDFDocument.load(bytes);
 const copiedPages = await mainPdfDoc.copyPages(patternPdfDoc, patternPdfDoc.getPageIndices());
 copiedPages.forEach((page) => {
 mainPdfDoc.insertPage(insertIndex, page);
 insertIndex++;
 });
 } catch (patternErr) {
 console.error(`Failed to append PDF pattern ${pattern.fileName || ''}:`, patternErr);
 }
 }

 const mergedPdfBytes = await mainPdfDoc.save();
 if (download) {
 const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
 const link = document.createElement('a');
 link.href = URL.createObjectURL(blob);
 link.download = fileName;
 link.click();
 URL.revokeObjectURL(link.href);
 }
 return mergedPdfBytes;
 } catch (mergeErr) {
 console.error('Failed to merge PDFs using pdf-lib, falling back to standard download:', mergeErr);
 const fallbackBytes = new Uint8Array(doc.output('arraybuffer'));
 if (download) {
 doc.save(fileName);
 }
 return fallbackBytes;
 }
 } else {
 const rawBytes = new Uint8Array(doc.output('arraybuffer'));
 if (download) {
 doc.save(fileName);
 }
 return rawBytes;
 }
}
