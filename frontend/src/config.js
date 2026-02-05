// Backend API base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.MODE === 'development' ? '' : '');

// Recommender (optional – safe default)
const RECOMMEND_BASE_URL =
  import.meta.env.VITE_RECOMMEND_BASE_URL || '';

export { API_BASE_URL, RECOMMEND_BASE_URL };
export default API_BASE_URL;
