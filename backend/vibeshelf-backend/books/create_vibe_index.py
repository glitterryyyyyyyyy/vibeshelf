# Save as create_vibe_index.py

import json
import os
import pickle
from sentence_transformers import SentenceTransformer
import time
import numpy as np
import requests
import urllib.parse

# --- Configuration ---
INPUT_JSON = "book_descriptions.json"
OUTPUT_INDEX_FILE = "book_vibe_index.pkl"
MODEL_NAME = 'all-MiniLM-L6-v2'

# --- Main execution ---
if __name__ == "__main__":
    print("--- Day 2: Starting AI Vibe Indexing ---")
    
    # 1. Load the extracted book description data
    try:
        with open(INPUT_JSON, 'r', encoding='utf-8') as f:
            book_database = json.load(f)
    except FileNotFoundError:
        print(f"❌ ERROR: {INPUT_JSON} not found. Did you run Day 1 (process_descriptions.py) successfully?")
        exit()

    print(f"Loaded {len(book_database)} book descriptions.")

    # 2. Load the AI Model
    print(f"Loading AI model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    print("Model loaded.")

    # 3. Get all descriptions for embedding
    # Allow a SAMPLE_LIMIT env var for quick runs (e.g. SAMPLE_LIMIT=200)
    SAMPLE_LIMIT = int(os.getenv('SAMPLE_LIMIT') or 0)
    if SAMPLE_LIMIT and SAMPLE_LIMIT > 0:
        book_database = book_database[:SAMPLE_LIMIT]
    texts_to_embed = [item.get('description', '') for item in book_database]
    
    # 4. Generate Embeddings (This is the AI 'reading' part)
    print("Generating embeddings for all descriptions. This may take a moment...")
    
    start_time = time.time()
    embeddings = model.encode(texts_to_embed, show_progress_bar=True, batch_size=32)
    end_time = time.time()
    
    print(f"Embeddings generated in {end_time - start_time:.2f} seconds.")

    # 5. Build the final index structure
    # 5. Enrich metadata with cover_url where possible (try existing keys, then prefer ISBN lookups)
    cover_cache = {}

    def _normalize(s):
        if not s:
            return ""
        return ''.join(ch.lower() for ch in s if ch.isalnum() or ch.isspace()).strip()

    def try_openlibrary_by_isbn(isbn):
        # OpenLibrary cover by ISBN is reliable if the ISBN exists in their database
        if not isbn:
            return None
        url = f"https://covers.openlibrary.org/b/isbn/{urllib.parse.quote(isbn)}-L.jpg"
        return url

    def try_googlebooks_by_isbn(isbn):
        if not isbn:
            return None
        try:
            q = f"isbn:{isbn}"
            gb_url = f"https://www.googleapis.com/books/v1/volumes?q={urllib.parse.quote(q)}&maxResults=1"
            r = requests.get(gb_url, timeout=5)
            if r.status_code == 200:
                js = r.json()
                items = js.get('items') or []
                if items:
                    vol = items[0].get('volumeInfo', {})
                    img = vol.get('imageLinks') or {}
                    for k in ("extraLarge", "large", "medium", "thumbnail", "smallThumbnail"):
                        if isinstance(img.get(k), str):
                            return img.get(k).replace('http://', 'https://')
        except Exception:
            pass
        return None

    def try_openlibrary_search(title, author):
        # Use OpenLibrary search.json for title+author fallback
        if not title:
            return None
        try:
            params = []
            params.append(('title', title))
            if author:
                params.append(('author', author))
            url = 'https://openlibrary.org/search.json?' + urllib.parse.urlencode(params)
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                js = r.json()
                docs = js.get('docs') or []
                if docs:
                    # prefer docs that have cover_i and match title reasonably well
                    norm_title = _normalize(title)
                    for doc in docs:
                        cover_i = doc.get('cover_i')
                        doc_title = _normalize(doc.get('title'))
                        if cover_i and (norm_title == doc_title or norm_title in doc_title or doc_title in norm_title):
                            return f"https://covers.openlibrary.org/b/id/{cover_i}-L.jpg"
                    # fallback to first cover_i
                    for doc in docs:
                        if doc.get('cover_i'):
                            return f"https://covers.openlibrary.org/b/id/{doc.get('cover_i')}-L.jpg"
        except Exception:
            pass
        return None

    def try_googlebooks_by_title(title, author):
        if not title:
            return None
        try:
            q = f"intitle:{title}"
            if author:
                q += f"+inauthor:{author}"
            gb_url = f"https://www.googleapis.com/books/v1/volumes?q={urllib.parse.quote(q)}&maxResults=5"
            r = requests.get(gb_url, timeout=5)
            if r.status_code == 200:
                js = r.json()
                items = js.get('items') or []
                norm_title = _normalize(title)
                norm_author = _normalize(author)
                # pick best matching item by title/author similarity
                for item in items:
                    vol = item.get('volumeInfo', {})
                    vol_title = _normalize(vol.get('title'))
                    vol_authors = ' '.join(vol.get('authors') or [])
                    vol_authors_norm = _normalize(vol_authors)
                    # strong match if titles overlap and at least one author token overlaps (if we have author)
                    title_match = norm_title == vol_title or norm_title in vol_title or vol_title in norm_title
                    author_match = (not norm_author) or (any(tok in vol_authors_norm for tok in norm_author.split()))
                    if title_match and author_match:
                        img = vol.get('imageLinks') or {}
                        for k in ("extraLarge", "large", "medium", "thumbnail", "smallThumbnail"):
                            if isinstance(img.get(k), str):
                                return img.get(k).replace('http://', 'https://')
                        # try industry identifiers if present
                        for idobj in vol.get('industryIdentifiers') or []:
                            if isinstance(idobj, dict) and idobj.get('type', '').startswith('ISBN'):
                                isbn = idobj.get('identifier')
                                if isbn:
                                    return try_openlibrary_by_isbn(isbn)
                # last-chance: return first available imageLinks on any item
                for item in items:
                    vol = item.get('volumeInfo', {})
                    img = vol.get('imageLinks') or {}
                    for k in ("extraLarge", "large", "medium", "thumbnail", "smallThumbnail"):
                        if isinstance(img.get(k), str):
                            return img.get(k).replace('http://', 'https://')
        except Exception:
            pass
        return None

    def find_cover_for_record(rec, idx=None, throttle_every=30):
        # prefer existing keys
        for key in ("cover_url", "cover", "imageUrl", "image", "thumbnail", "coverUrl"):
            if key in rec and isinstance(rec[key], str) and rec[key].strip():
                return rec[key]

        # build a cache key preferring ISBN, else title|author
        isbn_candidates = []
        # common field names for isbn
        for k in ('isbn', 'isbn13', 'isbn10'):
            v = rec.get(k)
            if v:
                if isinstance(v, list):
                    isbn_candidates.extend([str(x) for x in v if x])
                else:
                    isbn_candidates.append(str(v))
        # sometimes stored as identifiers list
        for idobj in rec.get('industryIdentifiers') or rec.get('identifiers') or []:
            try:
                if isinstance(idobj, dict) and idobj.get('type', '').upper().startswith('ISBN'):
                    isbn_candidates.append(str(idobj.get('identifier')))
            except Exception:
                pass

        title = rec.get('title', '')
        author = rec.get('author', '')
        cache_key = None
        if isbn_candidates:
            cache_key = ('isbn', isbn_candidates[0])
        else:
            cache_key = ('title', _normalize(title), _normalize(author))

        if cache_key in cover_cache:
            return cover_cache[cache_key]

        # Try ISBN-based lookups first (most reliable)
        cover = None
        if isbn_candidates:
            for isbn in isbn_candidates:
                isbn = isbn.replace('-', '').strip()
                if not isbn:
                    continue
                # Google Books by ISBN (prefers official covers)
                cover = try_googlebooks_by_isbn(isbn)
                if cover:
                    cover_cache[cache_key] = cover
                    return cover
                # OpenLibrary by ISBN
                cover = try_openlibrary_by_isbn(isbn)
                if cover:
                    cover_cache[cache_key] = cover
                    return cover

        # Throttle a tiny bit to avoid hammering services on large runs
        try:
            if idx and throttle_every and (idx % throttle_every == 0):
                time.sleep(0.12)
        except Exception:
            pass

        # No ISBN or no hit: try Google Books title search with verification
        cover = try_googlebooks_by_title(title, author)
        if cover:
            cover_cache[cache_key] = cover
            return cover

        # try OpenLibrary search
        cover = try_openlibrary_search(title, author)
        if cover:
            cover_cache[cache_key] = cover
            return cover

        cover_cache[cache_key] = None
        return None

    # enrich each metadata record in-place (pass index to allow throttling)
    for idx, rec in enumerate(book_database):
        if isinstance(rec, dict):
            rec.setdefault('cover_url', None)
            if not rec.get('cover_url'):
                rec['cover_url'] = find_cover_for_record(rec, idx=idx)

    index_data = {
        'metadata': book_database, # The list of {title, author, description, cover_url}
        'embeddings': np.array(embeddings) # Store as a numpy array for speed
    }

    # 6. Save the final index to a file
    print(f"Saving the complete vibe index to {OUTPUT_INDEX_FILE}...")
    with open(OUTPUT_INDEX_FILE, 'wb') as f:
        pickle.dump(index_data, f)

    print("\n✅ Success! Your 'Book Vibe Brain' (index) is created and saved.")
   