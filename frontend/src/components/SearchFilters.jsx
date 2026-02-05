// src/components/SearchFilters.jsx
import React, { useState } from 'react';

const SearchFilters = ({ onFilterChange, filters, onClearFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const genres = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Fantasy', 'Science Fiction',
    'Thriller', 'Biography', 'History', 'Self-Help', 'Horror', 'Adventure'
  ];

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'author', label: 'Author A-Z' },
    { value: 'year_desc', label: 'Newest First' },
    { value: 'year_asc', label: 'Oldest First' },
    { value: 'rating_desc', label: 'Highest Rated' }
  ];

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 transition-colors">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left font-semibold text-gray-800 dark:text-gray-200 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"></path>
          </svg>
          Advanced Filters
        </span>
        <svg
          className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Genre Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Genre
            </label>
            <select
              value={filters.genre || ''}
              onChange={(e) => handleFilterChange('genre', e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-500"
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {/* Author Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author
            </label>
            <input
              type="text"
              placeholder="Enter author name"
              value={filters.author || ''}
              onChange={(e) => handleFilterChange('author', e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-500"
            />
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Publication Year
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="From"
                min="1800"
                max={new Date().getFullYear()}
                value={filters.yearFrom || ''}
                onChange={(e) => handleFilterChange('yearFrom', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-500"
              />
              <input
                type="number"
                placeholder="To"
                min="1800"
                max={new Date().getFullYear()}
                value={filters.yearTo || ''}
                onChange={(e) => handleFilterChange('yearTo', e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={filters.sortBy || 'relevance'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-300 dark:focus:ring-rose-500"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isExpanded && (Object.keys(filters).some(key => filters[key] && key !== 'sortBy') || filters.sortBy !== 'relevance') && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;