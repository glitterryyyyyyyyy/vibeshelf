/**
 * Smart Search Hook for VibeShelf
 * Provides intelligent search with debouncing, caching, and result optimization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import useOptimizedFetching from './useOptimizedFetching';
import cacheManager from '../utils/CacheManager';

const useSmartSearch = (options = {}) => {
    const {
        endpoint = '/api/books/search',
        debounceMs = 300,
        minQueryLength = 2,
        maxResults = 100,
        enableCache = true,
        enableFuzzySearch = true,
        searchFields = ['title', 'author', 'genre', 'description'],
        sortBy = 'relevance',
        filters = {}
    } = options;

    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [searchHistory, setSearchHistory] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, debounceMs]);

    // Search parameters
    const searchParams = useMemo(() => {
        if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
            return null;
        }

        return {
            q: debouncedQuery,
            limit: maxResults,
            sort: sortBy,
            fields: searchFields.join(','),
            ...filters
        };
    }, [debouncedQuery, maxResults, sortBy, searchFields, filters, minQueryLength]);

    // Optimized fetching hook for search results
    const {
        data: searchResults,
        loading: searchLoading,
        error: searchError,
        execute: executeSearch,
        clearCache: clearSearchCache
    } = useOptimizedFetching(endpoint, {
        params: searchParams,
        enableCache,
        cacheTTL: 10 * 60 * 1000, // 10 minutes for search results
        immediate: false,
        transform: (data) => {
            // Enhance search results with relevance scoring
            if (data?.data) {
                return {
                    ...data,
                    data: data.data.map(item => ({
                        ...item,
                        relevanceScore: calculateRelevanceScore(item, debouncedQuery, searchFields)
                    }))
                };
            }
            return data;
        }
    });

    // Suggestions fetching
    const {
        data: suggestionsData,
        execute: executeSuggestions
    } = useOptimizedFetching('/api/books/autocomplete', {
        enableCache: true,
        cacheTTL: 30 * 60 * 1000, // 30 minutes for suggestions
        immediate: false
    });

    /**
     * Calculate relevance score for search results
     */
    const calculateRelevanceScore = (item, searchQuery, fields) => {
        if (!searchQuery) return 0;

        const queryLower = searchQuery.toLowerCase();
        let score = 0;
        let maxScore = 0;

        fields.forEach((field, index) => {
            const fieldValue = item[field]?.toString().toLowerCase() || '';
            const fieldWeight = fields.length - index; // Earlier fields have higher weight
            
            maxScore += fieldWeight * 10;

            if (fieldValue.includes(queryLower)) {
                // Exact match gets full points
                if (fieldValue === queryLower) {
                    score += fieldWeight * 10;
                }
                // Starts with query gets high points
                else if (fieldValue.startsWith(queryLower)) {
                    score += fieldWeight * 8;
                }
                // Contains query gets medium points
                else {
                    score += fieldWeight * 5;
                }

                // Bonus for word boundaries
                const words = queryLower.split(' ');
                words.forEach(word => {
                    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
                    if (wordRegex.test(fieldValue)) {
                        score += fieldWeight * 2;
                        maxScore += fieldWeight * 2;
                    }
                });
            }

            // Fuzzy matching for typos
            if (enableFuzzySearch && !fieldValue.includes(queryLower)) {
                const fuzzyScore = calculateFuzzyScore(fieldValue, queryLower);
                if (fuzzyScore > 0.7) {
                    score += fieldWeight * 3;
                    maxScore += fieldWeight * 3;
                }
            }
        });

        return maxScore > 0 ? (score / maxScore) * 100 : 0;
    };

    /**
     * Simple fuzzy matching score
     */
    const calculateFuzzyScore = (str1, str2) => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = calculateEditDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    };

    /**
     * Calculate edit distance (Levenshtein distance)
     */
    const calculateEditDistance = (str1, str2) => {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    };

    /**
     * Perform search
     */
    const search = useCallback(async (searchQuery = debouncedQuery) => {
        if (!searchQuery || searchQuery.length < minQueryLength) {
            return null;
        }

        setIsSearching(true);

        try {
            const result = await executeSearch();
            
            // Add to search history
            if (result && !searchHistory.includes(searchQuery)) {
                setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]); // Keep last 10 searches
            }

            return result;
        } finally {
            setIsSearching(false);
        }
    }, [debouncedQuery, executeSearch, searchHistory, minQueryLength]);

    /**
     * Get search suggestions
     */
    const getSuggestions = useCallback(async (suggestionQuery = query) => {
        if (!suggestionQuery || suggestionQuery.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            await executeSuggestions();
            
            if (suggestionsData?.data) {
                const filtered = suggestionsData.data
                    .filter(suggestion => 
                        suggestion.toLowerCase().includes(suggestionQuery.toLowerCase())
                    )
                    .slice(0, 10);
                    
                setSuggestions(filtered);
            }
        } catch (error) {
            console.warn('Failed to fetch suggestions:', error);
            setSuggestions([]);
        }
    }, [query, executeSuggestions, suggestionsData]);

    /**
     * Clear search results and cache
     */
    const clearSearch = useCallback(() => {
        setQuery('');
        setDebouncedQuery('');
        setSuggestions([]);
        clearSearchCache();
    }, [clearSearchCache]);

    /**
     * Clear search history
     */
    const clearHistory = useCallback(() => {
        setSearchHistory([]);
    }, []);

    // Execute search when debounced query changes
    useEffect(() => {
        if (debouncedQuery && debouncedQuery.length >= minQueryLength) {
            search();
        }
    }, [debouncedQuery, minQueryLength, search]);

    // Get suggestions when query changes
    useEffect(() => {
        if (query && query.length >= 2) {
            const timer = setTimeout(() => {
                getSuggestions();
            }, 150); // Faster debounce for suggestions

            return () => clearTimeout(timer);
        } else {
            setSuggestions([]);
        }
    }, [query, getSuggestions]);

    // Memoized results with sorting
    const sortedResults = useMemo(() => {
        if (!searchResults?.data) return [];

        let results = [...searchResults.data];

        switch (sortBy) {
            case 'relevance':
                results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
                break;
            case 'rating':
                results.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
                break;
            case 'year':
                results.sort((a, b) => (b.publishedYear || 0) - (a.publishedYear || 0));
                break;
            case 'title':
                results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            default:
                break;
        }

        return results;
    }, [searchResults, sortBy]);

    return {
        // State
        query,
        results: sortedResults,
        suggestions,
        searchHistory,
        
        // Loading states
        loading: searchLoading || isSearching,
        error: searchError,
        
        // Actions
        setQuery,
        search,
        getSuggestions,
        clearSearch,
        clearHistory,
        
        // Metadata
        hasResults: sortedResults.length > 0,
        resultCount: sortedResults.length,
        totalResults: searchResults?.pagination?.total || 0,
        searchTime: searchResults?.meta?.processingTime || 0
    };
};

export default useSmartSearch;