![DramaKhana](readme.png)

# DramaKhana (ڈراما خانہ) — Premium Pakistani Drama Streaming Platform

> A modern, cinematic streaming web application dedicated to Pakistani drama serials, featuring dual streaming architectures (direct YouTube synchronization and high-bitrate self-hosted MP4 uploads), dynamic video hero sections, and comprehensive library administration.

---

## 🌟 Key Highlights & Features

### 🎬 Dynamic Video Hero Section
- **Hero Section 1 (`hero1.mp4`)**: Cinematic background video preview showcasing *Ishq-e-Haveli* (HUM TV).
- **Hero Section 2 (`hero2.mp4`)**: Atmospheric monsoon video preview featuring *Shab-e-Wafa* (ARY Digital).
- **Interactive Playback Controls**: Auto-play muted video with one-click sound unmuting, subtle architectural jaali motifs, high-contrast scrims, and smooth fallback posters.
- **Direct Streaming Integration**: Clicking **Watch Now** instantly launches the episode in the theater player.

### 📺 Dual Video Streaming Architecture
- **Official YouTube Synchronization**: Stream legal, high-definition broadcast episodes directly from HUM TV, ARY Digital, Geo Entertainment, and Green Entertainment.
- **Self-Hosted Video Streaming**: Native HTML5 streaming with HTTP `206 Partial Content` Range headers for instant seeking, pause/resume, and zero-buffering playback.
- **Comprehensive Theater Player**: Episode switching, autoplay next, watch progress saving, and related serial recommendations.

### 🏛️ Cultural Pakistani Aesthetic & UI
- Designed with rich emerald greens (`#087F5B`), Mughal golds (`#D4AF6A`), and midnight slate tones (`#101512`).
- Responsive Netflix-style horizontal carousels with smooth touch and scroll interactions.
- Dynamic genre tagging, episode count tracking, channel filtering, and real-time search.

### 🛡️ Dual-Database Persistence & Cloud Sync
- **Local SQLite Engine (`better-sqlite3`)**: Zero-latency offline and local development with WAL mode and automatic schema migrations.
- **MongoDB Atlas Cloud Sync (`mongoose`)**: Seamless bidirectional cloud synchronization for users, dramas, episodes, categories, and watch history.
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing and role-based permissions (`admin` / `viewer`).

### ⚙️ Admin Control Center
- Upload own MP4 videos and artwork posters.
- Fetch single videos or full playlists automatically from YouTube.
- Manage drama serials, channel profiles, actor biographies, and category classifications.
- Real-time library analytics, view counts, and breakdown metrics.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion |
| **Backend** | Node.js, Express, TSX (TypeScript Execute) |
| **Databases** | MongoDB Atlas (Mongoose) + Local SQLite (better-sqlite3) |
| **Media & Storage** | Native HTML5 Video, Multer, Express Static with HTTP Range support |
| **Auth & Security** | JSON Web Tokens (JWT), Bcrypt.js, protected route middleware |

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v18+ (tested on v24)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- (Optional) MongoDB Atlas database cluster

### 2. Clone the Repository
```bash
git clone https://github.com/jasminaramim/DramaKhana.git
cd DramaKhana
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=3000
JWT_SECRET=your-secure-jwt-secret-key
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.ssmpl.mongodb.net/dramakhana?retryWrites=true&w=majority
GEMINI_API_KEY=your-optional-gemini-api-key
```
*(Note: If `MONGODB_URI` is omitted, DramaKhana automatically runs using the persistent local SQLite database.)*

### 5. Launch the Development Server
```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📂 Project Structure

```text
dramakhana/
├── .env.example              # Environment variables template (safe for public repos)
├── .gitignore                # Git ignore rules protecting credentials and build artifacts
├── hero1.mp4                 # Video stream asset for Hero Section 1
├── hero2.mp4                 # Video stream asset for Hero Section 2
├── readme.png                # Project hero showcase graphic
├── index.html                # Vite entry point
├── package.json              # Project scripts and dependencies
├── server.ts                 # Express server with Vite middleware & media streaming
├── public/                   # Publicly served video and image assets
├── data/                     # Persistent local SQLite storage
├── server/
│   ├── auth.ts               # JWT signing, verification, and role middleware
│   ├── db.ts                 # SQLite schema, MongoDB sync, and data repositories
│   ├── sampleMedia.ts        # Sample media generators and fallbacks
│   ├── youtube.ts            # YouTube metadata and playlist synchronizer
│   ├── models/               # Mongoose schemas for MongoDB cloud persistence
│   └── routes/
│       └── api.ts            # RESTful API endpoints for streaming, search, and admin
└── src/
    ├── App.tsx               # Root application router and layout
    ├── main.tsx              # React DOM mounting
    ├── types.ts              # TypeScript domain types (Drama, Video, Category, etc.)
    ├── components/
    │   ├── HeroBanner.tsx    # Dual-video hero banner with audio and slide controls
    │   ├── Navbar.tsx        # Navigation bar, search, and user profile
    │   ├── ContentRow.tsx    # Horizontal Netflix-style scrolling carousels
    │   ├── MediaCards.tsx    # Drama and video episode cards with badges
    │   ├── MediaImage.tsx    # Resilient image loader with fallback banners
    │   └── AuthModal.tsx     # Sign-in and sign-up modal
    └── pages/
        ├── HomePage.tsx          # Main streaming dashboard
        ├── WatchPage.tsx         # Theater video player with episode list
        ├── DramaDetailPage.tsx   # Drama serial synopsis, cast, and all episodes
        ├── CategoriesPage.tsx    # Genre and category browsing
        ├── ChannelsPage.tsx      # Channel directories (HUM TV, ARY, etc.)
        ├── SearchPage.tsx        # Global search across serials, episodes, and actors
        ├── WatchlistPage.tsx     # Personalized saved watchlist
        └── AdminDashboard.tsx    # Full admin control and upload management
```

---

## 📜 Scripts Reference

- `npm run dev` — Starts the Express backend and Vite client in integrated development mode.
- `npm run build` — Builds the client application for production into `dist/`.
- `npm run start` — Runs the compiled production server.
- `npm run lint` — Runs TypeScript type-checking across the entire codebase.

---

## 🔒 Security & Privacy Notice
- Sensitive configuration files (`.env`, `.env.local`) and local SQLite database files (`*.db`) are strictly excluded via `.gitignore`.
- Password hashes are computed using industry-standard salted bcrypt.
- JWT tokens authenticate requests across protected API and administration routes.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

