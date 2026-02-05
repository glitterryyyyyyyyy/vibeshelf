import React, { useEffect, useState } from 'react';
import { fetchBooks } from '../services/api.js';

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Static, hardcoded list of genres (do not derive from books)
  const GENRES = ['Fiction', 'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Young Adult'];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Call backend and pass genre only when non-empty (use undefined to omit)
      const response = await fetchBooks({ page: 3, limit: 20, genre: selectedGenre || undefined });

        // Backend returns { data, pagination } — always use response.data as the books array
        // eslint-disable-next-line no-console
        console.log('books:', response.data);
        if (mounted) setBooks(response.data.slice(60));

      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load books');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [selectedGenre]);

  if (loading) return <div style={{ padding: 16 }}>Loading books...</div>;
  if (error) return <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>;
  if (!books.length) return <div style={{ padding: 16 }}>No books found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, marginBottom: 12 }}>Books</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8, fontWeight: 600 }}>Genre:</label>
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 6 }}
          aria-label="Filter books by genre"
        >
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <ul>
        {books.map((b, i) => (
          <li key={b.id ?? i} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>{b.title ?? b.name ?? 'Untitled'}</div>
            <div style={{ color: '#555' }}>{b.author ?? b.authors ?? 'Unknown author'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
