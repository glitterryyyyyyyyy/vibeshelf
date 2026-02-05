// VirtualBookGrid deprecated — replaced by BookshelfGrid/OptimizedExplore.
import React from 'react';
import BookshelfGrid from './BookshelfGrid';

export default function VirtualBookGrid(props) {
  // Keep a thin shim so any imports don't break immediately. This intentionally
  // renders the regular BookshelfGrid for simplicity.
  console.warn('VirtualBookGrid is deprecated — rendering BookshelfGrid instead.');
  return <BookshelfGrid {...props} />;
}