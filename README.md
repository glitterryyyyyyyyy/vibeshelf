# 📚 VibeShelf

VibeShelf is a full-stack book discovery application designed for aesthetic, emotion-driven readers.  
It allows users to explore books, get lyric- and mood-based recommendations, manage their TBR (To-Be-Read) list, and enjoy a clean, cozy UI experience.

The project is built with a modern **React + Vite frontend** and a **Spring Boot backend**.

---

## ✨ Features

### 📖 Frontend
- Explore page with curated and searchable books
- Aesthetic, minimal UI
- Book detail pages with descriptions and metadata
- TBR (To-Be-Read) list
- Responsive design
- Light / Dark mode toggle

### ⚙️ Backend
- Spring Boot REST API
- Book, genre, review, and user endpoints
- JWT-based authentication
- Optimized services for large datasets
- Database migrations with Flyway
- Secure CORS and rate-limiting configuration

---

---

## 🚀 Getting Started

### ✅ Prerequisites
Make sure you have installed:
- **Node.js** (v18+ recommended)
- **npm**
- **Java 17+**
- **Maven** (or use the included Maven wrapper)

---

## ▶️ Running the Frontend

cd frontend
npm install
npm run dev

Running the Backend

cd backend/vibeshelf-backend
./mvnw spring-boot:run
