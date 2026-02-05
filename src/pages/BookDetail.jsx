import React, { useEffect, useState, memo } from 'react';
import './BookDetail.css';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchBookById, fetchReviews, postReview, setAuthToken, fetchBooks, searchBooks } from '../api';
import { useAuth } from '../auth/AuthContext';
import StarRating from '../components/StarRating';
import LazyImage from '../components/LazyImage';

// Small modal used by the reviews area
const MessageModal = memo(({ message, type, onClose }) => {
  if (!message) return null;
  const bg = type === 'success' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900';
  const txt = type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300';
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${bg} ${txt} rounded-lg shadow-xl p-6 max-w-sm w-full relative`}>
        <p className="font-semibold text-lg mb-4">{message}</p>
        <button onClick={onClose} className="absolute top-2 right-2">×</button>
      </div>
    </div>
  );
});

const ReadingStatusSelector = memo(({ bookTitle, onStatusChange }) => {
  const [status, setStatus] = useState(() => localStorage.getItem(`vibeshelf-reading-status-${bookTitle}`) || 'want-to-read');
  const handle = (s) => { setStatus(s); localStorage.setItem(`vibeshelf-reading-status-${bookTitle}`, s); onStatusChange?.(s); };
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-rose-500">Reading Status</h3>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => handle('want-to-read')} className={`p-3 rounded ${status==='want-to-read' ? 'bg-blue-500 text-white': 'bg-gray-700 text-gray-200'}`}>Want to Read</button>
        <button onClick={() => handle('currently-reading')} className={`p-3 rounded ${status==='currently-reading' ? 'bg-green-500 text-white': 'bg-gray-700 text-gray-200'}`}>Reading</button>
        <button onClick={() => handle('read')} className={`p-3 rounded ${status==='read' ? 'bg-gray-500 text-white': 'bg-gray-700 text-gray-200'}`}>Read</button>
      </div>
    </div>
  );
});

const BookStats = memo(({ reviews, averageRating, onWriteReview }) => {
  const total = reviews.length;
  if (total === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 mb-6 text-center">
        <h3 className="text-lg font-semibold mb-4 text-rose-500">Community Ratings</h3>
        <div className="text-2xl font-bold mb-2 text-rose-400">Be the first to rate</div>
        <p className="text-sm text-gray-400 mb-4">Share your thoughts.</p>
        <div className="mt-3">
          <button onClick={onWriteReview} className="inline-block bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded">Write a review</button>
        </div>
      </div>
    );
  }

  const dist = [5,4,3,2,1].map(r => ({ rating: r, count: reviews.filter(x => Number(x.rating) === r).length }));
  return (
    <div className="bg-slate-800 rounded-lg p-6 mb-6">
  <h3 className="text-lg font-semibold mb-4 text-rose-500">Community Ratings</h3>
      <div className="flex items-center mb-4">
        <div className="text-3xl font-bold mr-2 text-rose-600 dark:text-rose-400">{averageRating ? averageRating.toFixed(1) : 'N/A'}</div>
        <div><StarRating rating={averageRating||0} readonly size="large" /><p className="text-sm">{total} reviews</p></div>
      </div>
      <div className="space-y-2">
        {dist.map(d => (
          <div key={d.rating} className="flex items-center text-sm">
            <span className="w-8">{d.rating}★</span>
            <div className="flex-1 mx-2 bg-gray-200 rounded h-2"><div style={{width: `${(d.count/total)*100}%`}} className="bg-yellow-400 h-2 rounded"/></div>
            <span className="w-8 text-right">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

const EnhancedReviews = memo(React.forwardRef(({ bookId }, ref) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState('');
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('');
  const { user, token } = useAuth();
  const textareaRef = React.useRef(null);

  const show = (m, t='') => { setMessage(m); setMessageType(t); setTimeout(()=>{ setMessage(null); setMessageType(''); },3000); };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const cached = localStorage.getItem(`vibeshelf-reviews-${bookId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - (parsed.cachedAt||0) < 30*60*1000) {
          setReviews(parsed.data||[]);
          setLoading(false);
          return;
        }
      }
      const data = await fetchReviews(bookId);
      const list = Array.isArray(data) ? data : (data.items || data.data || []);

      // merge pending local reviews
      try {
        const pendingRaw = localStorage.getItem(`vibeshelf-local-reviews-${bookId}`) || '[]';
        const pending = JSON.parse(pendingRaw);
        const filtered = pending.filter(p => !list.some(s => s.id === p.id || (s.comment === p.comment && (s.userEmail===p.userEmail||s.userName===p.userName))));
        const merged = [...filtered, ...list];
        setReviews(merged);
        localStorage.setItem(`vibeshelf-reviews-${bookId}`, JSON.stringify({ data: merged, cachedAt: Date.now() }));
      } catch(e) { setReviews(list); }
    } catch (err) {
      const cached = localStorage.getItem(`vibeshelf-reviews-${bookId}`);
      if (cached) setReviews(JSON.parse(cached).data||[]);
      else setReviews([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (bookId) loadReviews(); }, [bookId]);

  const submit = async () => {
    if (!comment.trim()) return;
    setStatus('Submitting...');
    try {
      if (token) setAuthToken(token);
      const resp = await postReview({ bookId, comment: comment.trim(), rating });
      const reviewerName = resp?.userName || resp?.displayName || resp?.user?.name || resp?.user?.displayName || user?.displayName || user?.name || user?.username || user?.email;
      const newReview = { ...(resp||{}), id: resp?.id || `local-${Date.now()}`, comment: comment.trim(), rating, createdAt: resp?.createdAt || new Date().toISOString(), pending: !resp?.id, userEmail: resp?.userEmail || resp?.email || user?.email, userName: reviewerName };
      setReviews(s => [newReview, ...s]);
      try {
        const key = `vibeshelf-reviews-${bookId}`;
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : { data: [] };
        parsed.data = [newReview, ...(parsed.data||[])];
        parsed.cachedAt = Date.now();
        localStorage.setItem(key, JSON.stringify(parsed));

        const pkey = `vibeshelf-local-reviews-${bookId}`;
        const prow = localStorage.getItem(pkey) || '[]';
        let pending = JSON.parse(prow);
        if (resp?.id) pending = pending.filter(p => !(p.comment===newReview.comment && (p.userEmail===newReview.userEmail||p.userName===newReview.userName)));
        else pending = [newReview, ...pending];
        localStorage.setItem(pkey, JSON.stringify(pending));
      } catch(e){}

      setComment(''); setRating(5);
      show('Review submitted', 'success');
    } catch(e) { show('Failed to submit review', 'error'); }
    finally { setStatus(''); }
  };

  const filtered = reviews;

  React.useImperativeHandle(ref, () => ({
    focusReview: () => {
      try {
        if (textareaRef.current) {
          textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          textareaRef.current.focus();
        }
      } catch (e) { /* ignore */ }
    }
  }));

  return (
    <div data-reviews-section className="bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
      <MessageModal message={message} type={messageType} onClose={() => setMessage(null)} />
  <h2 className="text-2xl font-semibold mb-4 text-rose-500">Reviews</h2>
      {loading ? <div className="py-6">Loading reviews...</div> : (
        <div className="space-y-4 mb-6">{filtered.map((r,i)=> (
          <div key={r.id||i} className="border-b pb-4 border-gray-700">
            {/** choose the best name field available on the review object */}
            {(() => {
              const name = r?.userName || r?.displayName || (r.user && (r.user.name || r.user.displayName || r.user.username)) || r?.userEmail || r?.email || r?.user_email;
              return (
                <div className="flex justify-between"><div className="font-semibold text-rose-400">{name||'Anonymous'}</div><div className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</div></div>
              );
            })()}
            <div className="flex items-center"><StarRating rating={r.rating} readonly size="small" /><span className="ml-2 text-sm text-gray-300">{r.rating}/5</span></div>
            <p className="mt-2 text-gray-300">{r.comment}</p>
            {r.pending && <div className="text-xs text-yellow-500">Pending</div>}
          </div>
        ))}</div>
      )}

      <div className="border-t pt-4">
  <h3 className="font-semibold mb-2 text-rose-500">Write a review</h3>
  <div className="mb-2"><StarRating rating={rating} onRate={setRating} size="medium" /></div>
  <textarea
    ref={textareaRef}
    value={comment}
    onChange={(e)=>setComment(e.target.value)}
    rows={4}
    className="w-full p-3 border-2 border-rose-600 rounded mb-2 bg-gray-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
    placeholder="Share your thoughts..."
  />
  <div className="flex gap-2"><button onClick={submit} disabled={status==='Submitting...'} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded">{status||'Post Review'}</button></div>
      </div>
    </div>
  );
}));

function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookReviews, setBookReviews] = useState([]);
  const reviewsRef = React.useRef(null);
  const [isInTbr, setIsInTbr] = useState(false);

  const getBackNavigationInfo = () => {
    const referrer = document.referrer || '';
    const lastPage = localStorage.getItem('vibeshelf-last-page');
  if (referrer.includes('/lyric-search') || lastPage === 'lyric-search' || lastPage === 'recommendations') return { text: '← Back to Recommendations', path: '/' };
    if (referrer.includes('/tbr') || lastPage === 'tbr') return { text: '← Back to My TBR', path: '/tbr' };
    if (referrer.includes('/explore') || lastPage === 'explore') return { text: '← Back to Explore', path: '/explore' };
    return { text: '← Back to Explore', path: '/explore' };
  };

  const backNavInfo = getBackNavigationInfo();

  // load cached/remote reviews (unconditionally declared to keep hooks order)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cached = localStorage.getItem(`vibeshelf-reviews-${id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!cancelled && Array.isArray(parsed.data)) { setBookReviews(parsed.data); }
        }
      } catch(_){}
      try {
        const data = await fetchReviews(id);
        const list = Array.isArray(data) ? data : (data.items||data.data||[]);
        if (!cancelled) setBookReviews(list);
        try { localStorage.setItem(`vibeshelf-reviews-${id}`, JSON.stringify({ data: list, cachedAt: Date.now() })); } catch(_){}
      } catch(_){}
    };
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  // fetch the book details
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError(null);
      // If a book was passed via Link state (e.g., from lyric recommender), use it immediately
      try {
        const stateBook = location?.state?.book;
        if (stateBook && (!book || (book && book.title !== stateBook.title))) {
          const normalizedState = {
            id: stateBook.id ?? stateBook.bookId ?? (stateBook.title ? encodeURIComponent(stateBook.title) : undefined),
            title: stateBook.title ?? stateBook.processedTitle ?? stateBook.name ?? stateBook.bookTitle ?? 'Untitled',
            author: stateBook.author ?? stateBook.by ?? 'Unknown Author',
            description: stateBook.description ?? stateBook.summary ?? '',
            image_url: stateBook.coverImageUrl ?? stateBook.image_url ?? stateBook.imageUrl ?? stateBook.thumbnail ?? null,
            publisher: stateBook.publisher ?? null,
            publishedDate: stateBook.publishedDate ?? stateBook.year ?? null,
            genre: stateBook.genre ?? null,
            _raw: stateBook
          };
          setBook(normalizedState);
          // populate a lightweight cache so subsequent loads can reuse it
          try { localStorage.setItem(`vibeshelf-book-${id}`, JSON.stringify({ data: normalizedState, cachedAt: Date.now() })); } catch(_){ }
        }
      } catch(e) { /* ignore state parsing errors */ }
      try {
        const cached = localStorage.getItem(`vibeshelf-book-${id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - (parsed.cachedAt||0) < 3600000) { setBook(parsed.data); setLoading(false); return; }
        }
        // Try primary lookup. If it fails or returns null, try a search-based
        // fallback so slugs/titles still resolve to the expected book.
        let data = null;
        try {
          data = await fetchBookById(id);
        } catch (e) {
          // swallow here and try a search fallback below
          // keep the original error for debugging
          // eslint-disable-next-line no-console
          console.warn('[BookDetail] fetchBookById failed, attempting fallback search', e?.message || e);
        }

        if (!data) {
            try {
            // use the dedicated search endpoint to find a matching book by title/slug
            const fallback = await searchBooks ? await searchBooks({ q: id, limit: 1 }) : null;
            if (Array.isArray(fallback)) data = fallback[0] ?? null;
            else if (fallback?.items && Array.isArray(fallback.items)) data = fallback.items[0] ?? null;
            else if (fallback?.data && Array.isArray(fallback.data)) data = fallback.data[0] ?? null;
            else if (fallback && typeof fallback === 'object') data = fallback;
          } catch (e) {
            // final fallback ignored — we'll let the outer catch handle it
            // eslint-disable-next-line no-console
            console.warn('[BookDetail] fallback search failed', e?.message || e);
          }
        }

        if (!mounted) return;
        // If still no data, throw so outer catch runs and we fall back to cached/default
        if (!data) throw new Error('No book data found for id');

        // normalize minimal raw fields if the server returned a different shape
        const normalized = (data && typeof data === 'object' && data.title) ? data : ({
          id: data.id ?? data._id ?? data.bookId,
          title: data.title ?? data.name ?? data.bookTitle ?? null,
          author: data.author ?? data.by ?? 'Unknown Author',
          description: data.description ?? data.summary ?? data.desc ?? '',
          image_url: data.image_url ?? data.imageUrl ?? data.cover ?? data.thumbnail ?? null,
          publisher: data.publisher ?? null,
          publishedDate: data.publishedDate ?? data.year ?? null,
          _raw: data
        });

        setBook(normalized);
        try { localStorage.setItem(`vibeshelf-book-${id}`, JSON.stringify({ data: normalized, cachedAt: Date.now() })); } catch(_){ }
      } catch (err) {
        const cached = localStorage.getItem(`vibeshelf-book-${id}`);
        if (cached) { setBook(JSON.parse(cached).data); setError('Using cached data - server unavailable'); }
        else { setBook({ id, title: decodeURIComponent(id).replace(/%20/g,' '), author: 'Unknown', description: 'Details unavailable', image_url: null }); }
      } finally { if (mounted) setLoading(false); }
    };
    if (id) load();
    return () => { mounted = false; };
  }, [id]);

  // TBR helpers (small, safe client-side persistence)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vibeshelf-tbr') || '[]';
      const list = JSON.parse(raw);
      setIsInTbr(list.some(b => String(b.id) === String(id)));
    } catch (e) { /* ignore */ }
  }, [id]);

  const addToTBR = () => {
    try {
      const raw = localStorage.getItem('vibeshelf-tbr') || '[]';
      const list = JSON.parse(raw);
      if (!list.some(b => String(b.id) === String(book.id))) {
        list.unshift({ id: book.id, title: book.title, author: book.author, image_url: book.image_url });
        localStorage.setItem('vibeshelf-tbr', JSON.stringify(list));
        setIsInTbr(true);
        // notify other tabs
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) { /* ignore */ }
  };

  const markReadQuick = () => {
    try {
      localStorage.setItem(`vibeshelf-reading-status-${book.title}`, 'read');
    } catch(e){}
  };

  if (loading) return (<div className="min-h-screen flex items-center justify-center">Loading book details...</div>);
  if (!book) return (<div className="min-h-screen flex items-center justify-center">Book not found</div>);

  const averageRating = bookReviews.length > 0 ? bookReviews.reduce((s,r)=>s+(Number(r.rating)||0),0)/bookReviews.length : 0;

  return (
    <div className="min-h-screen p-6 book-detail-pink">
      <button onClick={() => navigate(-1)} className="text-rose-400 hover:text-rose-300 mb-4">{backNavInfo.text}</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-slate-800 p-6 rounded mb-6">
            <LazyImage src={(book.image_url && /^https?:\/\//i.test(book.image_url)) ? book.image_url : 'https://placehold.co/300x450?text=No+Cover'} alt={book.title} />
          </div>
          <div className="bg-slate-800 p-6 rounded">
            <ReadingStatusSelector bookTitle={book.title} />
            <BookStats reviews={bookReviews} averageRating={averageRating} onWriteReview={() => reviewsRef.current?.focusReview?.()} />
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-slate-800 p-6 rounded mb-6">
            <h1 className="text-3xl font-bold text-gray-100">{book.title}</h1>
            <p className="text-gray-400">by {book.author}</p>
            <div className="mt-4"><StarRating rating={averageRating} readonly /></div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                {book.publisher && <div><span className="text-rose-400 font-semibold">Publisher: </span>{book.publisher}</div>}
                {book.publishedDate && <div><span className="text-rose-400 font-semibold">Release: </span>{typeof book.publishedDate === 'number' ? book.publishedDate : (new Date(book.publishedDate).getFullYear ? new Date(book.publishedDate).getFullYear() : book.publishedDate)}</div>}
                {book.genre && <div><span className="text-rose-400 font-semibold">Genre: </span>{Array.isArray(book.genre) ? book.genre.join(', ') : String(book.genre)}</div>}
              </div>
              <div>
                {book.pageCount && <div><span className="text-rose-400 font-semibold">Pages: </span>{book.pageCount}</div>}
                {book.language && <div><span className="text-rose-400 font-semibold">Language: </span>{book.language}</div>}
              </div>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded mb-6">
            <h2 className="text-xl font-semibold mb-2 text-rose-500">Synopsis</h2>
            <p className="text-gray-300">{book.description}</p>
          </div>
          <EnhancedReviews ref={reviewsRef} bookId={id} />
        </div>
      </div>
    </div>
  );
}

export default BookDetail;
 