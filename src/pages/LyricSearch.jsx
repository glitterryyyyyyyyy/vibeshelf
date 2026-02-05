import React, { useState } from 'react';
// Link is kept here, but its usage for individual book details is commented out
// because the AI doesn't provide Google Books IDs.
// If you need to link to a detail page, you'd need to perform another search
// or adjust your detail page to work with title/author.
import { Link } from 'react-router-dom';

// Main LyricSearch component
const LyricSearch = () => {
    // State to hold the user's input lyric or phrase
    const [lyricInput, setLyricInput] = useState('');
    // State to store the books suggested by the AI
    const [suggestedBooks, setSuggestedBooks] = useState([]);
    // State to manage loading status during API calls
    const [isLoading, setIsLoading] = useState(false);
    // State to store and display any error messages
    const [error, setError] = useState(null);

    /**
     * Handles the search action when the button is clicked.
     * It constructs a prompt for the AI, calls the Gemini API,
     * and updates the state with the AI's book suggestions.
     */
    const handleSearch = async () => {
        // Clear any previous errors and suggestions
        setError(null);
        setSuggestedBooks([]);

        // Validate input: ensure the user has typed something
        if (!lyricInput.trim()) {
            setError("Please enter a lyric or phrase to search.");
            return;
        }

        setIsLoading(true); // Set loading state to true

        try {
            // Construct the detailed prompt for the large language model (LLM).
            // This prompt instructs the AI to understand the 'vibe' and return structured data.
            const prompt = `
                The user wants book suggestions based on the "vibe" or deeper meaning of a phrase, not just literal keywords.
                Analyze the emotional and thematic essence of the following phrase and suggest 10 books (title and author) that align with that vibe.
                For example, if the phrase is "you drew stars around my scars", the vibe is about healing from past hurt, betrayal, or finding beauty in pain.
                Provide the output as a JSON array of objects, where each object has 'title' and 'author' properties.

                Phrase: "${lyricInput}"
            `;

            // Prepare the chat history payload for the Gemini API.
            // This includes the user's prompt.
            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });

            // Define the payload for the API request, including the prompt
            // and the generation configuration for a structured JSON response.
            const payload = {
                contents: chatHistory,
                generationConfig: {
                    responseMimeType: "application/json", // Request JSON output
                    responseSchema: { // Define the schema for the expected JSON
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "title": { "type": "STRING" },
                                "author": { "type": "STRING" }
                            },
                            "propertyOrdering": ["title", "author"] // Ensure order
                        }
                    }
                }
            };

            // The API key is automatically provided by the Canvas environment.
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            // Make the API call to the Gemini model
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Check if the API response was successful
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();

            // Process the AI's response
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const jsonString = result.candidates[0].content.parts[0].text;
                const parsedBooks = JSON.parse(jsonString); // Parse the JSON string

                // Validate the parsed data against the expected structure
                if (Array.isArray(parsedBooks) && parsedBooks.every(book => book.title && book.author)) {
                    setSuggestedBooks(parsedBooks); // Update state with valid book suggestions
                } else {
                    // Handle cases where the AI's response format is unexpected
                    setError("Received an unexpected response format from the AI. Please try again.");
                    console.error("Unexpected AI response:", parsedBooks);
                }
            } else {
                // Handle cases where the AI did not return any candidates or content
                setError("No suggestions found. The AI might not have understood the vibe or could not generate books.");
                console.error("AI response structure unexpected:", result);
            }

        } catch (err) {
            // Catch and display any errors during the fetch operation
            console.error("Error fetching book suggestions:", err);
            setError(`Failed to fetch suggestions: ${err.message}. Please try again.`);
        } finally {
            setIsLoading(false); // Reset loading state
        }
    };

    return (
        // Main container for the component, with responsive styling
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 font-sans transition-colors">
            {/* Inner content box with styling for a card-like appearance */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-600">
                {/* Component Title */}
                <h1 className="text-4xl font-extrabold text-center text-rose-800 dark:text-rose-300 mb-6">
                    Book Vibe Search 📚
                </h1>
                {/* Subtitle/description */}
                <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
                    Enter a lyric or phrase, and I'll suggest books that match its deeper meaning and "vibe."
                </p>

                {/* Input field and Search button */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        value={lyricInput}
                        onChange={(e) => setLyricInput(e.target.value)}
                        placeholder="e.g., 'you drew stars around my scars' or 'whispers in the ancient woods'"
                        className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-rose-500 dark:focus:ring-rose-400 focus:border-transparent transition duration-200 text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                        aria-label="Enter lyric or phrase"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={isLoading} // Disable button while loading
                        className={`px-6 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out
                            ${isLoading ? 'bg-rose-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-lg'}
                        `}
                    >
                        {isLoading ? 'Searching...' : 'Search Vibe'}
                    </button>
                </div>

                {/* Error message display */}
                {error && (
                    <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-6" role="alert">
                        <strong className="font-bold">Error:</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                {/* Display suggested books if available */}
                {suggestedBooks.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-rose-700 dark:text-rose-300 mb-4 text-center">Suggested Books:</h2>
                        <ul className="space-y-4">
                            {suggestedBooks.map((book, index) => (
                                // Each suggested book is rendered as a list item.
                                // Note: The AI provides only title and author, not a unique ID
                                // suitable for linking to a specific book detail page from an external API (like Google Books).
                                // If linking is required, an additional search step would be needed.
                                <li key={index} className="bg-rose-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-rose-200 dark:border-gray-600 flex items-center space-x-4">
                                    <span className="text-rose-600 dark:text-rose-400 text-lg font-bold">{index + 1}.</span>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{book.title}</p>
                                        <p className="text-gray-700 dark:text-gray-300 text-sm">by {book.author}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Message when no suggestions are present and not loading/errored */}
                {suggestedBooks.length === 0 && !isLoading && !error && (
                    <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                        Your book suggestions will appear here after you search.
                    </p>
                )}
            </div>
        </div>
    );
};

export default LyricSearch;
