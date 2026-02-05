package com.vibeshelf.vibeshelf_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Optional;

@Service
public class OpenLibraryService {

    private static final String OPEN_LIBRARY_ISBN_URL = "https://openlibrary.org/isbn/%s.json";
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Fetches a book description from Open Library for the given ISBN.
     * Returns Optional.empty() if no description is available or on error.
     */
    public Optional<String> fetchDescriptionByIsbn(String isbn) {
        if (isbn == null) return Optional.empty();
        String trimmed = isbn.trim();
        if (trimmed.isEmpty()) return Optional.empty();

        String urlStr = String.format(OPEN_LIBRARY_ISBN_URL, trimmed);
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("Accept", "application/json; charset=utf-8");

            int code = conn.getResponseCode();
            if (code != 200) {
                return Optional.empty();
            }

            try (InputStream is = conn.getInputStream()) {
                JsonNode root = mapper.readTree(is);
                JsonNode descNode = root.get("description");
                if (descNode == null || descNode.isNull()) return Optional.empty();

                // description can be a string or an object { value: "..." }
                if (descNode.isTextual()) {
                    String v = descNode.asText();
                    return Optional.ofNullable(v == null ? null : v.trim()).filter(s -> !s.isEmpty());
                } else if (descNode.has("value")) {
                    String v = descNode.get("value").asText(null);
                    return Optional.ofNullable(v == null ? null : v.trim()).filter(s -> !s.isEmpty());
                } else {
                    return Optional.empty();
                }
            }

        } catch (Exception e) {
            // Treat any exception as no-description; don't throw to caller.
            return Optional.empty();
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}
