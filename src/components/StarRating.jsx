// src/components/StarRating.jsx
import React, { useState, memo } from 'react';

const StarRating = memo(({ 
  rating = 0, 
  onRate = null, 
  readonly = false, 
  size = 'medium',
  showText = true 
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6'
  };
  
  const sizeClass = sizes[size] || sizes.medium;
  
  const handleMouseEnter = (star) => {
    if (!readonly && onRate) {
      setHoverRating(star);
    }
  };
  
  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };
  
  const handleClick = (star) => {
    if (!readonly && onRate) {
      onRate(star);
    }
  };
  
  const displayRating = hoverRating || rating;
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} 
                       transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-300 rounded`}
          >
            <svg 
              className={`${sizeClass} ${
                star <= displayRating 
                  ? 'text-yellow-400 fill-current' 
                  : 'text-gray-300 dark:text-gray-600'
              }`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        ))}
      </div>
      
      {showText && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {rating > 0 ? `${rating}/5` : 'Not rated'}
        </span>
      )}
      
      {!readonly && hoverRating > 0 && (
        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
          ({hoverRating} star{hoverRating !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
});

export default StarRating;