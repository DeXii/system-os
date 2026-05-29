const CHANNEL_NAME = 'ayanakoji_os_v1';
const PUSH_LEASE_KEY = 'ayanakoji_cloud_push_lease';
const PUSH_LEASE_TTL_MS = 8000;
const CLOUD_PUSH_COOLDOWN_MS = 3000;

type TabMessage =
  | { type: 'os_refresh' }
  | { type: 'cloud_push' };

type RefreshListener = () => void;

let channel: BroadcastChannel | null = null;
let tabId = '';
const refreshListeners = new Set<RefreshListener>();
let lastCloudPushSeenAt = 0;

function getTabId(): string {
  if (tabId) return tabId;
  tabId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return tabId;
}

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (ev: MessageEvent<TabMessage>) => {
      const msg = ev.data;
      if (!msg?.type) return;
      if (msg.type === 'os_refresh') {
        refreshListeners.forEach((fn) => fn());
      }
      if (msg.type === 'cloud_push') {
        lastCloudPushSeenAt = Date.now();
      }
    };
  }
  return channel;
}

export function subscribeTabRefresh(listener: RefreshListener): () => void {
  getChannel();
  refreshListeners.add(listener);
  return () => refreshListeners.delete(listener);
}

export function broadcastOsRefresh(): void {
  getChannel()?.postMessage({ type: 'os_refresh' } satisfies TabMessage);
}

export function broadcastCloudPush(): void {
  getChannel()?.postMessage({ type: 'cloud_push' } satisfies TabMessage);
}

function readLease(): { tabId: string; expiresAt: number } | null {
  try {
    const raw = sessionStorage.getItem(PUSH_LEASE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tabId: string; expiresAt: number };
    if (!parsed.tabId || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLease(): void {
  try {
    sessionStorage.setItem(
      PUSH_LEASE_KEY,
      JSON.stringify({ tabId: getTabId(), expiresAt: Date.now() + PUSH_LEASE_TTL_MS })
    );
  } catch {
    /* ignore */
  }
}

/** One tab should push per debounce burst (multi-tab). */
export function acquireCloudPushLease(): boolean {
  if (Date.now() - lastCloudPushSeenAt < CLOUD_PUSH_COOLDOWN_MS) {
    return false;
  }

  const lease = readLease();
  const now = Date.now();
  const id = getTabId();

  if (lease && lease.expiresAt > now && lease.tabId !== id) {
    return false;
  }

  writeLease();
  return true;
}

export function releaseCloudPushLease(): void {
  const lease = readLease();
  if (lease?.tabId === getTabId()) {
    try {
      sessionStorage.removeItem(PUSH_LEASE_KEY);
    } catch {
      /* ignore */
    }
  }
}
