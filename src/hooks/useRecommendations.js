import { useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000"; // ✅ Point to FastAPI backend

export default function useRecommendations() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const recommend = async (title) => {
    if (!title.trim()) {
      setError("Please enter a book title.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommend_by_title?title=${encodeURIComponent(title)}`
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      // FastAPI returns: { requested_title, results: [{ recommendations: [...] }] }
      const allRecs = data.results.flatMap((r) => r.recommendations);

      // Normalize data to match frontend display structure
      const formatted = allRecs.map((book, i) => ({
        id: i,
        title: book.title,
        coverImageUrl: book.poster_url,
        author: book.author || "Unknown",
      }));

      setResults(formatted);
    } catch (err) {
      setError("Failed to fetch recommendations. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResults([]);
    setError(null);
  };

  return { recommend, results, loading, error, reset };
}
