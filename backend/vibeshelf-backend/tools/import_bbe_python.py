#!/usr/bin/env python3
"""Robust CSV importer for Best_Books_Ever -> books_canonical

- Streams CSV using Python csv module (handles quoted fields and embedded newlines)
- Normalizes fields (isbn, pages, rating, numRatings, publish year)
- Upserts into `books_canonical` using heuristics:
  1) match google_books_id (bookId)
  2) match isbn_13 / isbn_10
  3) match title+author (case-insensitive)
- Updates existing records with missing fields when possible.

Usage:
  python3 tools/import_bbe_python.py /path/to/books_1.Best_Books_Ever.csv

"""
from pathlib import Path
import csv
import re
import sys
import time
import pymysql

ROOT = Path(__file__).resolve().parents[1]
PROPS = ROOT / 'src' / 'main' / 'resources' / 'application.properties'

NUMERIC_INT_MAX = 2147483647


def read_props(p: Path):
    d = {}
    with p.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                d[k.strip()] = v.strip()
    return d


def normalize_isbn(isbn_raw: str):
    if not isbn_raw:
        return None, None
    s = re.sub(r'[^0-9Xx]', '', isbn_raw)
    if len(s) == 13:
        return s, None
    if len(s) == 10:
        return None, s
    if len(s) > 13 and s.endswith('X'):
        # fallback: take last 10 or 13
        return (s[-13:], s[-10:])
    return (s if len(s) == 13 else None), (s if len(s) == 10 else None)


def extract_int(s: str):
    if not s:
        return None
    m = re.search(r"(\d+)", s)
    if not m:
        return None
    v = int(m.group(1))
    return min(v, NUMERIC_INT_MAX)


def extract_float(s: str):
    if not s:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    if not m:
        return None
    try:
        return float(m.group(1))
    except Exception:
        return None


def main():
    if len(sys.argv) > 1:
        csv_path = Path(sys.argv[1])
    else:
        csv_path = ROOT / 'src' / 'main' / 'resources' / 'Best_Books_Ever_dataset' / 'books_1.Best_Books_Ever.csv'

    if not csv_path.exists():
        print('CSV not found:', csv_path)
        return

    props = read_props(PROPS)
    url = props.get('spring.datasource.url')
    user = props.get('spring.datasource.username')
    password = props.get('spring.datasource.password')
    m = re.match(r'jdbc:mysql://([^:/]+)(?::(\d+))?/([^?]+)', url)
    if not m:
        print('Could not parse datasource.url:', url)
        return
    host = m.group(1)
    port = int(m.group(2)) if m.group(2) else 3306
    database = m.group(3)

    conn = pymysql.connect(host=host, port=port, user=user, password=password, database=database,
                           charset='utf8mb4', local_infile=1, autocommit=False)
    cur = conn.cursor()

    inserted = 0
    updated = 0
    skipped = 0
    errors = 0
    start = time.time()

    # pre-prepare queries
    q_find_by_bookid = "SELECT id FROM books_canonical WHERE google_books_id=%s LIMIT 1"
    q_find_by_isbn = "SELECT id FROM books_canonical WHERE isbn_13=%s OR isbn_10=%s LIMIT 1"
    q_find_by_title_author = "SELECT id FROM books_canonical WHERE LOWER(TRIM(title))=LOWER(TRIM(%s)) AND LOWER(TRIM(author))=LOWER(TRIM(%s)) LIMIT 1"

    q_update = ("UPDATE books_canonical SET title=%s, author=%s, description=%s, image_url=%s, genre=%s, "
                "isbn_13=%s, isbn_10=%s, publication_year=%s, publisher=%s, page_count=%s, rating=%s, ratings_count=%s, language=%s, google_books_id=%s, updated_at=NOW() WHERE id=%s")

    q_insert = ("INSERT INTO books_canonical (title,author,description,image_url,genre,isbn_13,isbn_10,publication_year,publisher,page_count,rating,ratings_count,language,google_books_id,created_at,updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())")

    batch = []
    batch_size = 500

    # Open CSV using latin-1 to tolerate a variety of encodings (avoids UnicodeDecodeError)
    fh = csv_path.open('r', encoding='latin-1', newline='')
    reader = csv.DictReader(fh)

    total = 0
    for row in reader:
        total += 1
        try:
            bookId = (row.get('bookId') or '').strip()
            title = (row.get('title') or '').strip()
            author = (row.get('author') or '').strip()
            description = (row.get('description') or '').strip()
            language = (row.get('language') or '').strip()
            isbn_raw = (row.get('isbn') or '').strip()
            genres = (row.get('genres') or '').strip()
            cover = (row.get('coverImg') or row.get('cover') or '').strip()
            pages_raw = (row.get('pages') or '').strip()
            rating_raw = (row.get('rating') or '').strip()
            numRatings_raw = (row.get('numRatings') or '').strip()
            publishDate = (row.get('publishDate') or '').strip()
            publisher = (row.get('publisher') or '').strip()

            # ensure title/author not null (books_canonical requires NOT NULL)
            if title == '':
                title = 'Untitled'
            if author == '':
                author = 'Unknown'

            isbn13, isbn10 = normalize_isbn(isbn_raw)
            page_count = extract_int(pages_raw)
            rating = extract_float(rating_raw)
            ratings_count = extract_int(numRatings_raw)
            pub_year = None
            m_year = re.search(r'(\d{4})', publishDate)
            if m_year:
                py = int(m_year.group(1))
                if 0 < py <= 9999:
                    pub_year = py

            genre = genres
            if len(genre) > 100:
                genre = genre[:100]
            if len(description) > 2000:
                description = description[:2000]

            # search for existing
            found_id = None
            if bookId:
                cur.execute(q_find_by_bookid, (bookId,))
                r = cur.fetchone()
                if r:
                    found_id = r[0]
            if not found_id and (isbn13 or isbn10):
                cur.execute(q_find_by_isbn, (isbn13, isbn10))
                r = cur.fetchone()
                if r:
                    found_id = r[0]
            if not found_id:
                cur.execute(q_find_by_title_author, (title, author))
                r = cur.fetchone()
                if r:
                    found_id = r[0]

            if found_id:
                # update existing: fill missing fields if current DB has nulls
                cur.execute("SELECT title,author,description,image_url,genre,isbn_13,isbn_10,publication_year,publisher,page_count,rating,ratings_count,language,google_books_id FROM books_canonical WHERE id=%s", (found_id,))
                existing = cur.fetchone()
                # simple policy: overwrite if new value is truthy and existing is null/empty
                new_title = title or existing[0]
                new_author = author or existing[1]
                new_description = description or existing[2]
                new_image = cover or existing[3]
                new_genre = genre or existing[4]
                new_isbn13 = isbn13 or existing[5]
                new_isbn10 = isbn10 or existing[6]
                new_pub_year = pub_year or existing[7]
                new_publisher = publisher or existing[8]
                new_page_count = page_count or existing[9]
                new_rating = rating or existing[10]
                new_ratings_count = ratings_count or existing[11]
                new_language = language or existing[12]
                new_bookid = bookId or existing[13]

                cur.execute(q_update, (new_title,new_author,new_description,new_image,new_genre,new_isbn13,new_isbn10,new_pub_year,new_publisher,new_page_count,new_rating,new_ratings_count,new_language,new_bookid,found_id))
                updated += 1
            else:
                cur.execute(q_insert, (title,author,description,cover,genre,isbn13,isbn10,pub_year,publisher,page_count,rating,ratings_count,language,bookId))
                inserted += 1

            if (inserted + updated + skipped + errors) % batch_size == 0:
                conn.commit()

        except Exception as e:
            errors += 1
            print('Error processing row', total, repr(e))
            # keep going

    # final commit
    conn.commit()

    elapsed = time.time() - start
    print(f'Processed {total} rows — inserted={inserted}, updated={updated}, skipped={skipped}, errors={errors} in {elapsed:.1f}s')

    # show a few sample rows
    cur.execute("SELECT id,title,author,LEFT(description,200) AS desc_snip,isbn_13,isbn_10 FROM books_canonical ORDER BY id DESC LIMIT 10")
    samples = cur.fetchall()
    for s in samples:
        print(s)

    cur.close()
    conn.close()


if __name__ == '__main__':
    main()
