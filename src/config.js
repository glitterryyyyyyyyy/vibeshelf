
// In development we prefer a relative base so Vite's dev server can proxy
// requests to the backend and avoid CORS issues. In production set the
// explicit backend host (e.g., process env or a build-time replacement).
const API_BASE_URL = import.meta.env.MODE === 'development' ? '' : 'http://localhost:8080';
// Recommendation server (used by the recommender client). Keep explicit URL
// for production; during dev we still proxy /api endpoints through Vite.
const RECOMMEND_BASE_URL = import.meta.env.MODE === 'development' ? '' : 'http://localhost:8000';

export { API_BASE_URL, RECOMMEND_BASE_URL };
export default API_BASE_URL;
