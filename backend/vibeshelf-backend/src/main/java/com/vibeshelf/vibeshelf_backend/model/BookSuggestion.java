package com.vibeshelf.vibeshelf_backend.model;

public class BookSuggestion {
    private String title;
    private String author;
    private String reason;
    private String coverUrl;

    public BookSuggestion() {}

    public BookSuggestion(String title, String author, String reason, String coverUrl) {
        this.title = title;
        this.author = author;
        this.reason = reason;
        this.coverUrl = coverUrl;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
}
