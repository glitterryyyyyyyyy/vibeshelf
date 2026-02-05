import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Explore.css';
import BookshelfGrid from '../components/BookshelfGrid.jsx';
import { useAuth } from "../auth/AuthContext.jsx";
import useBooksApi from '../hooks/useBooksApi.js';

// Inline GenreDropdown component (no external deps). Props:
// - available: array of genre strings
// - selected: array of selected genre strings
// - onChange: function(nextSelectedArray)
function GenreDropdown({ available = [], selected = [], onChange, isFiltering = false }) {
    const [open, setOpen] = React.useState(false);
    const [filter, setFilter] = React.useState('');
    const ref = React.useRef(null);
    const searchRef = React.useRef(null);

    React.useEffect(() => {
        const onDocClick = (e) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target)) setOpen(false);
        };
        window.addEventListener('click', onDocClick);
        return () => window.removeEventListener('click', onDocClick);
    }, []);

    React.useEffect(() => {
        if (open) {
            setTimeout(() => searchRef.current && searchRef.current.focus(), 40);
        }
    }, [open]);

    const toggle = () => setOpen(o => !o);

    const handleToggleGenre = (g) => {
        const active = selected.includes(g);
        const next = active ? selected.filter(x => x !== g) : [...selected, g];
        onChange(next);
    };

    const clearAll = () => onChange([]);

    const filtered = React.useMemo(() => {
        const q = (filter || '').toLowerCase().trim();
        return (available || []).filter(g => !q || g.toLowerCase().includes(q));
    }, [available, filter]);

    const genreColor = (s) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
        const hue = h;
        const c1 = `hsl(${hue} 85% 82%)`;
        const c2 = `hsl(${(hue + 30) % 360} 80% 72%)`;
        return { c1, c2 };
    };

    const renderPills = () => {
        if (!selected || selected.length === 0) return <span className="genre-placeholder">Filter genres…</span>;
        const visible = selected.slice(0, 3);
        return (
            <div className="flex items-center gap-2">
                {visible.map(g => <span key={g} className="genre-pill">{g}</span>)}
                {selected.length > 3 && <span className="text-xs text-rose-600">+{selected.length - 3}</span>}
            </div>
        );
    };

    return (
        <div className="relative inline-block" ref={ref}>
            <button onClick={toggle} aria-haspopup="listbox" aria-expanded={open} className="genre-toggle glass-card card-hover-tilt px-3 py-2 rounded-xl border-2 border-rose-100 flex items-center gap-3 min-w-[220px] max-w-[420px]">
                <div className="flex-1 text-left">{renderPills()}</div>
                <div className="flex items-center gap-2">
                    <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.584l3.71-4.355a.75.75 0 111.14.976l-4.25 5a.75.75 0 01-1.14 0l-4.25-5a.75.75 0 01.02-1.06z"/></svg>
                </div>
            </button>

            {open && (
                <div className="absolute z-50 mt-3 w-[min(520px,90vw)] genre-dropdown-light bg-white dark:bg-gray-800 border border-rose-100 dark:border-gray-700 rounded-2xl p-3 shadow-2xl transform-gpu animate-fade-in">
                    <div className="flex items-center gap-3 mb-3">
                        <input ref={searchRef} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter genres..." className="genre-search px-3 py-2 rounded-2xl flex-1 border border-rose-50 focus:outline-none" />

                        {/* Right-side controls: smaller 'Select all' button (selects all available genres) + clearer Clear control */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const all = available || [];
                                    if (!all.length) return;
                                    const allSelected = all.every(g => selected.includes(g));
                                    if (allSelected) {
                                        // deselect all available
                                        onChange((selected || []).filter(s => !all.includes(s)));
                                    } else {
                                        // select all available, preserving any others
                                        const next = Array.from(new Set([...(selected || []), ...all]));
                                        onChange(next);
                                    }
                                }}
                                className="select-all-btn"
                                aria-label={`Select all genres (${(available||[]).length})`}
                                title={`Select all genres (${(available||[]).length})`}
                            >
                                <span className="select-check">✓</span>
                                <span className="select-text">Select all</span>
                            </button>

                            <button onClick={clearAll} title="Clear all" className="genre-clear-btn text-sm" aria-label="Clear all genres">Clear</button>
                        </div>
                    </div>

                    <div className="genre-list max-h-72 overflow-auto flex flex-col gap-2" role="listbox" aria-label="Genre list">
                        {filtered.length === 0 && <div className="text-sm text-gray-500 p-4">No genres match “{filter}”</div>}
                        {filtered.map((g) => {
                            const active = selected.includes(g);
                            return (
                                <label key={g} role="option" aria-selected={active} className={`genre-chip w-full relative flex items-center gap-3 px-3 py-3 rounded-lg transition transform ${active ? 'selected' : ''}`}>
                                    <input type="checkbox" className="native-checkbox" checked={active} onChange={() => handleToggleGenre(g)} aria-label={`Select genre ${g}`} />

                                    <span className="checkbox-box" aria-hidden>
                                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 10l3 3 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </span>

                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="genre-swatch" aria-hidden style={{background: `linear-gradient(180deg, ${genreColor(g).c1}, ${genreColor(g).c2})`}} />
                                            <span className={`text-sm ${active ? 'font-semibold text-rose-700' : 'text-rose-700/90'}`}>{g}</span>
                                        </div>
                                        <div className="hidden sm:flex items-center">
                                            {active ? (
                                                <svg className="h-5 w-5 text-rose-600" viewBox="0 0 20 20" fill="currentColor"><path d="M7.629 13.314a.75.75 0 01-1.058 0l-2.78-2.78a.75.75 0 011.06-1.06l2.25 2.25L14.09 5.86a.75.75 0 111.06 1.06l-7.521 6.394z"/></svg>
                                            ) : null}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isFiltering && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-rose-600" />}
                            <button onClick={() => setOpen(false)} className="done-btn" aria-label="Close genre dropdown">
                                <span className="done-check">✓</span>
                                <span>Done</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Explore() {
    const { loading: authLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    // Single grid Explore (loads all books)
    const [query, setQuery] = useState('');
    const searchTimerRef = useRef(null);
    const [recentSearches, setRecentSearches] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionIndex, setSuggestionIndex] = useState(-1);
    const [searchActive, setSearchActive] = useState(false);
    // remember the page the user was on before they started a search so Back returns there
    const priorPageRef = useRef(null);
    // stable ref to current page to avoid stale closures in callbacks
    // Avoid referencing `page` before it's initialized — start at 1 and keep in-sync below
    const pageRef = useRef(1);

    const {
        page,
        pageSize,
        books,
        results,
        total,
        loading,
        error,
        search,
    lastFetch,
    isFiltering,
    isRateLimited,
        loadPage,
        goToPage,
        nextPage,
        prevPage,
        refresh,
        hasMore
    } = useBooksApi({ initialPage: 1, pageSize: 48, prefetchPages: 2, maxConcurrent: 3 });
    

    // keep pageRef in sync with the latest `page` value (declare after `page` is initialized)
    useEffect(() => { pageRef.current = page; }, [page]);
    

    // Track recent fetch hashes so we can detect when the backend returns identical pages
    const [serverWarning, setServerWarning] = useState(false);
    const fetchHistoryRef = useRef(new Map());
    const [lastTrace, setLastTrace] = useState(null);
    const [selectedGenres, setSelectedGenres] = useState([]);
    // local override store for search/genre responses so UI can render results
    const [overrideResults, setOverrideResults] = useState(null);
    const [globalGenres, setGlobalGenres] = useState([]);
    // No local override — useBooksApi is single source of truth
    const genreTimerRef = useRef(null);
    // removed bulk "load all" related counters (pagination-only UX)

    useEffect(() => {
        if (!lastFetch || !lastFetch.ts) return;
        const { page: p, hash, items } = lastFetch;
        setLastTrace({ page: p, items, hash });
        if (hash == null) return;
        // record hash for this page
        fetchHistoryRef.current.set(p, hash);

        // detect if two different pages have the same hash (simple server bug detector)
        const hashes = new Map();
        for (const [pg, h] of fetchHistoryRef.current.entries()) {
            if (!hashes.has(h)) hashes.set(h, []);
            hashes.get(h).push(pg);
        }
        // if any hash is associated with >1 different page, warn
        let dupFound = false;
        for (const [h, pages] of hashes.entries()) {
            if (pages.length > 1) { dupFound = true; break; }
        }
        setServerWarning(dupFound);
    }, [lastFetch]);

    // helper: normalize genre field from a book item into an array of strings
    const parseGenres = useCallback((raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw.map(x => String(x).trim()).filter(Boolean);
        if (typeof raw === 'string') {
            // some backends return "['Fiction','Short Stories']" or "Fiction, Short Stories"
            const s = raw.trim();
            if (s.startsWith('[') && s.endsWith(']')) {
                try {
                    // try JSON parse after replacing single quotes
                    const json = s.replace(/'/g, '"');
                    const parsed = JSON.parse(json);
                    if (Array.isArray(parsed)) return parsed.map(x => String(x).trim()).filter(Boolean);
                } catch (e) { /* fall through */ }
            }
            // fallback: split on commas
            return s.split(',').map(x => x.trim()).filter(Boolean);
        }
        return [];
    }, []);

    // curated genre seed (covers common genres so dropdown isn't empty)
    const CURATED_GENRES = [
        'Fiction','Nonfiction','Mystery','Thriller','Romance','Romantic Comedy','Historical','Fantasy','Science Fiction','Horror','Memoir','Biography','Self-Help','Poetry','Young Adult','Children','Graphic Novel','Humor','Satire','Adventure','Classic','Contemporary','Crime','Cozy Mystery','Paranormal','Urban Fantasy','Magical Realism','Literary Fiction','Short Stories','Essays','Parenting','Health','Religion','Philosophy','Travel','Cooking','Art','Music','Business','Technology','History','Politics','Science','True Crime'
    ];

    // derive available genres from the current page of books
    const availableGenres = React.useMemo(() => {
        const freq = new Map();
        for (const b of books || []) {
            const gens = parseGenres(b.genre || b.categories || b.subject);
            for (const g of gens) {
                const key = g.trim();
                if (!key) continue;
                freq.set(key, (freq.get(key) || 0) + 1);
            }
        }
        // sort by frequency desc and return top 20
        return Array.from(freq.entries()).sort((a,b) => b[1]-a[1]).slice(0,20).map(x => x[0]);
    }, [books, parseGenres]);

    // build the final genre list shown in the dropdown: curated seeds + global list + page-derived
    const allGenreOptions = React.useMemo(() => {
        const combined = [
            ...CURATED_GENRES,
            ...(globalGenres || []),
            ...(availableGenres || [])
        ].map(x => String(x).trim()).filter(Boolean);
        // dedupe while preserving order
        const seen = new Set();
        const out = [];
        for (const g of combined) {
            const key = g.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(g);
        }
        return out.slice(0, 200);
    }, [globalGenres, availableGenres]);

    // Try to fetch a server-provided genre list; if unavailable, sample the
    // first few pages to build a weighted list. This keeps the UI stable and
    // avoids scanning the entire dataset.
    useEffect(() => {
        let cancelled = false;
        const loadGlobal = async () => {
            try {
                const freq = new Map();
                // sample first 3 pages via the hook's loader; restore current page afterwards
                const currentPage = page;
                for (let p = 1; p <= 3; p += 1) {
                    try {
                        const resp = await loadPage({ page: p, q: null, filters: null });
                        const items = resp?.items || [];
                        for (const it of items) {
                            const gens = parseGenres(it.genre || it.categories || it.subject);
                            for (const g of gens) {
                                if (!g) continue;
                                freq.set(g, (freq.get(g) || 0) + 1);
                            }
                        }
                    } catch (e) {
                        // ignore individual page failures
                    }
                    if (cancelled) return;
                }
                // restore the page the user was on
                try { await loadPage({ page: currentPage, q: lastFetch?.q ?? null, filters: null }); } catch (e) { /* ignore */ }
                if (cancelled) return;
                const sorted = Array.from(freq.entries()).sort((a,b) => b[1]-a[1]).slice(0,50).map(x => x[0]);
                setGlobalGenres(sorted);
            } catch (e) {
                // ignore failures; UI will use page-derived genres
            }
        };
        loadGlobal();
        return () => { cancelled = true; };
    }, [parseGenres, loadPage]);

    // When selectedGenres changes, fetch from backend directly and use response.data
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const genreParam = (selectedGenres && selectedGenres.length > 0) ? selectedGenres.join(',') : undefined;
                const filters = (selectedGenres && selectedGenres.length > 0) ? { genres: selectedGenres, genre: genreParam } : null;
                // Use the hook's search function so useBooksApi remains the single source of truth
                const resp = await search(query, filters);
                // capture the returned result so Explore can render the items even if the
                // hook populates a different internal array or clears `books` temporarily
                setOverrideResults(resp || null);
            } catch (e) {
                try { console.error('[Explore] genre search failed', e); } catch (ee) {}
            }
        })();
        return () => { mounted = false; };
    }, [selectedGenres]);

    // Restore Explore state when navigated back from BookDetail
    useEffect(() => {
        try {
            if (location && location.state && location.state.fromExplore === true) {
                const s = location.state.selectedGenres;
                const p = location.state.page;
                if (Array.isArray(s)) setSelectedGenres(s);
                if (typeof p === 'number' && p > 0) goToPage(p);
                // do not forcibly refetch here; the hook will provide the cached page
            }
        } catch (e) { /* ignore */ }
    // run on mount and when location changes
    }, [location]);

    const handleBookLinkClick = useCallback((e) => {
        try {
            const a = e.target && e.target.closest && e.target.closest('a');
            if (!a) return;
            const href = a.getAttribute && (a.getAttribute('href') || a.href);
            if (!href) return;
            if (href.includes('/book/')) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const url = new URL(href, window.location.origin);
                    const to = url.pathname + url.search;
                    navigate(to, { state: { fromExplore: true, selectedGenres, page } });
                } catch (err) {
                    // fallback: navigate using the raw href
                    navigate(href, { state: { fromExplore: true, selectedGenres, page } });
                }
            }
        } catch (err) { /* ignore */ }
    }, [navigate, selectedGenres, page]);

    const onQueryChange = useCallback((val) => {
        setQuery(val);
        setShowSuggestions(true);
        // mark that user is actively searching if they type something non-empty
        if (String(val || '').trim().length > 0) {
            if (!searchActive) {
                // record the page we came from to return to it later
                priorPageRef.current = pageRef.current || page;
            }
            setSearchActive(true);
        }
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            // capture search results so the UI can render them directly
            Promise.resolve(search(val)).then((resp) => setOverrideResults(resp || null)).catch(() => {});
            // record recent search
            try {
                const stored = JSON.parse(localStorage.getItem('vibeshelf-recent-searches') || '[]');
                const next = [val, ...stored.filter(s => s !== val)].slice(0, 8);
                localStorage.setItem('vibeshelf-recent-searches', JSON.stringify(next));
                setRecentSearches(next);
            } catch (e) { /* ignore */ }
        }, 350);
    }, [search]);

    // immediate search when user presses Enter
    const handleSearchSubmit = useCallback((e) => {
        if (e && e.key && e.key !== 'Enter') return;
        if (searchTimerRef.current) { clearTimeout(searchTimerRef.current); searchTimerRef.current = null; }
        // capture search results so Explore can render the returned items
        Promise.resolve(search(query)).then((resp) => setOverrideResults(resp || null)).catch(() => {});
        if (String(query || '').trim().length > 0) {
            if (!searchActive) priorPageRef.current = pageRef.current || page;
            setSearchActive(true);
        }
        setShowSuggestions(false);
        try {
            const stored = JSON.parse(localStorage.getItem('vibeshelf-recent-searches') || '[]');
            const next = [query, ...stored.filter(s => s !== query)].slice(0, 8);
            localStorage.setItem('vibeshelf-recent-searches', JSON.stringify(next));
            setRecentSearches(next);
        } catch (e) {}
    }, [query, search]);

    const handleClearSearch = useCallback(() => {
        setQuery('');
        setShowSuggestions(false);
        setSearchActive(false);
        setOverrideResults(null);
        if (searchTimerRef.current) { clearTimeout(searchTimerRef.current); searchTimerRef.current = null; }
        search('');
    }, [search]);

    // Undo the user's search input and restore the prior page's unfiltered content
    const handleUndoSearch = useCallback(() => {
        setQuery('');
        setShowSuggestions(false);
        setSearchActive(false);
        setOverrideResults(null);
        try {
            const target = priorPageRef.current || pageRef.current || page || 1;
            // set the page state then explicitly load the unfiltered page content
            goToPage(target);
            // ensure we fetch the unfiltered version of that page (q=null)
            loadPage({ page: target, q: null, filters: null }).catch(() => { /* ignore */ });
        } catch (e) { /* ignore if not available */ }
        priorPageRef.current = null;
    }, [goToPage, loadPage, page]);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('vibeshelf-recent-searches') || '[]');
            setRecentSearches(stored.slice(0, 8));
        } catch (e) { setRecentSearches([]); }
    }, []);

    // cleanup genre debounce timer on unmount
    useEffect(() => {
        return () => {
            if (genreTimerRef.current) clearTimeout(genreTimerRef.current);
        };
    }, []);

    // suggestions from local recent searches + titles/authors in current page
    const suggestions = React.useMemo(() => {
        const q = (query || '').toLowerCase().trim();
        const fromBooks = [];
        if (q) {
            for (const b of books || []) {
                const title = (b.title || '').toLowerCase();
                const author = (b.author || '').toLowerCase();
                if (title.includes(q) || author.includes(q)) {
                    fromBooks.push(b.title || b.id);
                }
                if (fromBooks.length >= 6) break;
            }
        }
        const combined = [...recentSearches.filter(s => s && (!q || s.toLowerCase().includes(q))), ...fromBooks];
        return Array.from(new Set(combined)).slice(0, 8);
    }, [query, recentSearches, books]);

    // Build richer suggestion items (thumbnail when available)
    const suggestionItems = React.useMemo(() => {
        const q = (query || '').toLowerCase().trim();
        return suggestions.map(s => {
            const match = (books || []).find(b => {
                const t = (b.title || b.id || '').toString();
                return t.toLowerCase() === (s || '').toLowerCase() || (s && (t || '').toLowerCase().includes((s || '').toLowerCase()));
            });
            const thumb = match ? (match.image_url || match.imageUrl || match.thumbnail || null) : null;
            return { text: s, thumb };
        });
    }, [suggestions, books, query]);

    // highlight matching substring in suggestion text for visual emphasis
    const highlightText = useCallback((text, q) => {
        if (!q) return text;
        const lower = text.toLowerCase();
        const lq = q.toLowerCase();
        const parts = [];
        let idx = 0;
        while (true) {
            const found = lower.indexOf(lq, idx);
            if (found === -1) {
                parts.push({ t: text.slice(idx), m: false });
                break;
            }
            if (found > idx) parts.push({ t: text.slice(idx, found), m: false });
            parts.push({ t: text.slice(found, found + lq.length), m: true });
            idx = found + lq.length;
        }
        return parts.map((p, i) => p.m ? React.createElement('span', { key: i, className: 'font-semibold text-rose-700' }, p.t) : React.createElement('span', { key: i }, p.t));
    }, []);

    const clampIndex = (i) => {
        const max = Math.max(0, (suggestionItems || []).length - 1);
        if (i < 0) return -1;
        if (i > max) return max;
        return i;
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            handleUndoSearch();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setShowSuggestions(true);
            setSuggestionIndex(i => clampIndex(i + 1 < 0 ? 0 : i + 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestionIndex(i => clampIndex(i - 1));
            return;
        }
        if (e.key === 'Enter') {
            // If a suggestion is highlighted, choose it instead of raw query
            if (suggestionIndex >= 0 && suggestionItems[suggestionIndex]) {
                e.preventDefault();
                const s = suggestionItems[suggestionIndex].text;
                setQuery(s);
                setShowSuggestions(false);
                setSuggestionIndex(-1);
                if (!searchActive) priorPageRef.current = pageRef.current || page;
                setSearchActive(true);
                search(s);
                return;
            }
            // otherwise fall back to the normal submit handler
            handleSearchSubmit(e);
        }
    };

    const startIndex = (page - 1) * pageSize + 1;
    const endIndex = Math.min(page * pageSize, total || 0);
    const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

    if (authLoading) return (
        <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div></div>
    );

    return (
        <div className="min-h-screen premium-pink-bg transition-colors relative">
            <div className="premium-header-decor" />
            <div className="container mx-auto px-6 py-10">
                <div className="text-center mb-8">
                        <h1 className="text-5xl font-extrabold mb-2 tracking-tight bg-gradient-to-r from-pink-200 via-pink-400 to-pink-700 bg-clip-text text-transparent drop-shadow-md">Explore Books ✨</h1>
                    <p className="text-rose-600 text-sm mb-2">{(total || 0) > 0 ? `${(total || 0).toLocaleString()} books available • Showing ${startIndex}-${endIndex}` : 'Preparing your library...'}</p>
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="h-1 w-40 rounded-full bg-gradient-to-r from-pink-300 via-pink-400 to-pink-500 shadow-sm" />
                    </div>
                    
                    
                    {serverWarning && (
                        <div className="mt-3 text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">⚠️ The server appears to be returning the same page for multiple requests. Pagination may not work correctly until the backend is fixed.</div>
                    )}
                    {isRateLimited && (
                        <div className="mt-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">🚫 Server is rate limiting requests — slowing down and retrying shortly.</div>
                    )}
                    {loading && <div className="mt-3 flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-500"></div><span className="text-sm text-gray-500">Loading page {page}...</span></div>}
                    {error && <div className="mt-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">🚨 Error: {String(error)} <button onClick={refresh} className="ml-2 underline">Retry</button></div>}
                </div>

                <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8">
                    <div className="flex-1 max-w-xl w-full relative">
                        {/* Back button removed: Clear search pill handles undo/clear actions */}
                        <div className="relative">
                            <input
                                type="text"
                                aria-label="Search books by title, author or description"
                                placeholder="Search title, author or description"
                                    value={query}
                                    onChange={(e) => onQueryChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        // Allow Enter to submit and Escape to clear/return to Explore
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            handleUndoSearch();
                                            return;
                                        }
                                        handleSearchSubmit(e);
                                    }}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                aria-expanded={showSuggestions}
                                aria-controls="explore-suggestions"
                                className="w-full pl-12 pr-12 py-4 rounded-3xl border-2 border-pink-200 bg-gradient-to-r from-white/70 to-pink-50/60 backdrop-blur-sm text-rose-800 placeholder-rose-300 focus:outline-none focus:ring-0 focus:scale-[1.01] shadow-xl transition transform-gpu explore-search"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {/* Removed the arrow-like search button for a cleaner UI.
                                    Provide a more interactive clear button instead. */}
                                {query && (
                                    <button
                                        onMouseDown={(e) => { e.preventDefault(); /* prevent blur from input */ }}
                                        onClick={handleClearSearch}
                                        aria-label="Clear search"
                                        title="Clear search"
                                        className="h-8 w-8 rounded-full bg-white/80 hover:bg-rose-50 text-rose-700 flex items-center justify-center transition transform hover:scale-105 active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Suggestion dropdown - richer UI with thumbnails, highlighted matches & keyboard selection */}
                        {showSuggestions && (suggestionItems || []).length > 0 && (
                            <div className="absolute mt-2 w-full bg-white border border-rose-100 rounded-xl shadow-2xl z-30 overflow-hidden transform-gpu animate-fade-in search-suggestions">
                                <div className="px-4 py-2 bg-gradient-to-r from-pink-50 to-white/80 border-b border-rose-50 flex items-center justify-between">
                                    <div className="text-sm text-rose-600 font-medium">{String(query || '').trim().length > 0 ? 'Matches' : 'Recent searches'}</div>
                                    <div className="text-xs text-gray-400">{(suggestionItems || []).length} suggestions</div>
                                </div>
                                <div role="listbox" id="explore-suggestions" aria-label="Search suggestions" className="max-h-72 overflow-auto">
                                    {(suggestionItems || []).map((it, idx) => {
                                        const isActive = suggestionIndex === idx;
                                        return (
                                            <button
                                                key={`sugg-${idx}`}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    const s = it.text;
                                                    setQuery(s);
                                                    if (!searchActive) priorPageRef.current = pageRef.current || page;
                                                    setSearchActive(true);
                                                    search(s);
                                                    setShowSuggestions(false);
                                                    setSuggestionIndex(-1);
                                                }}
                                                onMouseEnter={() => setSuggestionIndex(idx)}
                                                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${isActive ? 'bg-rose-50' : 'hover:bg-rose-50'}`}
                                            >
                                                <div className="flex-shrink-0 h-10 w-10 rounded-md overflow-hidden bg-pink-50 border border-rose-100">
                                                    {it.thumb ? (
                                                        <img src={it.thumb} alt="thumb" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-rose-400">📚</div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-sm ${isActive ? 'text-rose-800 font-semibold' : 'text-rose-700'}`}>
                                                        {highlightText(it.text || '', query)}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">{it.thumb ? 'Book result' : 'Recent'}</div>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {isActive ? <svg className="h-5 w-5 text-rose-500" viewBox="0 0 20 20" fill="currentColor"><path d="M6.293 9.293a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"/></svg> : null}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mt-4 lg:mt-0 items-center">
                        <button
                            onClick={() => {
                                // If the user is actively searching, undo to the prior page; otherwise just clear the input
                                if (searchActive) handleUndoSearch(); else handleClearSearch();
                            }}
                            disabled={loading}
                            className="search-clear-pill"
                            aria-label="Clear search and restore defaults"
                        >
                            Clear search
                        </button>

                        <button onClick={refresh} disabled={loading} className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-4 py-2 rounded-full shadow-lg interactive-cta">{loading ? 'Loading...' : 'Refresh'}</button>
                        <div className="hidden lg:flex items-center gap-2">
                            <div className="sparkle" style={{animationDelay: '0s'}} />
                            <div className="sparkle" style={{animationDelay: '0.6s'}} />
                            <div className="sparkle" style={{animationDelay: '1.2s'}} />
                        </div>
                    </div>
                </div>
                {/* Genre filter dropdown */}
                <div className="mb-4 relative" ref={(el) => { /* keep block for layout */ }}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="sr-only">Filter by genre</div>
                            {isFiltering && (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-rose-500" />
                                    <span>Filtering…</span>
                                </div>
                            )}
                        </div>
                        <div>
                            {selectedGenres.length > 0 && (
                                <button onClick={() => { setSelectedGenres([]); search(query, null); }} className="text-sm text-rose-600 hover:underline">Clear filters</button>
                            )}
                        </div>
                    </div>

                    <GenreDropdown
                        available={allGenreOptions}
                        selected={selectedGenres}
                        onChange={(next) => {
                            // debounce genre selection to avoid firing many rapid requests
                            setSelectedGenres(next);
                            if (genreTimerRef.current) clearTimeout(genreTimerRef.current);
                            genreTimerRef.current = setTimeout(() => {
                                const filters = (next && next.length) ? { genres: next, genre: next.join(',') } : null;
                                // if we're currently rate-limited, wait a bit longer
                                if (isRateLimited) {
                                    setTimeout(() => search(query, filters), 1000);
                                } else {
                                    search(query, filters);
                                }
                            }, 350);
                        }}
                        isFiltering={isFiltering}
                    />

                    {/* Applied filter summary removed per user preference */}
                    {selectedGenres.length > 0 && (total === 0) && (
                        <div className="mt-2 text-sm text-red-600">No books found for the selected genre(s). Try clearing filters or check server logs.</div>
                    )}
                </div>

                                {/* Determine the single source of truth for displayed books:
                                        - When genres are selected, use the fetched `overrideBooks` array (response.data).
                                        - Do NOT fall back to the hook-provided `books` when a genre is selected. */}
                                {
                                    (() => {
                                        // Render search/filter results when active; prefer captured `overrideResults.items` if available.
                                        const searchModeActive = (selectedGenres && selectedGenres.length > 0) || searchActive;
                                        const displayedBooks = searchModeActive
                                            ? (overrideResults && Array.isArray(overrideResults.items) ? overrideResults.items : (typeof results !== 'undefined' ? results : books))
                                            : books;
                                        // Temporary debug logs to inspect why genre searches show a count but no cards
                                        console.log('Explore debug - books:', books);
                                        console.log('Explore debug - total:', total);
                                        console.log('Explore debug - selectedGenres:', selectedGenres);
                                        console.log('Explore debug - overrideResults:', overrideResults);
                                        console.log('Explore debug - results (hook):', typeof results !== 'undefined' ? results : '(no results field)');
                                        console.log('Explore debug - sample item:', (overrideResults && overrideResults.items && overrideResults.items[0]) || (Array.isArray(results) && results[0]) || (books && books[0]) || null);
                                        return (
                                                <div onClickCapture={handleBookLinkClick}>
                                                    <BookshelfGrid
                                                        books={displayedBooks}
                                                        onSave={(b, s) => { const storageKey = `vibeshelf-${s}`; const existing = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (!existing.some(x => x.id === b.id)) { existing.push(b); localStorage.setItem(storageKey, JSON.stringify(existing)); window.dispatchEvent(new Event('storage')); } }}
                                                        loading={loading}
                                                        className="mb-8"
                                                    />
                                                </div>
                                            );
                                    })()
                                }

                {/* Fetch diagnostics removed per UX preference */}

                {/* Bottom-only pagination controls */}
                <div className="explore-pagination">
                    <button
                        onClick={() => prevPage()}
                        disabled={loading || page <= 1}
                        className="nav-pill"
                        aria-label="Previous page"
                    >
                        ← Previous
                    </button>

                    <div className="page-info">
                        Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
                    </div>

                    <div className="page-list" aria-label="Page navigation">
                        {(() => {
                            // sliding window pagination
                            const pages = [];
                            const windowSize = 9; // number of numeric buttons to show (including edges when possible)
                            let start = Math.max(1, page - Math.floor(windowSize / 2));
                            let end = start + windowSize - 1;
                            if (end > totalPages) { end = totalPages; start = Math.max(1, end - windowSize + 1); }
                            if (start > 1) {
                                pages.push(1);
                                if (start > 2) pages.push('left-ellipsis');
                            }
                            for (let i = start; i <= end; i += 1) pages.push(i);
                            if (end < totalPages) {
                                if (end < totalPages - 1) pages.push('right-ellipsis');
                                pages.push(totalPages);
                            }
                            return pages.map((p, idx) => {
                                if (p === 'left-ellipsis' || p === 'right-ellipsis') return <div key={`ell-${idx}`} className="page-ellipsis">…</div>;
                                const isCurrent = p === page;
                                return (
                                    <button
                                        key={`pbtn-${p}`}
                                        onClick={() => goToPage(p)}
                                        disabled={loading || serverWarning}
                                        title={serverWarning ? 'Pagination disabled: server returning identical pages' : undefined}
                                        className={`page-btn ${isCurrent ? 'page-current' : ''}`}
                                        aria-current={isCurrent ? 'page' : undefined}
                                    >
                                        {p}
                                    </button>
                                );
                            });
                        })()}
                    </div>

                    <button
                        onClick={() => nextPage()}
                        disabled={loading || !hasMore || serverWarning}
                        className="nav-pill"
                        aria-label="Next page"
                    >
                        Next →
                    </button>
                </div>

                {/* footer note removed per design */}
            </div>
        </div>
    );
}

export default Explore;