import React, { useState, useEffect, memo, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import StarRating from "./StarRating";
import LazyImage from "./LazyImage";
import { useIntersectionObserver, usePerformanceMonitor } from '../hooks/useOptimizedFetching';

const MessageModal = ({ message, type, onClose }) => {
    // Compact pink toast instead of full-screen overlay. Auto-dismiss is managed by parent
    // (current showMessage uses a 3s timer) so we animate the progress bar for 3s here.
    const [visible, setVisible] = React.useState(Boolean(message));
    const [progressWidth, setProgressWidth] = React.useState('100%');
    useEffect(() => {
        if (!message) {
            setVisible(false);
            return;
        }
        setVisible(true);
        // kick off the progress bar shrink on the next tick so transition works
        const t = setTimeout(() => setProgressWidth('0%'), 20);
        const escHandler = (e) => { if (e.key === 'Escape') onClose && onClose(); };
        window.addEventListener('keydown', escHandler);
        return () => { clearTimeout(t); window.removeEventListener('keydown', escHandler); setProgressWidth('100%'); };
    }, [message, onClose]);

    if (!visible) return null;

    const isSuccess = type === 'success';
    // pink/lavender styling for success, subtle red for error
    const bg = isSuccess ? 'bg-gradient-to-br from-pink-50 via-white to-pink-50' : 'bg-red-50';
    const border = isSuccess ? 'border border-pink-200' : 'border border-red-200';
    const text = isSuccess ? 'text-rose-800' : 'text-red-700';

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed right-6 bottom-6 z-50 w-[min(520px,calc(100%-48px))] max-w-md"
        >
            <div className={`rounded-2xl shadow-2xl p-4 relative overflow-hidden ${bg} ${border}`}>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-0.5">
                        {isSuccess ? (
                            <div className="h-9 w-9 rounded-lg bg-pink-200 flex items-center justify-center text-pink-700 font-bold">✓</div>
                        ) : (
                            <div className="h-9 w-9 rounded-lg bg-red-200 flex items-center justify-center text-red-700 font-bold">!</div>
                        )}
                    </div>

                    <div className="flex-1">
                        <div className={`font-semibold text-lg leading-snug ${text}`}>{message}</div>
                    </div>

                    <button
                        onClick={() => onClose && onClose()}
                        aria-label="Dismiss notification"
                        className="ml-3 text-2xl leading-none text-rose-500 hover:text-rose-700"
                    >
                        ×
                    </button>
                </div>

                {/* progress bar */}
                <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/40">
                    <div
                        style={{ width: progressWidth, transition: 'width 3s linear' }}
                        className="h-1 bg-pink-400"
                    />
                </div>
            </div>
        </div>
    );
};

// Optimized BookCard component with intersection observer
const OptimizedBookCard = memo(({ book, onSave, onRatingChange }) => {
    const { targetRef, hasIntersected } = useIntersectionObserver({
        threshold: 0.1,
        rootMargin: '100px',
        once: true
    });

    const coverRef = useRef(null);
    const navigate = useNavigate();

    const handleCoverClick = useCallback((e) => {
        // play a quick pop animation before navigating so the interaction feels tactile
        const to = `/book/${encodeURIComponent(book.id ?? book.processedTitle ?? book.title)}`;
        if (coverRef.current) {
            e.preventDefault();
            coverRef.current.classList.remove('cover-pop');
            // force reflow to restart animation
            // eslint-disable-next-line no-unused-expressions
            coverRef.current.offsetWidth;
            coverRef.current.classList.add('cover-pop');
            setTimeout(() => navigate(to), 160);
            return;
        }
        // fallback immediate navigate
        navigate(to);
    }, [book, navigate]);

    const handleSaveClick = useCallback((shelfType) => {
        onSave(book, shelfType);
    }, [book, onSave]);

    const handleRatingChange = useCallback((rating) => {
        onRatingChange(book.processedTitle, rating);
    }, [book.processedTitle, onRatingChange]);

    const handleLinkClick = useCallback(() => {
        localStorage.setItem('vibeshelf-last-page', 'explore');
    }, []);

    return (
        <div
            ref={targetRef}
            className="glass-card card-hover-tilt p-5 flex flex-col items-center text-left relative"
        >
            {/* Removed top-right "On TBR" badge per UX request */}
            
            <div className="bg-rose-50 p-2 rounded-xl border border-rose-200 shadow-sm mb-4 w-full book-image-wrap">
                {hasIntersected ? (
                    <Link
                        to={`/book/${encodeURIComponent(book.id ?? book.processedTitle ?? book.title)}`}
                        onClick={handleCoverClick}
                        className="cover-link block w-full h-64 rounded-lg overflow-hidden"
                        ref={coverRef}
                        aria-label={`Open details for ${book.processedTitle}`}
                    >
                        <LazyImage
                            src={book.processedThumbnail}
                            alt={book.processedTitle}
                            className="cover-img w-full h-64 object-cover rounded-lg"
                            placeholder="https://placehold.co/128x192/F0D9E6/8B5F6C?text=No+Cover"
                        />
                    </Link>
                ) : (
                    <div className="w-full h-64 bg-rose-100 rounded-lg flex items-center justify-center">
                        <span className="text-rose-400 text-sm">Loading...</span>
                    </div>
                )}

                {/* overlay removed per request */}
            </div>

            <h2 className="text-lg font-bold text-rose-700 dark:text-rose-300 font-serif mb-1 text-center line-clamp-2">
                {book.processedTitle}
            </h2>

            <p className="text-sm italic text-rose-500 dark:text-rose-400 mt-2 text-center line-clamp-1">
                {book.processedAuthor}
            </p>

            <div className="mt-3 flex justify-center">
                <StarRating
                    rating={book.rating}
                    onRatingChange={handleRatingChange}
                    size={18}
                />
            </div>

            <div className="mt-4 flex flex-col gap-4 w-full">
                <Link
                    to={`/book/${encodeURIComponent(book.id ?? book.processedTitle ?? book.title)}`}
                    onClick={handleLinkClick}
                    className="interactive-cta book-cta no-underline"
                >
                    View Details
                </Link>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSaveClick('tbr')}
                        disabled={book.isOnTbr}
                        className={`book-cta book-cta--muted flex-1 ${book.isOnTbr ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {book.isOnTbr ? 'On TBR' : 'Add to TBR'}
                    </button>
                    {/* favorite removed per design */}
                </div>
            </div>
        </div>
    );
});

OptimizedBookCard.displayName = 'OptimizedBookCard';

const BookshelfGrid = memo(function BookshelfGrid({ 
    books, 
    onSave, 
    loading = false,
    className = "",
    enableVirtualization = false,
    containerHeight = 600 
}) {
    const [tbrBookTitles, setTbrBookTitles] = useState(new Set());
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState("");
    const [bookRatings, setBookRatings] = useState({});
    
    const { startTiming, recordMetric } = usePerformanceMonitor();

    useEffect(() => {
        const handleStorageChange = () => {
            const storedTbrBooks = JSON.parse(localStorage.getItem("vibeshelf-tbr")) || [];
                const storedRatings = JSON.parse(localStorage.getItem("vibeshelf-ratings")) || {};

                setTbrBookTitles(new Set(storedTbrBooks.map(book => book.title)));
            setBookRatings(storedRatings);
        };

        window.addEventListener('storage', handleStorageChange);
        handleStorageChange();

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const showMessage = useCallback((msg, type) => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            setMessage(null);
            setMessageType("");
        }, 3000);
    }, []);

    // favorites removed — no-op placeholder kept for compatibility if needed later
    const toggleFavorite = useCallback(() => {}, []);

    const handleSaveClick = useCallback((bookData, shelfType) => {
        const endTiming = startTiming('saveBook');
        onSave(bookData, shelfType);
        showMessage(`"${bookData.title}" added to ${shelfType.toUpperCase()}!`, "success");
        endTiming();
        recordMetric('booksSaved', 1);
    }, [onSave, showMessage, startTiming, recordMetric]);

    const handleRatingChange = useCallback((bookTitle, rating) => {
        const endTiming = startTiming('updateRating');
        const updatedRatings = { ...bookRatings, [bookTitle]: rating };
        setBookRatings(updatedRatings);
        localStorage.setItem("vibeshelf-ratings", JSON.stringify(updatedRatings));
        endTiming();
    }, [bookRatings, startTiming]);

    // Memoize processed books to avoid unnecessary re-computations
    const processedBooks = useMemo(() => {
        const endTiming = startTiming('processBooks');
        const processed = books.map((book) => {
            const title = book.title || book['Book-Title'] || "Untitled";
            const rawAuthor = book.author || book['Book-Author'] || "";
            // Strip common vendor tags like Goodreads mentions and prefixes
            const sanitizedAuthor = (rawAuthor || '').replace(/\s*\(.*goodreads.*\)/i, '').replace(/Goodreads:\s*/i, '').trim();
            const author = sanitizedAuthor || "Unknown";
            const description = book.description || book['Book-Description'] || "Description coming soon.";
            // Normalize thumbnail: accept multiple possible backend fields used across APIs
            const thumbnail = book.image_url || book.image || book.coverImg || book.thumbnail || book['Image-URL-L'] || book['Image-URL-M'] || 
                             "https://placehold.co/128x192/F0D9E6/8B5F6C?text=No+Cover";

            return {
                ...book,
                processedTitle: title,
                processedAuthor: author,
                processedDescription: description,
                processedThumbnail: thumbnail,
                key: book.id || title,
                isOnTbr: tbrBookTitles.has(title),
                rating: bookRatings[title] || 0
            };
        });
        endTiming();
        recordMetric('processedBooks', processed.length);
        return processed;
    }, [books, tbrBookTitles, bookRatings, startTiming, recordMetric]);

    // Loading skeleton component
    const LoadingSkeleton = memo(() => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 12 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-90 border border-rose-200 dark:border-gray-600 rounded-2xl p-5 shadow-sm animate-pulse">
                    <div className="bg-gray-300 dark:bg-gray-600 rounded-xl h-64 mb-4"></div>
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2 mx-auto"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4 mx-auto"></div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                        <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex-1"></div>
                        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex-1"></div>
                    </div>
                </div>
            ))}
        </div>
    ));

    if (loading && processedBooks.length === 0) {
        return (
            <>
                <MessageModal message={message} type={messageType} onClose={() => setMessage(null)} />
                <LoadingSkeleton />
            </>
        );
    }

    return (
        <>
            <MessageModal message={message} type={messageType} onClose={() => setMessage(null)} />
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 ${className}`}>
                {processedBooks.map((book) => (
                    <OptimizedBookCard
                        key={book.key}
                        book={book}
                        onSave={handleSaveClick}
                        onRatingChange={handleRatingChange}
                    />
                ))}
                {loading && (
                    <>
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={`loading-${index}`} className="bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-90 border border-rose-200 dark:border-gray-600 rounded-2xl p-5 shadow-sm animate-pulse">
                                <div className="bg-gray-300 dark:bg-gray-600 rounded-xl h-64 mb-4"></div>
                                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2 mx-auto"></div>
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-4 mx-auto"></div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </>
    );
});

export default BookshelfGrid;