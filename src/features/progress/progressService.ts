import { apiClient } from '../../api/client';
import type {
  ProgressEntriesResponse,
  ProgressEntry,
  ProgressEntryInput,
  ProgressEntryResponse
} from '../../api/types';

export async function listProgressEntries(options: {
  from?: string;
  limit?: number;
  to?: string;
} = {}): Promise<ProgressEntry[]> {
  const params = new URLSearchParams();
  if (options.from) params.set('from', options.from);
  if (options.to) params.set('to', options.to);
  if (options.limit !== undefined) params.set('limit', String(options.limit));

  const query = params.toString();
  const response = await apiClient.get<ProgressEntriesResponse>(
    query ? `/progress?${query}` : '/progress'
  );

  return response.entries;
}

export async function getProgressEntry(entryDate: string): Promise<ProgressEntry | null> {
  const response = await apiClient.get<ProgressEntryResponse>(
    `/progress/${encodeURIComponent(entryDate)}`
  );

  return response.entry;
}

export async function saveProgressEntry(input: ProgressEntryInput): Promise<ProgressEntry> {
  const response = await apiClient.put<ProgressEntryResponse>(
    `/progress/${encodeURIComponent(input.entryDate)}`,
    input
  );

  if (!response.entry) {
    throw new Error('Progress entry was not returned.');
  }

  return response.entry;
}
