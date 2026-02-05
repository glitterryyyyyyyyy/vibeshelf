import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBooks, fetchBooksCount, searchBooks } from '../api';

const PAGE_SIZE = 24;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

class SimpleCache {
  constructor() {
    this.map = new Map();
  }
  get(key) {
    const item = this.map.get(key);
    if (!item) return null;
    if (Date.now() - item.ts > CACHE_DURATION) {
      this.map.delete(key);
      return null;
    }
    return item.value;
  }
  set(key, value) {
    this.map.set(key, { value, ts: Date.now() });
  }
  clear() {
    this.map.clear();
  }
}

const cache = new SimpleCache();

export const useEfficientBooks = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const paginationInfo = useMemo(() => ({
    currentPage,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    hasNextPage: currentPage * PAGE_SIZE < totalCount,
    hasPrevPage: currentPage > 1,
    startIndex: (currentPage - 1) * PAGE_SIZE + 1,
    endIndex: Math.min(currentPage * PAGE_SIZE, totalCount),
  }), [currentPage, totalCount]);

  const getTotalCount = useCallback(async (term = '') => {
    const key = `count:${term}`;
    const cached = cache.get(key);
    if (cached != null) return cached;
    try {
      const res = await fetchBooksCount({ q: term });
      cache.set(key, res || 0);
      return res || 0;
    } catch (e) {
      console.error('fetchBooksCount failed', e);
      return 0;
    }
  }, []);

  const loadPage = useCallback(async (page = 1, term = '', force = false) => {
    const key = `page:${page}:q:${term}`;
    if (!force) {
      const cached = cache.get(key);
      if (cached) return cached;
    }
    try {
  const res = term && String(term).trim().length > 0 ? await searchBooks({ page, limit: PAGE_SIZE, q: term }) : await fetchBooks({ page, limit: PAGE_SIZE });
      // Backend may return { items, total } or an array
      const data = Array.isArray(res) ? res : (res.items || res.data || res.books || res);
      cache.set(key, data);
      return data;
    } catch (e) {
      console.error('loadPage failed', e);
      throw e;
    }
  }, []);

  const loadBooks = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const count = await getTotalCount(searchTerm);
      setTotalCount(count);
      const pageBooks = await loadPage(currentPage, searchTerm, force);
      setBooks(pageBooks || []);
    } catch (e) {
      setError(e.message || String(e));
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, getTotalCount, loadPage]);

  useEffect(() => { loadBooks(false); }, [loadBooks]);

  const goToPage = useCallback((p) => { if (p >= 1 && p <= Math.max(1, Math.ceil(totalCount / PAGE_SIZE))) setCurrentPage(p); }, [totalCount]);

  const search = useCallback((term) => { setSearchTerm(term); setCurrentPage(1); cache.clear(); }, []);

  const refresh = useCallback(() => { cache.clear(); loadBooks(true); }, [loadBooks]);

  const getVirtualData = useCallback(() => ({ items: books, totalCount, pageSize: PAGE_SIZE, currentPage, loadPage: (p) => goToPage(p) }), [books, totalCount, currentPage, goToPage]);

  return { books, totalCount, searchTerm, ...paginationInfo, loading, error, search, goToPage, refresh, getVirtualData, pageSize: PAGE_SIZE };
};

export const useSimpleBooks = (pageSize = 12) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadBooks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchBooks({ page: 1, limit: pageSize });
      const data = Array.isArray(page) ? page : (page.items || page.data || page.books || page);
      setBooks(data || []);
    } catch (e) {
      setError(e.message || String(e));
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);
  useEffect(() => { loadBooks(); }, [loadBooks]);
  return { books, loading, error, refresh: loadBooks };
};