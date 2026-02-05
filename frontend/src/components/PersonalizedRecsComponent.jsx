import React, { useState } from "react";
import { Link } from "react-router-dom";
import useRecommendations from "../hooks/useRecommendations";
import LazyImage from "./LazyImage";

const PersonalizedRecsComponent = () => {
  const [title, setTitle] = useState("");
  const { recommend, results, loading, error, reset } = useRecommendations();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await recommend(title);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-95 rounded-3xl shadow-xl p-8 relative overflow-hidden ring-4 ring-rose-100 dark:ring-gray-700">
      
      {/* COMING SOON RIBBON */}
      <div className="absolute top-8 -right-12 bg-yellow-400 text-yellow-900 font-black px-12 py-2 transform rotate-45 shadow-lg z-10 text-sm tracking-widest border-2 border-white dark:border-gray-800">
        COMING SOON
      </div>

      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold text-rose-800 dark:text-rose-300 mb-2">
          📚 AI Book Recommender
        </h1>
        <div className="inline-block bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-4 py-1.5 rounded-full text-sm font-bold border border-yellow-300 dark:border-yellow-700 mt-2 shadow-sm">
          ⚠️ IMPLEMENTATION IN PROGRESS
        </div>
      </div>

      <p className="text-center text-gray-500 dark:text-gray-400 mb-8 italic">
        (This feature is currently under development. Results may vary.)
      </p>

      <div className="opacity-50 pointer-events-none filter blur-[1px] select-none">
      {/* Content blurred/disabled to emphasize "Coming Soon" */}
      <p className="hidden">Enter a book title you like — we’ll recommend similar books.</p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The Alchemist"
          className="w-full sm:w-2/3 p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out ${
            loading ? "bg-rose-400" : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          {loading ? "Finding..." : "Get Recommendations"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-3 rounded-lg font-semibold text-rose-600 dark:text-rose-400 border border-rose-600 dark:border-rose-400 bg-transparent hover:bg-rose-50 dark:hover:bg-gray-700 transition duration-300 ease-in-out"
        >
          Clear
        </button>
      </form>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm mb-6 text-center">
          {error}
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Enter a title above to get AI-powered book suggestions.
        </p>
      )}

      {loading && (
        <p className="text-center text-rose-600 dark:text-rose-300">
          Generating recommendations...
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-6">
          {results.map((book, index) => (
            <Link
              key={book.id ?? index}
              to={`/book/${encodeURIComponent(book.id ?? book.title)}`}
              state={{ book }}
              className="bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-90 border border-rose-200 dark:border-gray-600 rounded-2xl p-5 shadow-sm hover:shadow-pink-300 dark:hover:shadow-gray-700 transition flex flex-col items-center text-left relative"
            >
              <div className="bg-rose-100 dark:bg-gray-700 p-2 rounded-xl border border-rose-300 dark:border-gray-600 mb-4 w-full">
                <LazyImage
                  src={
                    book.coverImageUrl ||
                    "https://placehold.co/128x192/F0D9E6/8B5F6C?text=Book"
                  }
                  alt={book.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              <h2 className="text-lg font-bold text-rose-700 dark:text-rose-300 font-serif mb-1 text-center">
                {book.title}
              </h2>
              <p className="text-sm italic text-rose-500 dark:text-rose-400 mb-2 text-center">
                by {book.author || "Unknown"}
              </p>
              {book.reason && (
                <p className="text-xs text-gray-700 dark:text-gray-300 text-center">
                  <strong>Reason:</strong> {book.reason}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
      </div> {/* End opacity wrapper */}
    </div>
  );
};

export default PersonalizedRecsComponent;
