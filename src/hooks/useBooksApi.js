import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchBooks, searchBooks } from '../api';
// Local sample fallback used when backend returns 5xx during development
import sampleBooks from '../data/books.jsx';

// Simple page cache with TTL
function createPageCache(ttl = 2 * 60 * 1000) { // 2 minutes
  const map = new Map();
  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return null;
      if (Date.now() - entry.ts > ttl) {
        map.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value) {
      map.set(key, { value, ts: Date.now() });
      // simple LRU: cap size
      if (map.size > 50) {
        const firstKey = map.keys().next().value;
        map.delete(firstKey);
      }
    },
    clear() {
      map.clear();
    }
  };
}

export default function useBooksApi({ initialPage = 1, pageSize = 24, prefetchPages = 1, maxConcurrent = 3 } = {}) {
  const maxFallbackPages = 3; // when server doesn't honor filters, fetch up to this many extra pages to find matches (reduced to avoid backend rate limits)
  const [page, setPage] = useState(initialPage);
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const cacheRef = useRef(createPageCache());
  const lastQueryRef = useRef({ q: null, filters: null });
  // Track in-flight requests to avoid duplicate fetches and simple concurrency control
  const inFlightRef = useRef(new Map());
  const inflightCountRef = useRef(0);
  const [lastFetch, setLastFetch] = useState({ page: null, items: 0, hash: null, ts: null });
  const [isFiltering, setIsFiltering] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const rateLimitRef = useRef(0);

  // Helper: normalize server response into array + total
  const normalize = (data) => {
    let items;
    if (data == null) items = [];
    else if (Array.isArray(data)) items = data;
    else if (Array.isArray(data.items)) items = data.items;
    else if (Array.isArray(data.books)) items = data.books;
    else items = [];

    // Determine total: prefer explicit `total` from API. If API provides `totalReturned`
    // it's ambiguous (some backends return the total number of items overall, others
    // return the number of items in this page). If the response includes `hasMore`
    // and it's true, treat total as unknown (null) so the UI continues to allow
    // loading more pages. If `hasMore` is false (last page), it's safe to treat
    // `totalReturned` as the total.
    let tot = null;
    if (typeof data?.total === 'number') {
      tot = data.total;
    } else if (typeof data?.totalReturned === 'number') {
      if (data?.hasMore === true) {
        // ambiguous: this is likely the number returned on this page, not the grand total
        tot = null;
      } else {
        // no more pages according to server, use this as total
        tot = data.totalReturned;
      }
    } else if (Array.isArray(items)) {
      tot = items.length;
    } else {
      tot = null;
    }

    const mappedItems = items.map((it) => ({
      ...it,
      id: it.id ?? it.bookId ?? it.book_id ?? it._id,
      title: it.title ?? it.bookTitle ?? it['Book-Title'] ?? it.book_title ?? it.name,
      author: it.author ?? it['Book-Author'] ?? it.creator ?? it.by ?? 'Unknown Author',
      // preserve genre raw field for downstream filtering
      genre: it.genre ?? it.categories ?? it.subject ?? null,
      image_url: it.image_url ?? it['Image-URL-L'] ?? it['Image-URL-M'] ?? it['Image-URL-S'] ?? it.imageUrl ?? it.image ?? it.thumbnail ?? null,
      description: it.description ?? it['Book-Description'] ?? it.desc ?? it.summary ?? ''
    }));

    return { items: mappedItems, total: tot };
  };

  // small helper to parse genre-like fields into an array of genre strings
  const parseGenres = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(x => String(x).trim()).filter(Boolean);
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          const json = s.replace(/'/g, '"');
          const parsed = JSON.parse(json);
          if (Array.isArray(parsed)) return parsed.map(x => String(x).trim()).filter(Boolean);
        } catch (e) { /* fall through */ }
      }
      return s.split(',').map(x => x.trim()).filter(Boolean);
    }
    return [];
  };

  // Lower-level fetch that deduplicates in-flight requests by cacheKey
  const fetchPage = useCallback(async ({ page: p = initialPage, q = null, filters = null } = {}) => {
    const cacheKey = JSON.stringify({ page: p, pageSize, q, filters });

    // If cached, return immediately
    const cached = cacheRef.current.get(cacheKey);
    if (cached) return cached;

    // Deduplicate duplicate inflight requests
    const inflight = inFlightRef.current.get(cacheKey);
    if (inflight) return inflight;

    // Simple concurrency guard for prefetches: allow immediate user-triggered fetches but for prefetch we check inflight count externally
      const promise = (async () => {
        try {
          // If we recently received a 429 from the server, avoid hammering it.
          if (Date.now() < rateLimitRef.current) {
            const e = new Error('Rate limited by server, backing off');
            e.code = 'RATE_LIMITED';
            throw e;
          }
          inflightCountRef.current += 1;
          let data;
          try {
            if (q && String(q).trim().length > 0) {
              // use dedicated search endpoint when a query is provided
              data = await searchBooks({ page: p, limit: pageSize, q });
            } else {
              data = await fetchBooks({ page: p, limit: pageSize, filters });
            }
          } catch (err) {
            // If backend signals too many requests, set a short backoff to avoid repeated 429s
            const status = err?.response?.status;
            if (status === 429) {
              const backoffMs = 2000; // 2s backoff
              rateLimitRef.current = Date.now() + backoffMs;
              setIsRateLimited(true);
              // clear the flag after backoff
              setTimeout(() => setIsRateLimited(false), backoffMs + 200);
            }
            throw err;
          }
        // Debug: log which page we requested and how many items returned (helps trace duplicate/same-page issues)
        try { console.debug(`[useBooksApi] fetchBooks page=${p} limit=${pageSize}`); } catch (e) {}
        const normalized = normalize(data);
        try { console.debug(`[useBooksApi] fetchBooks returned page=${p} items=${(normalized.items||[]).length}`); } catch (e) {}
        // create a lightweight hash of returned ids so the UI can detect identical pages
        const ids = (normalized.items || []).map(it => it.id).join(',');
        const hash = ids ? `${ids.slice(0, 200)}::${(normalized.items || []).length}` : null;
        setLastFetch({ page: p, items: (normalized.items || []).length, hash, ts: Date.now() });
        cacheRef.current.set(cacheKey, normalized);
        return normalized;
      } finally {
        inflightCountRef.current = Math.max(0, inflightCountRef.current - 1);
        inFlightRef.current.delete(cacheKey);
      }
    })();

    inFlightRef.current.set(cacheKey, promise);
    return promise;
  }, [pageSize, initialPage]);

  const schedulePrefetch = useCallback((p, q = null, filters = null) => {
    if (p < 1) return;
    // Avoid flooding backend: only prefetch if we are under maxConcurrent
    if (inflightCountRef.current >= maxConcurrent) return;
    const cacheKey = JSON.stringify({ page: p, pageSize, q, filters });
    if (cacheRef.current.get(cacheKey)) return; // already cached
    if (inFlightRef.current.get(cacheKey)) return; // already in flight

    // fire-and-forget prefetch
    fetchPage({ page: p, q, filters }).catch(() => { /* ignore prefetch errors */ });
  }, [fetchPage, pageSize, maxConcurrent]);

  const loadPage = useCallback(async ({ page: p = page, q = null, filters = null } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchPage({ page: p, q, filters });

      // If genre filters were provided, try server-first then bounded client fallback
      const desiredGenresRaw = filters?.genres ?? filters?.genre ?? null;
      const desiredGenres = Array.isArray(desiredGenresRaw)
        ? desiredGenresRaw.map(s => String(s).toLowerCase())
        : (typeof desiredGenresRaw === 'string' ? String(desiredGenresRaw).split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : []);

      // Per-hook invariant: after any successful API call, reflect the
      // server response in the hook state so callers can always rely on
      // `books` and `total` being populated from the response shape.
      // This prevents situations where `total > 0` but `books` was cleared
      // by client-side fallback logic.
      setBooks(result.items);
      setTotal(result.total);
      lastQueryRef.current = { q, filters };

      // If the caller requested genre-based filtering, attempt a bounded
      // client-side pass to collect only matching items, but do NOT clear
      // the hook's `books` array if no matching items are found. Keep the
      // server-provided items in that case so `total > 0` implies
      // `books.length > 0`.
      if (desiredGenres && desiredGenres.length > 0) {
        setIsFiltering(true);
        const matchesFrom = (items) => (items || []).filter(it => {
          const gens = parseGenres(it.genre || it.categories || it.subject).map(x => x.toLowerCase());
          return gens.some(g => desiredGenres.includes(g));
        });

        let matched = matchesFrom(result.items || []);

        // If we don't have enough matches yet, fetch a few more pages and collect matches
        let nextPage = p + 1;
        let attempts = 0;
        const seenIds = new Set((matched || []).map(x => x.id));

        while (matched.length < pageSize && attempts < maxFallbackPages) {
          try {
            const extra = await fetchPage({ page: nextPage, q, filters });
            const extraMatches = matchesFrom(extra.items || []);
            for (const em of extraMatches) {
              if (!seenIds.has(em.id)) { seenIds.add(em.id); matched.push(em); }
            }
            if (!extra.items || extra.items.length === 0) break;
            nextPage += 1;
            attempts += 1;
          } catch (e) { break; }
        }

        // Only override the hook's books with the matched subset when we
        // actually found matches. Do NOT clear `books` if matched is empty.
        if (matched.length > 0) {
          setBooks(matched.slice(0, pageSize));
          // keep total from the server response (do NOT set total to matched.length)
        }

        setLoading(false);
        setIsFiltering(false);

        // Prefetch next N pages (configurable)
        for (let i = 1; i <= Math.max(0, prefetchPages); i += 1) {
          const next = p + i;
          // don't block UI; schedulePrefetch will skip if too many inflight
          schedulePrefetch(next, q, filters);
        }

        return { items: (matched.length > 0 ? matched.slice(0, pageSize) : result.items), total: result.total };
      }

      // default behavior (no genre filters) — we've already set books/total above
      setLoading(false);

      // Prefetch next N pages (configurable)
      for (let i = 1; i <= Math.max(0, prefetchPages); i += 1) {
        const next = p + i;
        // don't block UI; schedulePrefetch will skip if too many inflight
        schedulePrefetch(next, q, filters);
      }

      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [fetchPage, page, prefetchPages, schedulePrefetch]);

  // Append page: fetch page p and append items to existing list (useful for "load more" / infinite append)
  const appendPage = useCallback(async ({ page: p = page + 1, q = null, filters = null } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPage({ page: p, q, filters });

      // If genre filters were provided, attempt server-side filter first then
      // a bounded client-side fallback to collect matching items.
      const desiredGenresRaw = filters?.genres ?? filters?.genre ?? null;
      const desiredGenres = Array.isArray(desiredGenresRaw)
        ? desiredGenresRaw.map(s => String(s).toLowerCase())
        : (typeof desiredGenresRaw === 'string' ? String(desiredGenresRaw).split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : []);

      // Reflect server response first so callers can rely on books/total
      setBooks(result.items);
      setTotal(result.total);
      lastQueryRef.current = { q, filters };

      // If genre filters were provided, try a bounded client-side fallback
      // to collect matching items, but do NOT clear books if no matches are found.
      if (desiredGenres && desiredGenres.length > 0) {
        setIsFiltering(true);
        const matchesFrom = (items) => (items || []).filter(it => {
          const gens = parseGenres(it.genre || it.categories || it.subject).map(x => x.toLowerCase());
          return gens.some(g => desiredGenres.includes(g));
        });

        let matched = matchesFrom(result.items || []);

        // If we don't have enough matches yet, fetch a few more pages and collect matches
        let nextPage = p + 1;
        let attempts = 0;
        const seenIds = new Set((matched || []).map(x => x.id));

        while (matched.length < pageSize && attempts < maxFallbackPages) {
          try {
            const extra = await fetchPage({ page: nextPage, q, filters });
            const extraMatches = matchesFrom(extra.items || []);
            for (const em of extraMatches) {
              if (!seenIds.has(em.id)) { seenIds.add(em.id); matched.push(em); }
            }
            if (!extra.items || extra.items.length === 0) break;
            nextPage += 1;
            attempts += 1;
          } catch (e) { break; }
        }

        if (matched.length > 0) {
          setBooks(matched.slice(0, pageSize));
          // keep total from the server response
        }
        setLoading(false);
        setIsFiltering(false);

        // schedule prefetch as before
        for (let i = 1; i <= Math.max(0, prefetchPages); i += 1) {
          const np = p + i;
          schedulePrefetch(np, q, filters);
        }

        return { items: (matched.length > 0 ? matched.slice(0, pageSize) : result.items), total: result.total };
      }

      // default behavior (no genre filters) — we've already set books/total above
      setLoading(false);
      setIsFiltering(false);

      // Prefetch next N pages (configurable)
      for (let i = 1; i <= Math.max(0, prefetchPages); i += 1) {
        const next = p + i;
        // don't block UI; schedulePrefetch will skip if too many inflight
        schedulePrefetch(next, q, filters);
      }

      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [fetchPage, page, prefetchPages, schedulePrefetch]);

  // NOTE: the previous implementation included a batched "load all" helper here.
  // It was intentionally removed to keep the API usage pagination-only and avoid
  // accidental large backend loads from the UI. If a controlled full-load is
  // required later, we can reintroduce a safer implementation in a separate
  // utility.

  useEffect(() => {
    // load initial page
    // Attach a rejection handler so any errors from the initial async
    // load don't become an "Uncaught (in promise)" in the console.
    loadPage({ page: initialPage }).catch((err) => {
      setError(err);
      try { console.error('[useBooksApi] initial load failed', err); } catch (e) {}
      // If the backend returned a server error (5xx) or an unexpected network error,
      // fall back to a small local sample set so the UI remains usable in dev.
      try {
        if ((!sampleBooks || sampleBooks.length === 0)) return;
        const mapped = (sampleBooks || []).map(it => ({
          id: it.id ?? it.bookId ?? it._id,
          title: it.title || it.name || 'Untitled',
          author: it.author || 'Unknown Author',
          description: it.synopsis || it.description || '',
          image_url: it.image_url || it.thumbnail || `https://placehold.co/300x450?text=${encodeURIComponent(it.title||'No+Cover')}`,
          genre: it.genre || it.moodTags || null,
        }));
        setBooks(mapped);
        setTotal(mapped.length);
      } catch (e) {
        // ignore fallback failures
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextPage = useCallback(() => setPage(p => {
    const np = p + 1;
    // Fire-and-forget but handle rejections to avoid unhandled promise
    // rejections bubbling to the global handler (seen as "AxiosError").
    loadPage({ page: np, q: lastQueryRef.current.q, filters: lastQueryRef.current.filters }).catch((err) => { setError(err); try { console.error('[useBooksApi] nextPage load failed', err); } catch (e) {} });
    return np;
  }), [loadPage]);

  const prevPage = useCallback(() => setPage(p => {
    const np = Math.max(1, p - 1);
    loadPage({ page: np, q: lastQueryRef.current.q, filters: lastQueryRef.current.filters }).catch((err) => { setError(err); try { console.error('[useBooksApi] prevPage load failed', err); } catch (e) {} });
    return np;
  }), [loadPage]);

  const goToPage = useCallback((p) => {
    setPage(p);
    loadPage({ page: p, q: lastQueryRef.current.q, filters: lastQueryRef.current.filters }).catch((err) => { setError(err); try { console.error('[useBooksApi] goToPage load failed', err); } catch (e) {} });
  }, [loadPage]);

  const search = useCallback((q, filters) => {
    cacheRef.current.clear();
    // Ensure UI shows first page of search results
    setPage(1);

    // Use loadPage to perform the fetch, but explicitly apply the returned
    // items/total to the hook state so callers can rely on `books` being
    // populated after search() resolves.
    return loadPage({ page: 1, q, filters })
      .then((res) => {
        if (!res) return null;
        // Normalize possible response shapes — prefer items, then books, then data
        const items = Array.isArray(res.items) ? res.items : (Array.isArray(res.books) ? res.books : (Array.isArray(res.data) ? res.data : []));

        // Set books from the response items (may be empty) so the hook's
        // `books` always reflects the latest server response.
        setBooks(items);

        if (typeof res.total !== 'undefined' && res.total !== null) {
          setTotal(res.total);
        }

        // keep last query in sync
        lastQueryRef.current = { q, filters };
        // page is already set to 1 above but ensure it's consistent
        setPage(1);

        return res;
      })
      .catch((err) => { setError(err); try { console.error('[useBooksApi] search failed', err); } catch (e) {} ; return null; });
  }, [loadPage]);

  const refresh = useCallback(() => {
    cacheRef.current.clear();
    return loadPage({ page, q: lastQueryRef.current.q, filters: lastQueryRef.current.filters }).catch((err) => { setError(err); try { console.error('[useBooksApi] refresh failed', err); } catch (e) {} ; return null; });
  }, [loadPage, page]);

  const hasMore = total == null ? true : (page * pageSize) < total;
  return {
    page,
    pageSize,
    books,
    total,
    loading,
    error,
    loadPage,
    appendPage,
    nextPage,
    prevPage,
    goToPage,
    search,
    refresh,
    hasMore,
    lastFetch,
    isFiltering
    ,isRateLimited
  };
}
