import AsyncStorage from '@react-native-async-storage/async-storage';

// §12.1: чеки, снятые без сети, ждут в локальной очереди и отправляются позже.
const QUEUE_KEY = 'offline_scan_queue_v1';

export type QueuedScan = {
  id: string;
  imageBase64: string;
  createdAt: string;
};

export async function getQueue(): Promise<QueuedScan[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedScan[]) : [];
  } catch {
    return [];
  }
}

export async function enqueueScan(imageBase64: string): Promise<void> {
  const queue = await getQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, imageBase64, createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter((item) => item.id !== id)));
}

export function isNetworkError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /network|fetch|failed to send|internet|подключ|timeout/i.test(message);
}
