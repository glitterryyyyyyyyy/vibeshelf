#!/usr/bin/env python3
"""Import Best_Books_Ever CSV into MySQL without creating duplicates.

Strategy:
- Create a staging table `books_staging_bbe` tailored to the CSV columns.
- LOAD DATA LOCAL INFILE to stream the CSV into staging.
- INSERT ... SELECT from staging into `books_canonical` where no matching record exists by:
  1) matching ISBN-13 or ISBN-10 (after stripping hyphens), OR
  2) matching google_books_id (bookId in CSV), OR
  3) matching title+author (case-insensitive exact match) as a fallback.

Notes:
- The script reads DB creds from `src/main/resources/application.properties`.
- It requires `pymysql` to be installed and MySQL server must allow LOCAL INFILE (we enable it in the connection).
"""
import re
import os
from pathlib import Path
import sys
import pymysql


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'src' / 'main' / 'resources' / 'books_data'
CSV_PATH = DATA_DIR / 'books_1.Best_Books_Ever.csv'
PROPS = ROOT / 'src' / 'main' / 'resources' / 'application.properties'


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


def main():
    # allow passing a different CSV path as the first arg
    if len(sys.argv) > 1:
        p = Path(sys.argv[1])
        if p.exists():
            global CSV_PATH
            CSV_PATH = p
        else:
            print('Provided CSV path does not exist:', p)
            return
    print('Using CSV:', CSV_PATH)

    props = read_props(PROPS)
    url = props.get('spring.datasource.url')
    user = props.get('spring.datasource.username')
    password = props.get('spring.datasource.password')
    # parse host/db from url like jdbc:mysql://localhost:3306/books_db?...
    m = re.match(r'jdbc:mysql://([^:/]+)(?::(\d+))?/([^?]+)', url)
    if not m:
        print('Could not parse datasource.url:', url)
        return
    host = m.group(1)
    port = int(m.group(2)) if m.group(2) else 3306
    database = m.group(3)

    conn = pymysql.connect(host=host, port=port, user=user, password=password, database=database,
                           charset='utf8mb4', local_infile=1, autocommit=True)
    cur = conn.cursor()

    print('Creating staging table `books_staging_bbe` (temporary) ...')
    cur.execute('DROP TABLE IF EXISTS books_staging_bbe')
    cur.execute("""
    CREATE TABLE books_staging_bbe (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      bookId VARCHAR(200),
      title TEXT,
      series VARCHAR(255),
      author TEXT,
  rating VARCHAR(50),
      description MEDIUMTEXT,
      language VARCHAR(50),
      isbn VARCHAR(50),
      genres TEXT,
      characters TEXT,
      bookFormat VARCHAR(100),
      edition VARCHAR(100),
  pages VARCHAR(50),
      publisher VARCHAR(255),
      publishDate VARCHAR(100),
      firstPublishDate VARCHAR(100),
      awards TEXT,
  numRatings VARCHAR(50),
      ratingsByStars TEXT,
      likedPercent VARCHAR(50),
      setting TEXT,
      coverImg TEXT,
  bbeScore VARCHAR(50),
  bbeVotes VARCHAR(50),
      price VARCHAR(50)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    print('Truncating staging table...')
    cur.execute('TRUNCATE TABLE books_staging_bbe')

    print('Loading CSV into staging with LOAD DATA LOCAL INFILE (this may take a few minutes) ...')

    # prepare LOAD DATA statement - match the CSV header order observed
    infile_path = CSV_PATH.as_posix().replace("'", "\\'")
    load_sql = (
        "LOAD DATA LOCAL INFILE '" + infile_path + "'\n"
        "INTO TABLE books_staging_bbe\n"
        "CHARACTER SET utf8mb4\n"
        "FIELDS TERMINATED BY ','\n"
        "OPTIONALLY ENCLOSED BY '\"'\n"
        "LINES TERMINATED BY '\\n'\n"
        "IGNORE 1 LINES\n"
        "(bookId, title, series, author, rating, description, language, isbn, genres, characters, bookFormat, edition, pages, publisher, publishDate, firstPublishDate, awards, numRatings, ratingsByStars, likedPercent, setting, coverImg, bbeScore, bbeVotes, price);"
    )

    cur.execute(load_sql)

    print('Loaded rows into staging. Now inserting non-duplicates into books_canonical ...')

    insert_sql = """
    INSERT INTO books_canonical (
      title, author, description, image_url, genre, isbn_13, isbn_10, publication_year, publisher, page_count, rating, ratings_count, language, google_books_id
    )
    SELECT
      s.title,
      s.author,
      s.description,
      s.coverImg,
      LEFT(TRIM(BOTH '"' FROM s.genres), 100),
  CASE WHEN CHAR_LENGTH(REPLACE(s.isbn,'-','')) = 13 THEN REPLACE(s.isbn,'-','') ELSE NULL END,
  CASE WHEN CHAR_LENGTH(REPLACE(s.isbn,'-','')) = 10 THEN REPLACE(s.isbn,'-','') ELSE NULL END,
  NULL,
      s.publisher,
    (CASE WHEN s.pages REGEXP '^[0-9]+$' THEN CAST(s.pages AS UNSIGNED) ELSE NULL END),
    (CASE WHEN s.rating REGEXP '^[0-9]+(\\.[0-9]+)?$' THEN CAST(s.rating AS DECIMAL(6,3)) ELSE NULL END),
    (CASE WHEN s.numRatings REGEXP '^[0-9]+$' THEN CAST(s.numRatings AS UNSIGNED) ELSE NULL END),
      s.language,
      s.bookId
    FROM books_staging_bbe s
    WHERE NOT EXISTS (
      SELECT 1 FROM books_canonical bc
      WHERE (
        (s.isbn IS NOT NULL AND s.isbn <> '' AND (bc.isbn_13 = REPLACE(s.isbn,'-','') OR bc.isbn_10 = REPLACE(s.isbn,'-','')))
        OR (s.bookId IS NOT NULL AND s.bookId <> '' AND bc.google_books_id = s.bookId)
        OR (LOWER(TRIM(bc.title)) = LOWER(TRIM(s.title)) AND LOWER(TRIM(bc.author)) = LOWER(TRIM(s.author)))
      )
    );
    """

    cur.execute(insert_sql)
    inserted = cur.rowcount
    print(f'Inserted {inserted} rows into books_canonical (approx).')

    print('Cleaning up: you may DROP TABLE books_staging_bbe if you want to free space (left intact for verification).')
    cur.close()
    conn.close()


if __name__ == '__main__':
    main()
