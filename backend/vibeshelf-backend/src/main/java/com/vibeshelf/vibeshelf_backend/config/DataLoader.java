package com.vibeshelf.vibeshelf_backend.config;

import com.vibeshelf.vibeshelf_backend.model.Book;
import com.vibeshelf.vibeshelf_backend.repository.BookRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private BookRepository bookRepository;

    // When true the CSV import will run even if the DB already contains rows.
    // Set via application.properties or environment: app.import.force=true
    @Value("${app.import.force:false}")
    private boolean forceImport;

    // Point to the Best Books Ever CSV shipped with the project
    private static final String CSV_FILE_PATH = "src/main/resources/Best_Books_Ever_dataset/books_1.Best_Books_Ever.csv";

    /**
     * Run at startup and import CSV only when DB is empty.
     * This implementation is header-driven and will map the CSV header
     * columns to Book properties. Importantly it maps the CSV column
     * named "genres" (case-insensitive) directly to Book.genre (exact string).
     */
    @Override
    public void run(String... args) throws Exception {
        // CSV import/loader disabled for the simplified canonical schema.
        // Keeping this component as a no-op avoids compile/runtime issues while
        // the simplified Book entity is used. To enable CSV import again,
        // re-implement mapping matching the `books_canonical` columns.
        System.out.println("DataLoader: CSV import disabled for simplified schema.");
    }
    // CSV import has been disabled to match the simplified Book entity. If you need
    // to re-enable CSV import, implement mapping that writes only the fields present
    // in the `books_canonical` table and avoid referencing removed columns.

    private String getByHeader(String[] values, Map<String, Integer> idx, String headerKey) {
        Integer i = idx.get(headerKey.toLowerCase());
        if (i == null) return null;
        if (i >= values.length) return null;
        return values[i];
    }

    // Very small CSV parser that handles commas and quoted fields (double quotes)
    private String[] parseCsvLineComma(String line) {
        if (line == null || line.isEmpty()) return new String[0];
        java.util.List<String> out = new java.util.ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                // handle escaped quotes ""
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    cur.append('"');
                    i++; // skip next
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                out.add(cur.toString());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        out.add(cur.toString());
        return out.toArray(new String[0]);
    }

    private Integer parseInteger(String value) {
        if (value == null) return null;
        try {
            // some CSV fields may contain non-year content; extract digits
            String digits = value.replaceAll("[^0-9]", "");
            if (digits.isEmpty()) return null;
            return Integer.parseInt(digits);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Truncate a string safely to max length (null-safe).
     */
    private String truncate(String s, int max) {
        if (s == null) return null;
        if (s.length() <= max) return s;
        return s.substring(0, max);
    }
}
