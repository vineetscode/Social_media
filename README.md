# ⚡ JabWeMet — Next.js Instagram-Style Social Media Application

JabWeMet is a modern, high-performance, dark-mode social media application inspired by Instagram. It is built using the latest Next.js App Router, Prisma ORM, Supabase (PostgreSQL), Clerk Authentication, and Cloudinary Media Service.

---

## ✨ Features

- **📸 Ephemeral Stories (Instagram-style)**:
  - Upload stories with custom visuals (user avatar with blue plus badge overlay).
  - Automatic 24-hour expiration.
  - Interactive story viewer with a progress bar and navigation triggers.
  - Robust mime-type validation supporting standard `.jpg`, `.jpeg`, `.png`, `.webp`, and `.gif` formats.

- **🔥 Dynamic Feed & Composer**:
  - Write text-only or image-attached posts with a custom emoji picker.
  - Like, double-tap to like with heart pop animations, comment, and share.
  - Real-time "Creators for you" recommendations sidebar featuring real users from the database with active follow/following state sync.
  - Subtle reporting/flagging options on every post.

- **🔍 Explore & Submerged Search**:
  - Trending Posts ranked by gravity engagement score (engagement + age decay).
  - Hot Creators ranked by follower count.
  - Dynamic submerged search bar at the top of the Explore page returning matching profiles and posts via case-insensitive database substring matching.

- **👤 Premium User Profiles**:
  - Detailed biography, website links, verification badges, and followers/following metrics.
  - Interactive grid displaying published posts and private bookmarks (saved posts).
  - Settings Gear icon in the top-right corner that launches a unified modal for editing details (Username, Display Name, Bio) and signing out of the session.

- **🛡️ Secure Admin Panel**:
  - Strict role-based authorization restricting the Moderation Dashboard solely to users with the `ADMIN` role.
  - Real-time queue displaying reports flagged by users (with author profile details, target content, and reasons).
  - One-click actions to either dismiss reports or delete offending posts and resolve flags.

- **💬 Direct Messaging & Notifications**:
  - Real-time direct messaging between users.
  - Notification drawer showing likes, comments, mentions, follows, and messages.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions, API Routes)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL instance with connection pooling)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [Clerk](https://clerk.com/) (Google OAuth & Credentials sign-in)
- **Media Uploads**: [Cloudinary SDK](https://cloudinary.com/) (Server-side signed uploads with EXIF stripping and adaptive HLS video streaming)
- **Styling**: Vanilla CSS + Tailwind CSS (Custom glassmorphic dark-theme design system)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- Node.js (v18.x or above)
- npm or yarn

### 2. Environment Setup
Create a `.env.local` file in the root directory and add the following keys:

```env
# Database Connections
DATABASE_URL="postgresql://postgres.[your-id]:[your-password]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[your-id]:[your-password]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Cloudinary Media Services
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
CLINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Database Initialization
Push the schema to your Supabase PostgreSQL database:
```bash
npx prisma db push
```

### 4. Running the Development Server
Install dependencies and run the local development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 5. Production Build
To create an optimized production build:
```bash
npm run build
```

---

## 📂 Project Directory Structure

```text
├── prisma/
│   └── schema.prisma        # Supabase PostgreSQL database schema
├── src/
│   ├── app/
│   │   ├── admin/           # Admin moderation dashboard
│   │   ├── api/             # API routes (Search, Upload, Reports, Feed, Stories)
│   │   ├── explore/         # Submerged search and trending grid
│   │   ├── feed/            # Newsfeed page
│   │   ├── profile/         # Profile redirect and username page
│   │   └── layout.tsx       # Global Next.js app layouts
│   ├── components/          # Shared components (navigation-shell, image-uploader)
│   ├── lib/                 # Core utilities (prisma, cloudinary, auth-sync)
│   └── modules/             # Service layers (search, feed, follow modules)
├── public/                  # Static assets
└── package.json             # Scripts and dependencies
```
