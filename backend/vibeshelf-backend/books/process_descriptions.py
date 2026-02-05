# Save as process_descriptions.py

import pandas as pd
import json
import os

# --- Configuration ---
# Make sure this CSV file is in your BookRecommender folder
CSV_FILE_PATH = r'C:\Users\HP\BookRecommender\books\books_1.Best_Books_Ever.csv'
OUTPUT_JSON = 'book_descriptions.json'

# --- Main execution ---
if __name__ == "__main__":
    print("--- Day 1: Starting Book Description Processing ---")
    
    book_database = []

    if not os.path.exists(CSV_FILE_PATH):
        print(f"❌ ERROR: File not found: {CSV_FILE_PATH}")
        print("Please make sure 'books_1.Best_Books_Ever.csv' is in the same folder as this script.")
        exit()

    try:
        print(f"Reading {CSV_FILE_PATH}...")
        # This CSV is complex. We'll specify the encoding and use 'on_bad_lines'
        # to skip any broken rows.
        df = pd.read_csv(CSV_FILE_PATH, encoding='utf-8', on_bad_lines='skip')

        # Check for the columns we need
        if 'title' not in df.columns or 'author' not in df.columns or 'description' not in df.columns:
            print("❌ ERROR: CSV file must have 'title', 'author', and 'description' columns.")
            exit()
            
        # Get just the columns we need and drop any rows with missing data
        df_clean = df[['title', 'author', 'description']].dropna()
        
        # Convert to a list of dictionaries
        book_database = df_clean.to_dict('records')
                
        if book_database:
            # Save the extracted data to a JSON file
            with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
                json.dump(book_database, f, indent=2)
                
            print(f"\n✅ Success! Extracted {len(book_database)} book descriptions.")
            print(f"All data saved to {OUTPUT_JSON}")
        else:
            print("\n❌ Error: No book data was processed from the CSV.")

    except Exception as e:
        print(f"An unexpected error occurred: {e}")

    print("--- Day 1 Complete ---")