import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import './TBRPage.css';

function TBRPage() {
  const [tbrBooks, setTbrBooks] = useState([]);
  const [toast, setToast] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [lastRemoved, setLastRemoved] = useState(null);
  const [sortMode, setSortMode] = useState('added'); // 'added' | 'title' | 'author'
  const [filterQuery, setFilterQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedTbrBooks = JSON.parse(localStorage.getItem("vibeshelf-tbr")) || [];
    setTbrBooks(storedTbrBooks);

    // Add an event listener for storage changes to keep the list updated
    const handleStorageChange = () => {
        try {
            const updatedBooks = JSON.parse(localStorage.getItem("vibeshelf-tbr")) || [];
            setTbrBooks(updatedBooks);
        } catch (e) {
            console.error("Error updating TBR shelf from storage event:", e);
        }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Empty dependency array means this runs once on mount

  const showToast = (msg, ms = 2500) => {
    setToast(msg);
    window.clearTimeout(window._vibeshelf_toast);
    window._vibeshelf_toast = setTimeout(() => setToast(null), ms);
  };

  const handleRemoveBook = (bookId, bookTitle) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    
    // Play a short removal animation, then actually remove from the list
    setRemovingId(bookId ?? bookTitle);
    setTimeout(() => {
      setTbrBooks(prevBooks => {
        const removed = prevBooks.find(book => String(book.id) === String(bookId) || book.title === bookTitle);
        const updatedBooks = prevBooks.filter(book => String(book.id) !== String(bookId) && book.title !== bookTitle);
        try { localStorage.setItem("vibeshelf-tbr", JSON.stringify(updatedBooks)); } catch(e){}
        // store last removed so we can undo
        setLastRemoved(removed || null);
        window.dispatchEvent(new Event('storage'));
        return updatedBooks;
      });
      setRemovingId(null);
      showToast(
        <span>
          <span className="font-bold">"{bookTitle}"</span> removed from TBR!
        </span>
      );
    }, 320);
  };

  const handleUndoRemove = () => {
    if (!lastRemoved) return;
    setTbrBooks(prev => {
      const next = [lastRemoved, ...prev];
      try { localStorage.setItem('vibeshelf-tbr', JSON.stringify(next)); } catch (e) {}
      window.dispatchEvent(new Event('storage'));
      return next;
    });
    setLastRemoved(null);
    setToast('Restored book to your TBR');
    window.clearTimeout(window._vibeshelf_toast);
    window._vibeshelf_toast = setTimeout(() => setToast(null), 2000);
  };

  const displayedBooks = React.useMemo(() => {
    if (!tbrBooks) return [];
    const copy = [...tbrBooks];
    if (sortMode === 'title') return copy.sort((a,b) => String((a.title||'')).localeCompare(String((b.title||''))));
    if (sortMode === 'author') return copy.sort((a,b) => String((a.author||'')).localeCompare(String((b.author||''))));
    // apply filter
    const q = (filterQuery || '').toLowerCase().trim();
    if (!q) return copy;
    return copy.filter(b => ((b.title||'') + ' ' + (b.author||'')).toLowerCase().includes(q));
  }, [tbrBooks, sortMode, filterQuery]);

  return (
    <div className="min-h-screen tbr-root p-8 font-sans transition-colors">
      <div className="max-w-6xl mx-auto tbr-container">
        <button
          onClick={() => navigate(-1)}
          className="text-purple-600 dark:text-purple-400 mb-6 text-sm hover:underline flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <h1 className="text-4xl font-extrabold text-center text-purple-800 dark:text-purple-300 mb-8">
          📖 My TBR List
        </h1>

        {tbrBooks.length === 0 ? (
          <div className="text-center mt-8">
            <p className="text-gray-600 dark:text-gray-400 text-lg">Your TBR list is empty. Add some books from search results!</p>
            <div className="mt-4">
              <Link to="/explore" className="tbr-btn tbr-btn-primary">Explore books</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">Showing</div>
                <div className="text-2xl font-bold text-purple-700">{tbrBooks.length}</div>
                <div className="text-sm text-gray-500">book{tbrBooks.length !== 1 ? 's' : ''} in your TBR</div>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="tbr-sort" className="tbr-sort-label">Sort</label>
                <div className="relative">
                  <select 
                    id="tbr-sort" 
                    value={sortMode} 
                    onChange={(e) => setSortMode(e.target.value)} 
                    className="tbr-sort-select"
                  >
                    <option value="added">Added order</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="author">Author (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input aria-label="Filter TBR" placeholder="Filter by title or author" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
                <button onClick={() => setFilterQuery('')} className="text-sm text-gray-500 hover:underline">Clear</button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => {
                  const ok = window.confirm('Clear all books from your TBR? This cannot be undone.');
                  if (!ok) return;
                  setTbrBooks([]);
                  try { localStorage.setItem('vibeshelf-tbr', JSON.stringify([])); } catch(e) {}
                  window.dispatchEvent(new Event('storage'));
                  showToast('Cleared your TBR');
                }} className="tbr-btn tbr-btn-danger" title="Clear all">Clear all</button>

                {/* Export / Import removed per request - kept only Clear all */}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {displayedBooks.map((book) => {
              // compute a robust cover URL from multiple possible saved fields
              const cover = book.googleBookDetails?.imageLinks?.thumbnail
                || book.googleBookDetails?.imageLinks?.smallThumbnail
                || book.coverImageUrl
                || book.image_url
                || book.thumbnail
                || book.processedThumbnail
                || book['Image-URL-L']
                || book['Image-URL-M']
                || "https://placehold.co/128x192/E0BBE4/FFFFFF?text=No+Cover";

              return (
                <div key={book.id ?? book.title} className={`tbr-card ${String(removingId) === String(book.id ?? book.title) ? 'removing' : ''}`} tabIndex={0}>
                  <div className="tbr-cover-frame">
                    <LazyImage
                      src={cover}
                      alt={book.title}
                      className="tbr-cover-image"
                      placeholder="https://placehold.co/128x192/E0BBE4/FFFFFF?text=No+Cover"
                    />
                  </div>
                  <h2 className="tbr-title">{book.title}</h2>
                  <p className="tbr-author">by {book.author}</p>
                  {book.reason && <p className="tbr-reason">**Vibe:** {book.reason}</p>}

                  <div className="tbr-cta">
                    <Link to={`/book/${encodeURIComponent(book.id ?? book.title)}`} state={{ book }} onClick={() => localStorage.setItem('vibeshelf-last-page', 'tbr')} className="tbr-btn tbr-btn-primary" aria-label={`View details for ${book.title}`}>
                      View Details
                    </Link>
                    <button onClick={() => handleRemoveBook(book.id ?? book.title, book.title)} className="tbr-btn tbr-btn-danger" aria-label={`Remove ${book.title} from TBR`}>
                      Remove
                    </button>
                  </div>
                </div>
      );
      })}
          </div>
        </>
        )}
      </div>
        {/* Toast */}
        {toast && (
          <div className="tbr-toast-container">
            <div className="tbr-toast aesthetic-toast">
              <div className="aesthetic-toast-icon">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="aesthetic-toast-content">
                <p className="aesthetic-toast-message">{toast}</p>
                {lastRemoved && (
                  <button onClick={handleUndoRemove} className="aesthetic-toast-undo">
                    Undo
                  </button>
                )}
              </div>
              <button onClick={() => setToast(null)} className="aesthetic-toast-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

export default TBRPage;