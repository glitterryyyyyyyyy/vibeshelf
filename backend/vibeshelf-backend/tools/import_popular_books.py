#!/usr/bin/env python3
"""
Import Popular-Books.csv into the MySQL books_canonical table safely.

Usage:
  # dry-run (default) - shows how many unique rows would be inserted
  python3 tools/import_popular_books.py --csv books/Popular-Books.csv

  # actually apply changes
  python3 tools/import_popular_books.py --csv books/Popular-Books.csv --apply

The script will by default parse DB credentials from
`src/main/resources/application.properties`. You can override with
--host --port --user --password --database.

It deduplicates by (title, author) lowercase pair and will check the DB
for existing rows before inserting.
"""
import argparse
import csv
import os
import re
import sys
from typing import Dict, Tuple

try:
    import mysql.connector
    from mysql.connector import errorcode
except Exception:
    mysql = None


APP_PROPERTIES = os.path.join("src", "main", "resources", "application.properties")


def parse_application_properties(path: str) -> Dict[str, str]:
    props = {}
    if not os.path.exists(path):
        return props
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                props[k.strip()] = v.strip()
    return props


def parse_jdbc_url(jdbc: str) -> Tuple[str, int, str]:
    # example: jdbc:mysql://localhost:3306/books_db?useSSL=false
    m = re.match(r"jdbc:mysql://([^:/?#]+)(?::(\d+))?/(\w+)", jdbc)
    if not m:
        raise ValueError(f"Cannot parse JDBC url: {jdbc}")
    host = m.group(1)
    port = int(m.group(2) or 3306)
    database = m.group(3)
    return host, port, database


def normalize_text(s: str) -> str:
    if s is None:
        return None
    s = s.strip()
    return s if s != "" else None


def truncate(s: str, maxlen: int):
    if s is None:
        return None
    if len(s) <= maxlen:
        return s
    return s[:maxlen]


def build_insert_row(row: Dict[str, str]) -> Dict:
    # Map CSV columns to DB columns where possible
    title = normalize_text(row.get("Title"))
    author = normalize_text(row.get("Author"))
    description = normalize_text(row.get("Description"))
    image = normalize_text(row.get("Image"))
    published = normalize_text(row.get("Published"))
    score = normalize_text(row.get("Score"))
    ratings = normalize_text(row.get("Ratings"))

    # apply length limits from JPA model
    title = truncate(title, 500) if title else None
    author = truncate(author, 300) if author else None
    description = truncate(description, 2000) if description else None
    image = truncate(image, 500) if image else None

    pub_year = None
    if published:
        try:
            pub_year = int(re.sub(r"[^0-9-]", "", published).split("-")[0])
        except Exception:
            pub_year = None

    rating = None
    try:
        rating = float(score) if score else None
    except Exception:
        rating = None

    ratings_count = None
    try:
        ratings_count = int(ratings) if ratings else None
    except Exception:
        ratings_count = None

    return {
        "title": title,
        "author": author,
        "description": description,
        "image_url": image,
        "publication_year": pub_year,
        "rating": rating,
        "ratings_count": ratings_count,
    }


def connect_mysql(host, port, user, password, database):
    if mysql is None:
        raise RuntimeError("mysql-connector-python is not installed. Run: pip install mysql-connector-python")
    return mysql.connector.connect(host=host, port=port, user=user, password=password, database=database)


def main():
    parser = argparse.ArgumentParser(description="Import Popular-Books.csv into books_canonical table")
    parser.add_argument("--csv", required=True, help="path to CSV (relative to repo root)")
    parser.add_argument("--apply", action="store_true", help="actually write to DB (default is dry-run)")
    parser.add_argument("--host")
    parser.add_argument("--port", type=int)
    parser.add_argument("--user")
    parser.add_argument("--password")
    parser.add_argument("--database")
    args = parser.parse_args()

    props = parse_application_properties(APP_PROPERTIES)
    jdbc = props.get("spring.datasource.url")
    cfg_user = props.get("spring.datasource.username")
    cfg_pass = props.get("spring.datasource.password")

    if jdbc:
        try:
            host, port, database = parse_jdbc_url(jdbc)
        except Exception:
            host, port, database = "localhost", 3306, "books_db"
    else:
        host, port, database = "localhost", 3306, "books_db"

    host = args.host or host
    port = args.port or port
    user = args.user or cfg_user or "root"
    password = args.password or cfg_pass or ""
    database = args.database or database

    csv_path = args.csv
    if not os.path.exists(csv_path):
        csv_path = os.path.join(os.getcwd(), csv_path)
    if not os.path.exists(csv_path):
        print(f"CSV not found: {args.csv}")
        sys.exit(1)

    seen = set()
    to_insert = []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            title = (r.get("Title") or "").strip()
            author = (r.get("Author") or "").strip()
            key = (title.lower(), author.lower()) if title and author else None
            if not key:
                continue
            if key in seen:
                continue
            seen.add(key)
            mapped = build_insert_row(r)
            # require title and author
            if not mapped["title"] or not mapped["author"]:
                continue
            to_insert.append((key, mapped))

    print(f"Found {len(to_insert)} unique title+author rows in CSV (after in-file dedupe).")

    if not args.apply:
        print("Dry-run mode (no DB writes). To write to DB, re-run with --apply")
        # show sample
        for i, (_, m) in enumerate(to_insert[:5]):
            print(f"Sample {i+1}: {m['title'][:80]} -- {m['author'][:60]} -- year={m['publication_year']} rating={m['rating']} ratings_count={m['ratings_count']}")
        print("Done (dry-run).")
        return

    # perform DB insertions
    conn = None
    try:
        conn = connect_mysql(host, port, user, password, database)
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        sys.exit(2)

    cur = conn.cursor()
    inserted = 0
    skipped_existing = 0
    try:
        for key, m in to_insert:
            title, author = key
            # check existing by title+author
            cur.execute("SELECT id FROM books_canonical WHERE LOWER(title)=%s AND LOWER(author)=%s LIMIT 1", (title, author))
            if cur.fetchone():
                skipped_existing += 1
                continue
            insert_sql = (
                "INSERT INTO books_canonical (title, author, description, image_url, publication_year, rating, ratings_count, is_popular, view_count) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)"
            )
            cur.execute(insert_sql, (
                m["title"], m["author"], m["description"], m["image_url"], m["publication_year"], m["rating"], m["ratings_count"], False, 0
            ))
            inserted += 1
            if inserted % 100 == 0:
                conn.commit()
        conn.commit()
    except mysql.connector.Error as err:
        print(f"MySQL error: {err}")
        conn.rollback()
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

    print(f"Insert complete: inserted={inserted} skipped_existing={skipped_existing}")


if __name__ == "__main__":
    main()
