# ReverSound PRD

## Project Overview
ReverSound — Music Career Ecosystem & Freelance Marketplace
**Domain:** reversound.com (future production)
**Stack:** React + FastAPI + MongoDB
**Market:** Turkish music market (primary), global (secondary)

## Architecture
- **Backend:** FastAPI (Python), Motor (async MongoDB), PyJWT, bcrypt, Gemini AI
- **Frontend:** React 19, React Router 7, Tailwind CSS, shadcn/ui, lucide-react
- **Database:** MongoDB (reversound_db)
- **AI:** Gemini 3.1 Pro Preview via emergentintegrations (EMERGENT_LLM_KEY)
- **Escrow:** Mock escrow system (Iyzico/PayTR ready architecture)

## Implemented Features (v1.0 — 2026-03-29)

### Core Systems
- [x] JWT Authentication (register/login/logout/me) with httpOnly cookies + Bearer token
- [x] RBAC: admin, producer, artist, engineer, designer, buyer roles
- [x] Admin seeding on startup
- [x] Brute-force protection foundation

### Beat/Sample Marketplace
- [x] Beat CRUD with genre, BPM, key, tags, licenses
- [x] Beat marketplace with genre filtering, BPM range, search
- [x] Audio preview player (global sticky player)
- [x] 3-tier license system (Basic/Premium/Exclusive)
- [x] Beat purchase with wallet deduction
- [x] Demo seed data (6 beats across genres)

### Freelance Gig Network
- [x] Gig CRUD with 3-tier pricing (Basic/Standard/Premium)
- [x] Gig marketplace with category filters
- [x] Gig detail page with order panel
- [x] Review system (post-order completion only)
- [x] Demo seed data (4 gigs)

### Escrow Payment System
- [x] Order creation with immediate escrow funding
- [x] Escrow state machine: funded → delivered → completed/disputed
- [x] Seller delivery workflow
- [x] Buyer approval (releases funds to seller, 10% platform fee)
- [x] Dispute system (admin resolution)
- [x] Order cancellation with refund

### Messaging with Moderation
- [x] Conversation management
- [x] Real-time messaging (polling every 5s)
- [x] Contact info moderation (email, phone, social handles, URLs)
- [x] Flagged message display

### AI Career Coach
- [x] Gemini 3.1 Pro integration via emergentintegrations
- [x] Persistent chat history in MongoDB
- [x] Personalized system prompt based on user profile
- [x] Bilingual support (Turkish/English)
- [x] Starter prompts for new users

### Admin Portal
- [x] Platform statistics dashboard
- [x] User management (ban/unban/verify/role change)
- [x] Beat moderation queue (approve/reject)
- [x] Gig moderation queue (approve/reject)
- [x] Playlist submission review (jury dashboard)
- [x] Dispute resolution (release to seller / refund to buyer)

### Wallet System
- [x] User wallet with available + escrow balance separation
- [x] Mock topup (Iyzico/PayTR architecture ready)
- [x] Transaction history
- [x] 100 credit welcome bonus on registration

### Subscription System
- [x] 4 tiers: Free, Starter (₺99), Pro (₺249), Enterprise (₺599)
- [x] Monthly credit allocation
- [x] Subscription page with plan comparison

### Onboarding
- [x] Goal selection (buy beats/sell beats/sell services/grow career/artwork)
- [x] Plan selection during onboarding
- [x] Post-registration redirect to onboarding

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- [ ] Real-time WebSocket messaging (replace polling)
- [ ] File upload to object storage (S3/R2) for beats/cover art
- [ ] Email notification system (order updates, dispute alerts)
- [ ] Playlist curator dashboard (public playlists)

### P1 (High Priority)
- [ ] Beat waveform visualization (WaveSurfer.js)
- [ ] Advanced analytics for producers (plays/revenue charts)
- [ ] Recommendation engine (genre-based)
- [ ] Sample packs (zip bundles)
- [ ] Social profiles (follow artists/producers)

### P2 (Future)
- [ ] Mobile app (React Native)
- [ ] Live streaming / DJ sessions
- [ ] NFT certificate for exclusive beats
- [ ] Iyzico/PayTR real payment integration
- [ ] Multi-language UI (Turkish/English toggle)
