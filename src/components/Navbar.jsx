import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Navbar() {
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchText.trim() !== '') {
      navigate(`/explore?query=${encodeURIComponent(searchText)}`);
      setSearchText('');
    }
  };

  return (
    <nav className="px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0 shadow-md"
         style={{
           background: 'linear-gradient(90deg, #ffeef2 0%, #ffd6e6 12%, #ffb3d1 30%, #ff8fb8 50%, #ff5c93 72%, #e83b6f 88%, #c2185b 100%)'
         }}
    >
      <Link to="/" className="text-2xl font-extrabold text-white">
        VibeShelf
      </Link>

      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search by mood, genre, or lyric..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="px-4 py-2 rounded-full border border-rose-200 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm w-64 bg-white text-rose-800 placeholder-rose-300 shadow-sm"
        />
        <button
          type="submit"
          className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-full transition shadow-md"
        >
          Search
        </button>
      </form>

      <ul className="flex gap-6 text-white font-medium ml-2 sm:ml-8">
        <li><Link to="/" className="hover:underline">Home</Link></li>
        <li><Link to="/explore" className="hover:underline">Explore</Link></li>
        <li><Link to="/myshelf" className="hover:underline">My Shelf</Link></li>
        <li><a href="#" className="hover:underline">My Shelves</a></li> {/* Placeholder for future feature */}
        <li>
          <Link
            to="/lyrics"
            className="text-white/90 hover:text-white font-medium px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition shadow-sm border border-white/20"
          >
            Lyric Search
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
