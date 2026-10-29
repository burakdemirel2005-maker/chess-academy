import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SyncRecordPayload {
  id: string;
  table:
    | 'lesson_progress'
    | 'opening_progress'
    | 'puzzle_attempts'
    | 'games'
    | 'user_settings';
  data: Record<string, unknown>;
  updatedAt: string;
}

const SYNC_QUEUE_KEY = 'chess_academy_sync_queue_v1';

/**
 * Deterministic conflict resolution rule:
 * 1. Progress records (`completed`) are monotonic (once completed, remains completed).
 * 2. Numeric counters (`attempts`, `correctCount`, `masteryScore`) take the maximum verified value.
 * 3. For mutable settings or game metadata, the newer ISO `updatedAt` timestamp wins (Last-Write-Wins).
 */
export function resolveSyncConflict<
  T extends {
    updatedAt: string;
    completed?: boolean;
    masteryScore?: number;
    attempts?: number;
  }
>(localRecord: T, remoteRecord: T): T {
  const localTime = Date.parse(localRecord.updatedAt || '1970-01-01T00:00:00Z');
  const remoteTime = Date.parse(remoteRecord.updatedAt || '1970-01-01T00:00:00Z');

  const newer = localTime >= remoteTime ? { ...localRecord } : { ...remoteRecord };

  if (typeof localRecord.completed === 'boolean' || typeof remoteRecord.completed === 'boolean') {
    newer.completed = Boolean(localRecord.completed || remoteRecord.completed);
  }

  if (typeof localRecord.masteryScore === 'number' || typeof remoteRecord.masteryScore === 'number') {
    newer.masteryScore = Math.max(localRecord.masteryScore ?? 0, remoteRecord.masteryScore ?? 0);
  }

  if (typeof localRecord.attempts === 'number' || typeof remoteRecord.attempts === 'number') {
    newer.attempts = Math.max(localRecord.attempts ?? 0, remoteRecord.attempts ?? 0);
  }

  return newer;
}

export function loadPendingSyncQueue(): SyncRecordPayload[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueSyncRecord(item: SyncRecordPayload): SyncRecordPayload[] {
  const queue = loadPendingSyncQueue();
  // Deduplicate by table + id so we never create duplicate queued operations
  const filtered = queue.filter((q) => !(q.table === item.table && q.id === item.id));
  filtered.push(item);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch {
      // ignore quota errors
    }
  }
  return filtered;
}

export function clearSyncQueueIds(ids: string[]): void {
  if (typeof localStorage === 'undefined') return;
  const idSet = new Set(ids);
  const remaining = loadPendingSyncQueue().filter((q) => !idSet.has(q.id));
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }
}

export async function flushPendingSyncQueue(userId: string): Promise<{
  flushedCount: number;
  remainingCount: number;
  error?: string;
}> {
  const queue = loadPendingSyncQueue();
  if (queue.length === 0) {
    return { flushedCount: 0, remainingCount: 0 };
  }

  if (!isSupabaseConfigured || !supabase || !userId) {
    return {
      flushedCount: 0,
      remainingCount: queue.length,
      error: 'Çevrimdışı veya misafir oturumu aktif; değişiklikler yerel kuyrukta saklanıyor.',
    };
  }

  const flushedIds: string[] = [];

  for (const item of queue) {
    try {
      const payload = {
        ...item.data,
        id: item.id,
        user_id: userId,
        updated_at: item.updatedAt,
      };
      const { error } = await supabase.from(item.table).upsert(payload, { onConflict: 'id' });
      if (!error) {
        flushedIds.push(item.id);
      }
    } catch {
      // keep in queue for next online retry
    }
  }

  if (flushedIds.length > 0) {
    clearSyncQueueIds(flushedIds);
  }

  const remaining = loadPendingSyncQueue();
  return {
    flushedCount: flushedIds.length,
    remainingCount: remaining.length,
  };
}
