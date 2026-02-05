package com.vibeshelf.vibeshelf_backend.service;

import java.util.Map;
import java.util.HashMap;

/**
 * Small utility to normalize user-supplied or UI-supplied genre names to a
 * canonical set used by the backend. This helps handle synonyms and small
 * variations (e.g. "Sci-Fi" -> "Science Fiction", "YA" -> "Young Adult").
 *
 * This is intentionally kept in-memory and simple so it works without DB
 * changes. You can extend it later to load mappings from a config file or DB.
 */
public final class GenreNormalizationService {

    private static final Map<String, String> canonical = new HashMap<>();

    static {
        // canonical list (lowercased keys map to canonical display names)
        canonical.put("fiction", "Fiction");
        canonical.put("nonfiction", "Nonfiction");
        canonical.put("non-fiction", "Nonfiction");
        canonical.put("mystery", "Mystery");
        canonical.put("thriller", "Thriller");
        canonical.put("romance", "Romance");
        canonical.put("romcom", "Romantic Comedy");
        canonical.put("romantic comedy", "Romantic Comedy");
        canonical.put("historical", "Historical");
        canonical.put("fantasy", "Fantasy");
        canonical.put("science fiction", "Science Fiction");
        canonical.put("sci-fi", "Science Fiction");
        canonical.put("scifi", "Science Fiction");
        canonical.put("horror", "Horror");
        canonical.put("memoir", "Memoir");
        canonical.put("biography", "Biography");
        canonical.put("self-help", "Self-Help");
        canonical.put("self help", "Self-Help");
        canonical.put("poetry", "Poetry");
        canonical.put("young adult", "Young Adult");
        canonical.put("ya", "Young Adult");
        canonical.put("children", "Children");
        canonical.put("graphic novel", "Graphic Novel");
        canonical.put("humor", "Humor");
        canonical.put("satire", "Satire");
        canonical.put("adventure", "Adventure");
        canonical.put("classic", "Classic");
        canonical.put("contemporary", "Contemporary");
        canonical.put("crime", "Crime");
        canonical.put("cozy mystery", "Cozy Mystery");
        canonical.put("paranormal", "Paranormal");
        canonical.put("urban fantasy", "Urban Fantasy");
        canonical.put("magical realism", "Magical Realism");
        canonical.put("literary fiction", "Literary Fiction");
        canonical.put("short stories", "Short Stories");
        canonical.put("essays", "Essays");
        canonical.put("parenting", "Parenting");
        canonical.put("health", "Health");
        canonical.put("religion", "Religion");
        canonical.put("philosophy", "Philosophy");
        canonical.put("travel", "Travel");
        canonical.put("cooking", "Cooking");
        canonical.put("art", "Art");
        canonical.put("music", "Music");
        canonical.put("business", "Business");
        canonical.put("technology", "Technology");
        canonical.put("history", "History");
        canonical.put("politics", "Politics");
        canonical.put("science", "Science");
        canonical.put("true crime", "True Crime");
    }

    private GenreNormalizationService() {}

    /**
     * Normalize a raw genre token into the canonical display name.
     * If no mapping exists, returns the trimmed token with capitalization preserved.
     */
    public static String normalize(String raw) {
        if (raw == null) return null;
        String key = raw.trim().toLowerCase();
        if (key.isEmpty()) return null;
        String mapped = canonical.get(key);
        if (mapped != null) return mapped;

        // Try to handle plural/simple variants (basic heuristics)
        if (key.endsWith("s")) {
            mapped = canonical.get(key.substring(0, key.length() - 1));
            if (mapped != null) return mapped;
        }

        // Fallback: return trimmed original with simple capitalization
        return Character.toUpperCase(raw.trim().charAt(0)) + raw.trim().substring(1);
    }
}
