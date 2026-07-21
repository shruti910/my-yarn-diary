/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
 userId: string;
 displayName: string;
 email: string;
 profilePicture: string;
 crochetTerminology?: 'US' | 'UK';
 createdAt: string;
}

export interface Category {
 categoryId: string;
 userId: string;
 name: string;
 createdAt: string;
}

export enum ProjectStatus {
 Planning = 'Planning',
 InProgress = 'In Progress',
 Completed = 'Completed',
 OnHold = 'On Hold'
}

export interface Yarn {
 yarnId?: number;
 brand?: string;
 lineName?: string;
 colorway?: string;
 dyeLot?: string;
 weight?: string;
 fiberContent?: string;
 quantityUsed?: number;
 unit: string;
}

export interface Hook {
 hookId?: number;
 sizeMm: number;
 sizeUs?: string;
 material?: string;
 brand?: string;
}

export interface Pattern {
 patternId: string;
 patternType: 'pdf' | 'image' | 'text';
 patternContent: string;
 fileName?: string;
 createdAt?: string;
}

export interface Project {
 projectId: string;
 userId: string;
 categoryId: string;
 title: string;
 yarns?: Yarn[];
 hooks?: Hook[];
 status: ProjectStatus;
 rowCount: number;
 createdAt: string;
 notes?: string;
 startDate?: string;
 endDate?: string;
 careInstructions?: string;
 totalTime?: string;
 isFavorite?: boolean;
 isArchive?: boolean;
 updatedAt?: string;
 patterns?: Pattern[];
 photos?: PhotoResponse[];
 base64CoverPhoto?: string;
 isNewProject?: boolean;
}

export interface PhotoResponse {
 id: number;
 photoBase64: string;
 isCover: boolean;
 createdAt?: string;
}

export interface JournalLog {
 logId: string;
 projectId: string;
 userId: string;
 textEntry: string;
 imageBase64?: string;
 createdAt: string;
 rowCountSnapshot?: number;
}

export interface ChatMessage {
 id: string;
 role: 'user' | 'model';
 text?: string | null;
 imageData?: string;
 createdAt: string;
 errorMessage?: string;
}

export type ChatCategory = 'crochet-buddy' | 'pattern-decoder' | 'reverse-engineer' | 'image-generator' | 'crochet-tutor';

export interface ChatSession {
 chatId: string;
 userId: string;
 title: string;
 category?: ChatCategory;
 messages: ChatMessage[];
 createdAt: string;
 pinned?: boolean;
}
