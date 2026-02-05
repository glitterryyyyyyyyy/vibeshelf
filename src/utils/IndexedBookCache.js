/**
 * IndexedDB-backed cache for large book datasets.
 * Falls back gracefully if IndexedDB is unavailable.
 */

class IndexedBookCache {
  static DB_NAME = 'vibeshelf-books-db';
  static DB_VERSION = 1;
  static BOOKS_STORE = 'books';
  static META_STORE = 'meta';
  static MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  static isSupported() {
    try { return typeof indexedDB !== 'undefined'; } catch { return false; }
  }

  constructor() {
    if (!IndexedBookCache.isSupported()) {
      throw new Error('IndexedDB not supported');
    }
    this.dbPromise = this.#openDB();
  }

  async #openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IndexedBookCache.DB_NAME, IndexedBookCache.DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IndexedBookCache.BOOKS_STORE)) {
          db.createObjectStore(IndexedBookCache.BOOKS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(IndexedBookCache.META_STORE)) {
          db.createObjectStore(IndexedBookCache.META_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async #withStore(storeName, mode, fn) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = fn(store, tx);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  async getCacheMetadata() {
    return this.#withStore(IndexedBookCache.META_STORE, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get('metadata');
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async setCacheMetadata(totalBooks, timestamp, approxSizeBytes, version = '1.0') {
    const metadata = { totalBooks, timestamp, version, approxSizeBytes };
    await this.#withStore(IndexedBookCache.META_STORE, 'readwrite', (store) => {
      store.put({ key: 'metadata', value: metadata });
    });
  }

  async isCacheValid() {
    const meta = await this.getCacheMetadata();
    if (!meta) return false;
    if (Date.now() - meta.timestamp > IndexedBookCache.MAX_AGE) return false;
    // You could also verify count, but we trust metadata here
    return true;
  }

  async getAllBooks() {
    const meta = await this.getCacheMetadata();
    if (!meta) return null;
    if (!(await this.isCacheValid())) return null;

    return this.#withStore(IndexedBookCache.BOOKS_STORE, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const books = [];
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            books.push(cursor.value);
            cursor.continue();
          } else {
            resolve(books);
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  async cacheBooks(books) {
    // Clear existing and bulk insert in batches to keep transactions small
    await this.clearCache();
    const BATCH = 2000;
    let approxSizeBytes = 0;

    for (let i = 0; i < books.length; i += BATCH) {
      const batch = books.slice(i, i + BATCH);
      await this.#withStore(IndexedBookCache.BOOKS_STORE, 'readwrite', (store) => {
        batch.forEach((book) => store.put(book));
      });
      // Estimate size roughly
      try { approxSizeBytes += new Blob([JSON.stringify(batch)]).size; } catch {}
    }

    await this.setCacheMetadata(books.length, Date.now(), approxSizeBytes);
  }

  async clearCache() {
    const db = await this.dbPromise;
    await new Promise((resolve, reject) => {
      const tx = db.transaction([IndexedBookCache.BOOKS_STORE, IndexedBookCache.META_STORE], 'readwrite');
      tx.objectStore(IndexedBookCache.BOOKS_STORE).clear();
      tx.objectStore(IndexedBookCache.META_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCacheSize() {
    const meta = await this.getCacheMetadata();
    if (!meta || !meta.approxSizeBytes) return '0.00';
    return (meta.approxSizeBytes / (1024 * 1024)).toFixed(2);
  }
}

export default IndexedBookCache;
