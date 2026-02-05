# Save as vibe_recommender.py

import pickle
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import time

# --- Configuration ---
INDEX_FILE = "book_vibe_index.pkl"
MODEL_NAME = 'all-MiniLM-L6-v2'

# --- Main App Functions ---

def load_data(model_name, index_file):
    """Loads the AI model and the book vibe index."""
    print("Loading AI model...")
    model = SentenceTransformer(model_name)
    
    print(f"Loading book vibe index from {index_file}...")
    try:
        with open(index_file, 'rb') as f:
            index_data = pickle.load(f)
    except FileNotFoundError:
        print(f"❌ ERROR: {INDEX_FILE} not found. Did you run Day 2 (create_vibe_index.py) successfully?")
        return None, None, None

    return model, index_data['embeddings'], index_data['metadata']

def find_top_matches(user_phrase, model, embeddings, metadata, top_n=10):
    """Finds the top N matching book descriptions."""
    start_time = time.time()
    
    # 1. Create embedding for the user's phrase
    phrase_embedding = model.encode([user_phrase])[0]
    
    # 2. Calculate similarities
    similarities = cosine_similarity([phrase_embedding], embeddings)[0]
    
    # 3. Get the indices of the top N descriptions
    top_indices = np.argsort(similarities)[-top_n:][::-1] # Best first
    
    recommendations = []
    for idx in top_indices:
        recommendations.append({
            'title': metadata[idx]['title'],
            'author': metadata[idx]['author'],
            'description': metadata[idx]['description'],
            'score': similarities[idx]
        })
            
    end_time = time.time()
    print(f"(Search completed in {end_time - start_time:.2f} seconds)")
    return recommendations

# --- Main execution ---
if __name__ == "__main__":
    print("--- Day 3: AI Book Vibe Recommender ---")
    
    # 1. Load data ONCE at the start
    model, embeddings, metadata = load_data(MODEL_NAME, INDEX_FILE)
    
    if model:
        print("\n✅ Recommender is ready!")
        print("-" * 50)
        
        # 2. Main app loop
        while True:
            # 3. Ask to exit FIRST
            exit_choice = input("\nDo you want to exit the recommender? (yes/no): ")
            if exit_choice.lower().strip() == 'yes':
                break # This breaks the 'while True' loop and ends the program

            # 4. If 'no', ask how many books
            try:
                user_top_n = int(input("\nHow many recommendations would you like? (e.g., 5, 10, 20): "))
                if user_top_n <= 0:
                    user_top_n = 10
                    print("Invalid number, defaulting to 10.")
            except ValueError:
                user_top_n = 10 # Default to 10 if they type "ten" or "abc"
                print("Invalid input, defaulting to 10 recommendations.")
            
            # 5. Ask for the phrase
            user_query = input("\nYour phrase: ")
            
            if not user_query.strip():
                print("No phrase entered, please try again.")
                continue # This skips to the start of the loop (asks "exit?" again)
            
            # 6. Find and show matches
            recommendations_list = find_top_matches(user_query, model, embeddings, metadata, top_n=user_top_n)
            
            print(f"\n✨ Top {len(recommendations_list)} Vibe Matches For: '{user_query}' ✨")
            
            # --- THIS IS THE UPDATED PRINT LOOP ---
            for i, rec in enumerate(recommendations_list):
                # Format score as a percentage (e.g., "85%")
                score_percent = f"{rec['score']:.0%}"
                
                print(f"\n{i+1}. **{rec['title']}** by {rec['author']}")
                
                # This is the "WHY"
                print(f"   Reason: Its synopsis has a **{score_percent} vibe match** to your phrase.")
                print(f"   Synopsis: \"{rec['description'][:200]}...\"")
            # --- END OF UPDATED PART ---
                
            print("\n" + "-" * 50)

    # 7. This is where the program jumps to after breaking the loop
    print("\nGoodbye!")
    print("--- Day 3 Complete ---")