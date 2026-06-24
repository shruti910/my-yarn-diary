/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
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

export interface Project {
  projectId: string;
  userId: string;
  categoryId: string;
  title: string;
  yarnBrand: string;
  yarnColorway: string;
  yarnBatch: string;
  hookSize: string;
  status: ProjectStatus;
  rowCount: number;
  createdAt: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  productPhotos?: string[];
  isFavorite?: boolean;
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
  text: string;
  imageData?: string;
  createdAt: string;
}

export interface ChatSession {
  chatId: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}
