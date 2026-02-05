import axios from 'axios';
import API_BASE_URL from '../config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function setAuthToken(token) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

/**
 * Fetch paginated books (normal listing).
 * Calls: GET /api/books?page=...&limit=...
 * This does NOT perform search by query.
 */
export async function fetchBooks({ page = 1, limit = 24, filters } = {}) {
  const params = { page, limit };
  if (filters) Object.assign(params, filters);
  const res = await client.get('/api/books', { params });
  return res.data;
}

/**
 * Search books across the whole dataset.
 * Calls: GET /api/books/search?q=...&page=...&limit=...
 */
export async function searchBooks({ page = 1, limit = 24, q = '' } = {}) {
  const params = { page, limit };
  if (q && String(q).trim().length > 0) params.q = q;
  const res = await client.get('/api/books/search', { params });
  return res.data;
}

export async function fetchBookById(id) {
  // Try direct lookup first (by numeric id or canonical id). If the backend
  // rejects the path (400) or doesn't recognize the identifier, fall back to
  // a search request so routes that encode the title (e.g. `/book/Some%20Title`)
  // still work when the server exposes a search/listing endpoint.
  let raw;
  try {
    const res = await client.get(`/api/books/${id}`);
    raw = res.data;
    // Some backends envelope the real book inside an object (e.g. { book: {...} } or { data: {...} }).
    // Unwrap common envelopes so normalization below sees the actual book object.
    if (raw && typeof raw === 'object') {
      if (raw.book && typeof raw.book === 'object') raw = raw.book;
      else if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) raw = raw.data;
    }
  } catch (err) {
    // If server responded with 400/404/405 or similar, attempt a search-based
    // lookup using the same query used by fetchBooks. This covers backends
    // that expect numeric IDs but the UI routed with a title/slug.
    const status = err?.response?.status;
    if (status === 400 || status === 404 || status === 405) {
      try {
        const searchRes = await client.get('/api/books/search', { params: { q: id, query: id, title: id } });
        // search endpoint may return an array or an object with `items`/
        // `data` depending on backend; normalize by picking the first
        // candidate when an array is returned.
        const searchData = searchRes.data;
        if (Array.isArray(searchData)) raw = searchData[0] ?? null;
        else if (Array.isArray(searchData.items)) raw = searchData.items[0] ?? null;
        else raw = searchData;
        // If search returned nothing, try a basic listing lookup that some
        // backends expose (GET /api/books?title=...). This covers servers
        // that implement simple query filters rather than a dedicated search
        // endpoint.
        if (!raw) {
          try {
            const listRes = await client.get('/api/books', { params: { title: id } });
            const listData = listRes.data;
            if (Array.isArray(listData)) raw = listData[0] ?? null;
            else if (Array.isArray(listData.items)) raw = listData.items[0] ?? null;
            else raw = listData;
          } catch (listErr) {
            // ignore — we'll throw below with attached errors
            // attach for debugging
            err.listFallback = listErr;
          }
        }
      } catch (searchErr) {
        // rethrow original error for upstream handling but attach the
        // fallback attempt so callers can inspect it when debugging.
        const e = new Error('Failed to fetch book by id or by fallback search');
        e.original = err;
        e.fallback = searchErr;
        throw e;
      }
    } else {
      // Unknown error — rethrow so UI can handle it
      throw err;
    }
  }
  // Normalize common server field variations so the UI has a stable shape
  const book = raw && typeof raw === 'object' ? {
    id: raw.id ?? raw.bookId ?? raw.book_id ?? raw._id,
    title: raw.title ?? raw.bookTitle ?? raw.name ?? raw['Book-Title'] ?? null,
    // sanitize author strings (strip marketplace suffixes like "(Goodreads Author)")
    author: (() => {
      const a = raw.author ?? raw['Book-Author'] ?? raw.creator ?? raw.by ?? 'Unknown Author';
      if (typeof a === 'string') {
        return a.replace(/\s*\(Goodreads Author\)/g, '').trim();
      }
      return a;
    })(),
    image_url: raw.image_url ?? raw.imageUrl ?? raw.image ?? raw.thumbnail ?? raw.coverImageUrl ?? null,
    description: raw.description ?? raw.desc ?? raw.summary ?? raw['Book-Description'] ?? '',
    publisher: raw.publisher ?? raw.pub ?? raw['publisherName'] ?? null,
    // various servers may expose publication year under several keys
    publishedDate: raw.publishedDate ?? raw.published_date ?? raw.pubDate ?? raw.year ?? raw.publicationYear ?? raw.publication_year ?? null,
    genre: raw.genre ?? raw.categories ?? raw['subject'] ?? null,
    isbn: raw.isbn ?? raw.ISBN ?? raw.isbn13 ?? null,
    pageCount: raw.pageCount ?? raw.page_count ?? raw.pages ?? null,
    language: raw.language ?? raw.lang ?? 'English',
    // include any other raw fields for future-proofing
    _raw: raw
  } : raw;

  return book;
}

export async function fetchReviews(bookId) {
  // Try the path-style endpoint first. If it fails (403/400) try a query-based
  // lookup (some backends expose `/api/reviews?bookId=...` or `/api/reviews?q=...`).
  try {
    const res = await client.get(`/api/reviews/${bookId}`);
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 400 || status === 403 || status === 404) {
      try {
        const res = await client.get('/api/reviews', { params: { bookId, q: bookId } });
        const data = res.data;
        // if backend returns an object with items field, return it
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.items)) return data.items;
        if (data?.data && Array.isArray(data.data)) return data.data;
        // otherwise return whatever came back so UI can inspect it
        return data;
      } catch (fallbackErr) {
        // rethrow original error but attach fallback info
        const e = new Error('Failed to fetch reviews (direct path and fallback)');
        e.original = err;
        e.fallback = fallbackErr;
        throw e;
      }
    }

    throw err;
  }
}

export async function postReview({ bookId, comment, rating }) {
  const res = await client.post('/api/reviews', { bookId, comment, rating });
  return res.data;
}

export async function fetchBooksCount(filters) {
  const res = await client.get('/api/books/count', { params: filters });
  return res.data;
}

export default client;
