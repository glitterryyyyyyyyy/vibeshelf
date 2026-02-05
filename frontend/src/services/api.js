import axios from 'axios';

// Central API client for backend calls.
// Backend is running on Spring Boot at port 8080
const BASE_URL = 'http://localhost:8080';

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch books from backend API.
 * Calls: GET /api/books?page=1&limit=24
 * Backend expects page to be 1-based.
 */
export async function fetchBooks({ page = 1, limit = 24, genre = '' } = {}) {
  try {
    const params = { page, limit };
    if (genre) params.genre = genre;

    // ✅ CORRECT endpoint (this was the bug)
    const res = await client.get('/api/books', { params });

    // Backend returns:
    // { books, total, totalPages, hasMore }
    return res.data;
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to fetch books';

    const e = new Error(message);
    e.response = err?.response;
    throw e;
  }
}

export default client;
