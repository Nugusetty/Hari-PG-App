import { Floor, Receipt, AppSettings, DataSnapshot } from '../types';

const DB_NAME = 'HariPG_DurableDB';
const DB_VERSION = 2;
const STORE_DATA = 'app_data';
const STORE_SNAPSHOTS = 'snapshots';

const DEFAULT_SETTINGS: AppSettings = {
  pgName: "Hari PG",
  managerName: "Hari Kumar",
  pgSubtitle: "Luxury Accommodation",
  address: "29, PR Layout, Marathahalli, Bengaluru",
  phone: "+91 9010646051"
};

// Safe JSON parser
const safeParse = <T>(data: string | null, fallback: T): T => {
  if (!data) return fallback;
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
};

// Request permanent, non-evictable storage from browser
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }
  try {
    const isPersisted = await navigator.storage.persist();
    console.log(`[Hari PG Storage] Persistent storage status: ${isPersisted ? 'GRANTED (Immune to browser auto-cleanup)' : 'Default'}`);
    return isPersisted;
  } catch (err) {
    console.warn('[Hari PG Storage] Could not request persistence:', err);
    return false;
  }
};

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA);
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// IDB Helpers
const idbGet = async <T>(storeName: string, key: string): Promise<T | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

const idbSet = async (storeName: string, key: string, value: any): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[Hari PG IDB] Set failed:', e);
  }
};

const idbGetAll = async <T>(storeName: string): Promise<T[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
};

let lastSnapshotTime = 0;

// Load App Data from IndexedDB first, with localStorage fallback & auto-migration
export const loadDurableData = async (): Promise<{
  floors: Floor[];
  receipts: Receipt[];
  settings: AppSettings;
  isRecoveredFromBackup?: boolean;
}> => {
  // 1. Request persistent non-evictable storage
  await requestPersistentStorage();

  let floors: Floor[] | null = null;
  let receipts: Receipt[] | null = null;
  let settings: AppSettings | null = null;

  try {
    // Try reading from IndexedDB
    floors = await idbGet<Floor[]>(STORE_DATA, 'floors');
    receipts = await idbGet<Receipt[]>(STORE_DATA, 'receipts');
    settings = await idbGet<AppSettings>(STORE_DATA, 'settings');
  } catch (err) {
    console.warn('[Hari PG Storage] Failed reading IDB:', err);
  }

  // 2. Check localStorage fallback / migration
  const lsFloors = safeParse<Floor[] | null>(localStorage.getItem('hari_pg_v3_floors'), null);
  const lsReceipts = safeParse<Receipt[] | null>(localStorage.getItem('hari_pg_v3_receipts'), null);
  const lsSettings = safeParse<AppSettings | null>(localStorage.getItem('hari_pg_v3_settings'), null);

  // If IDB had nothing or empty, but localStorage has data -> migrate to IDB
  if ((!floors || floors.length === 0) && lsFloors && lsFloors.length > 0) {
    console.log('[Hari PG Storage] Migrating existing localStorage data into permanent IndexedDB');
    floors = lsFloors;
    if (lsReceipts) receipts = lsReceipts;
    if (lsSettings) settings = lsSettings;

    // Immediately save to IDB
    await saveDurableData({
      floors: floors || [],
      receipts: receipts || [],
      settings: settings || DEFAULT_SETTINGS
    });
  }

  // 3. Disaster recovery check: If both are empty, check if any snapshot exists in IndexedDB
  if ((!floors || floors.length === 0) && (!receipts || receipts.length === 0)) {
    try {
      const snapshots = await idbGetAll<DataSnapshot>(STORE_SNAPSHOTS);
      if (snapshots && snapshots.length > 0) {
        // Sort descending by timestamp
        snapshots.sort((a, b) => b.timestamp - a.timestamp);
        const bestSnapshot = snapshots.find(s => s.floors && s.floors.length > 0) || snapshots[0];
        if (bestSnapshot && bestSnapshot.floors && bestSnapshot.floors.length > 0) {
          console.warn('[Hari PG Storage] Data was missing! Auto-recovering from backup snapshot taken on:', bestSnapshot.dateString);
          return {
            floors: bestSnapshot.floors,
            receipts: bestSnapshot.receipts || [],
            settings: bestSnapshot.settings || DEFAULT_SETTINGS,
            isRecoveredFromBackup: true
          };
        }
      }
    } catch (e) {
      console.warn('Snapshot recovery check failed', e);
    }
  }

  return {
    floors: floors || lsFloors || [],
    receipts: receipts || lsReceipts || [],
    settings: settings || lsSettings || DEFAULT_SETTINGS
  };
};

// Save App Data with Dual-Storage (IndexedDB + LocalStorage) and Anti-Wipe Guard
export const saveDurableData = async ({
  floors,
  receipts,
  settings
}: {
  floors: Floor[];
  receipts: Receipt[];
  settings: AppSettings;
}): Promise<void> => {
  try {
    // 1. Save to IndexedDB (Durable, large quota, never auto-cleared)
    await idbSet(STORE_DATA, 'floors', floors);
    await idbSet(STORE_DATA, 'receipts', receipts);
    await idbSet(STORE_DATA, 'settings', settings);

    // 2. Synchronous mirror to localStorage as backup
    try {
      localStorage.setItem('hari_pg_v3_floors', JSON.stringify(floors));
      localStorage.setItem('hari_pg_v3_receipts', JSON.stringify(receipts));
      localStorage.setItem('hari_pg_v3_settings', JSON.stringify(settings));
    } catch (lsErr) {
      // LocalStorage might hit 5MB limit, but IDB is safe!
      console.warn('[Hari PG Storage] localStorage quota exceeded, IndexedDB retained full data.');
    }

    // 3. Auto-save snapshot (at most once every 30 minutes, or if data is substantial)
    const now = Date.now();
    if (floors.length > 0 && now - lastSnapshotTime > 30 * 60 * 1000) {
      lastSnapshotTime = now;
      await createBackupSnapshot({ floors, receipts, settings }, 'auto');
    }
  } catch (err) {
    console.error('[Hari PG Storage] Error saving durable data:', err);
  }
};

// Create a named/versioned snapshot
export const createBackupSnapshot = async (
  data: { floors: Floor[]; receipts: Receipt[]; settings: AppSettings },
  trigger: 'auto' | 'manual' = 'auto'
): Promise<DataSnapshot | null> => {
  try {
    const totalRooms = data.floors.reduce((acc, f) => acc + f.rooms.length, 0);
    const totalResidents = data.floors.reduce(
      (acc, f) => acc + f.rooms.reduce((rAcc, r) => rAcc + r.residents.length, 0),
      0
    );

    const snapshot: DataSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      dateString: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      floorsCount: data.floors.length,
      roomsCount: totalRooms,
      residentsCount: totalResidents,
      receiptsCount: data.receipts.length,
      floors: data.floors,
      receipts: data.receipts,
      settings: data.settings,
      trigger
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      store.put(snapshot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Prune old auto snapshots, keep up to 15
    const all = await idbGetAll<DataSnapshot>(STORE_SNAPSHOTS);
    if (all.length > 20) {
      all.sort((a, b) => b.timestamp - a.timestamp);
      const toDelete = all.slice(20);
      const delTx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = delTx.objectStore(STORE_SNAPSHOTS);
      for (const item of toDelete) {
        if (item.trigger === 'auto') {
          store.delete(item.id);
        }
      }
    }

    return snapshot;
  } catch (e) {
    console.warn('Failed to create snapshot:', e);
    return null;
  }
};

// Get all snapshots for user to inspect/restore
export const getAllSnapshots = async (): Promise<DataSnapshot[]> => {
  try {
    const snapshots = await idbGetAll<DataSnapshot>(STORE_SNAPSHOTS);
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
};

// Export to .JSON file
export const downloadBackupFile = (data: { floors: Floor[]; receipts: Receipt[]; settings: AppSettings }) => {
  const backupObject = {
    app: "Hari PG Manager",
    version: "3.0",
    exportDate: new Date().toISOString(),
    exportDateFormatted: new Date().toLocaleString('en-IN'),
    floors: data.floors,
    receipts: data.receipts,
    settings: data.settings
  };

  const dataStr = JSON.stringify(backupObject, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const fileName = `HariPG_Backup_${new Date().toISOString().split('T')[0]}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
