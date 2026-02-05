import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import cacheManager from '../utils/CacheManager';
import { searchRequestBatcher } from '../utils/RequestBatcher';
import { useDebounce } from './useDebounce';

const BACKEND_URL = 'http://localhost:8080';

// Search index for client-side searching
class SearchIndex {
  constructor() {
    this.index = new Map();
    this.wordIndex = new Map();
    this.initialized = false;
  }

  // Build search index from books data
  buildIndex(books) {
    this.index.clear();
    this.wordIndex.clear();

    books.forEach(book => {
      const searchableText = this.createSearchableText(book);
      const words = this.tokenize(searchableText);
      
      // Store full text for each book
      this.index.set(book.id, {
        book,
        searchableText: searchableText.toLowerCase(),
        words: words
      });

      // Build word index for faster lookups
      words.forEach(word => {
        if (!this.wordIndex.has(word)) {
          this.wordIndex.set(word, new Set());
        }
        this.wordIndex.get(word).add(book.id);
      });
    });

    this.initialized = true;
    console.log(`Search index built with ${books.length} books`);
  }

  // Create searchable text from book data
  createSearchableText(book) {
    const title = book.title || book['Book-Title'] || '';
    const author = book.author || book['Book-Author'] || '';
    const description = book.description || book['Book-Description'] || '';
    const genre = book.genre || '';
    
    return `${title} ${author} ${description} ${genre}`.trim();
  }

  // Tokenize text into searchable words
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/)
      .filter(word => word.length > 1); // Filter out single characters
  }

  // Search with scoring
  search(query, options = {}) {
    if (!this.initialized || !query.trim()) {
      return [];
    }

    const {
      limit = 50,
      fuzzyMatch = true,
      exactMatchBoost = 2,
      titleBoost = 1.5,
      authorBoost = 1.3
    } = options;

    const queryWords = this.tokenize(query);
    const scores = new Map();

    // Find books that match any query word
    const candidateIds = new Set();
    
    queryWords.forEach(word => {
      // Exact matches
      if (this.wordIndex.has(word)) {
        this.wordIndex.get(word).forEach(id => candidateIds.add(id));
      }
      
      // Fuzzy matches if enabled
      if (fuzzyMatch) {
        this.wordIndex.forEach((bookIds, indexWord) => {
          if (this.isFuzzyMatch(word, indexWord)) {
            bookIds.forEach(id => candidateIds.add(id));
          }
        });
      }
    });

    // Score each candidate
    candidateIds.forEach(bookId => {
      const bookData = this.index.get(bookId);
      if (!bookData) return;

      let score = 0;
      const { book, searchableText } = bookData;

      queryWords.forEach(word => {
        // Exact word matches
        const exactMatches = (searchableText.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
        score += exactMatches * exactMatchBoost;

        // Partial matches
        const partialMatches = (searchableText.match(new RegExp(word, 'gi')) || []).length;
        score += partialMatches;

        // Title boost
        const title = (book.title || book['Book-Title'] || '').toLowerCase();
        if (title.includes(word)) {
          score += titleBoost;
        }

        // Author boost
        const author = (book.author || book['Book-Author'] || '').toLowerCase();
        if (author.includes(word)) {
          score += authorBoost;
        }
      });

      // Bonus for matching multiple words
      const matchedWords = queryWords.filter(word => 
        searchableText.includes(word)
      ).length;
      score += (matchedWords / queryWords.length) * 2;

      if (score > 0) {
        scores.set(bookId, { book, score });
      }
    });

    // Sort by score and return results
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.book);
  }

  // Simple fuzzy matching
  isFuzzyMatch(query, target, maxDistance = 2) {
    if (Math.abs(query.length - target.length) > maxDistance) {
      return false;
    }
    
    // Levenshtein distance calculation
    const matrix = Array(query.length + 1).fill().map(() => Array(target.length + 1).fill(0));
    
    for (let i = 0; i <= query.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= target.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= query.length; i++) {
      for (let j = 1; j <= target.length; j++) {
        const cost = query[i - 1] === target[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    return matrix[query.length][target.length] <= maxDistance;
  }

  // Get statistics
  getStats() {
    return {
      totalBooks: this.index.size,
      totalWords: this.wordIndex.size,
      initialized: this.initialized
    };
  }
}

// Create singleton search index
const searchIndex = new SearchIndex();

// Hook for smart search with client-side indexing
export const useSmartSearch = (initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('none'); // 'local', 'server', 'cache'
  const [error, setError] = useState(null);
  
  const debouncedQuery = useDebounce(query, 300);
  const searchHistoryRef = useRef(new Map());

  // Initialize search index with cached books
  useEffect(() => {
    const initializeIndex = () => {
      // Try to get all cached books
      const allCachedBooks = [];
      
      // Get books from all cached pages
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vibeshelf-books-page-')) {
          try {
            const cached = localStorage.getItem(key);
            const parsed = JSON.parse(cached);
            if (parsed.data && Array.isArray(parsed.data)) {
              allCachedBooks.push(...parsed.data);
            }
          } catch (error) {
            console.warn('Failed to parse cached books:', error);
          }
        }
      }

      if (allCachedBooks.length > 0) {
        // Remove duplicates by ID
        const uniqueBooks = allCachedBooks.reduce((acc, book) => {
          if (!acc.find(b => b.id === book.id)) {
            acc.push(book);
          }
          return acc;
        }, []);

        searchIndex.buildIndex(uniqueBooks);
        console.log(`Search index initialized with ${uniqueBooks.length} cached books`);
      }
    };

    initializeIndex();
  }, []);

  // Search function
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSource('none');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check search history cache first
      const cacheKey = searchQuery.toLowerCase().trim();
      if (searchHistoryRef.current.has(cacheKey)) {
        const cachedResult = searchHistoryRef.current.get(cacheKey);
        setResults(cachedResult.results);
        setSource('cache');
        setLoading(false);
        return;
      }

      // Try local search first if index is ready
      if (searchIndex.initialized) {
        const localResults = searchIndex.search(searchQuery, {
          limit: 20,
          fuzzyMatch: true
        });

        if (localResults.length > 0) {
          setResults(localResults);
          setSource('local');
          setLoading(false);
          
          // Cache the result
          searchHistoryRef.current.set(cacheKey, {
            results: localResults,
            timestamp: Date.now(),
            source: 'local'
          });
          
          return;
        }
      }

      // Fallback to server search
      const serverResults = await searchOnServer(searchQuery);
      setResults(serverResults);
      setSource('server');
      
      // Cache server results
      searchHistoryRef.current.set(cacheKey, {
        results: serverResults,
        timestamp: Date.now(),
        source: 'server'
      });

    } catch (searchError) {
      console.error('Search error:', searchError);
      setError(searchError);
      
      // Try to get any cached result as fallback
      const cacheKey = searchQuery.toLowerCase().trim();
      if (searchHistoryRef.current.has(cacheKey)) {
        const cachedResult = searchHistoryRef.current.get(cacheKey);
        setResults(cachedResult.results);
        setSource('cache-fallback');
      } else {
        setResults([]);
        setSource('error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Server search function
  const searchOnServer = async (searchQuery) => {
    const cachedSearch = cacheManager.get('search', searchQuery);
    if (cachedSearch) {
      return cachedSearch;
    }

    const response = await searchRequestBatcher.addRequest(
      () => axios.get(`${BACKEND_URL}/api/books/search`, {
        params: { q: searchQuery, limit: 20 }
      }),
      { priority: 'normal' }
    );

    const results = response.data.books || response.data;
    
    // Cache the search results
    cacheManager.set('search', searchQuery, '', results);
    
    return results;
  };

  // Update search index when new books are loaded
  const updateSearchIndex = useCallback((newBooks) => {
    if (Array.isArray(newBooks) && newBooks.length > 0) {
      // Get current indexed books
      const currentBooks = [];
      searchIndex.index.forEach(({ book }) => currentBooks.push(book));
      
      // Merge with new books (remove duplicates)
      const allBooks = [...currentBooks];
      newBooks.forEach(newBook => {
        if (!allBooks.find(book => book.id === newBook.id)) {
          allBooks.push(newBook);
        }
      });
      
      // Rebuild index
      searchIndex.buildIndex(allBooks);
    }
  }, []);

  // Clear search history
  const clearSearchHistory = useCallback(() => {
    searchHistoryRef.current.clear();
    cacheManager.clearType('search');
  }, []);

  // Effect to perform search when query changes
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Get search suggestions
  const getSuggestions = useCallback((partialQuery) => {
    if (!searchIndex.initialized || partialQuery.length < 2) {
      return [];
    }

    const suggestions = new Set();
    const queryLower = partialQuery.toLowerCase();

    // Find words that start with the query
    searchIndex.wordIndex.forEach((bookIds, word) => {
      if (word.startsWith(queryLower) && word !== queryLower) {
        suggestions.add(word);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    source,
    error,
    updateSearchIndex,
    clearSearchHistory,
    getSuggestions,
    searchStats: searchIndex.getStats()
  };
};

export default useSmartSearch;