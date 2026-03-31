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

## Implemented Features (v8.0 — Sprint 8 — 2026-03-31)

### Sprint 8 Additions (Enterprise Infrastructure)
- [x] **PDF License Contracts** — `GET /api/orders/{id}/contract` generates professional PDF using fpdf2: parties info, beat details, license tier with full terms (Basic/Premium/Exclusive), governing law, signature lines, ReverSound branding
- [x] **PDF Invoices** — `GET /api/orders/{id}/invoice` generates standard invoice PDF: invoice number, itemized list, platform fee breakdown, escrow payment status
- [x] **PDF Downloads in Orders UI** — "Lisans Belgesi" + "Fatura" download links appear on completed orders in OrderManagement page
- [x] **AI Content Moderation (3-tier)** — `services/moderation_service.py`: BLOCKED (extreme content: CSAM, illegal weapons/drugs, hate speech, copyright fraud), FLAGGED→admin queue (profanity, adult signals, piracy), OK. Applied on gig creation and beat uploads
- [x] **Copyright Fingerprinting Architecture** — `services/copyright_service.py`: `CopyrightCheckService` class with full ACRCloud API integration (HMAC-SHA1 signing, multipart audio upload). Mock mode returns CLEAR when `ACRCLOUD_API_KEY` not set. Triggered on every beat upload
- [x] **Admin CMS** — `/api/cms` (GET public, PUT admin, PATCH section, POST reset). Manages: hero text, badge, stats numbers, genre card images/colors, partner logos, announcement banner, testimonials. `AdminCMS.js` component with live editing in Admin Portal CMS tab
- [x] **CMS-Driven Landing Page** — Landing page fetches CMS content on mount; hero title/badge, stats, genre cards, testimonials all dynamically loaded from DB with static fallbacks
- [x] **Gig Video Preview + Portfolio Gallery** — `preview_video_url` field (YouTube embed or MP4) shown as video player on GigDetail. `portfolio_images[]` shown as clickable image grid. Both fields added to CreateGig form
- [x] **Dark Mode Permanently Enforced** — `ThemeContext.toggleTheme()` is no-op, always `isDark=true`. Sun/Moon toggle button removed from Navbar. All `.light-mode { }` CSS rules stripped from index.css

### Sprint 7 Additions (Pre-Launch Polish)
- [x] **Professional Beat Purchase Flow** — BuyModal removed. All beat purchases now go through `LicenseModal` (3-tier comparison: Basic Lease / Premium Lease / Exclusive Rights) → `CartContext.addItem()` → `CartDrawer` → `/checkout`. Clear feature matrix, legal rights info, micro-animations
- [x] **Centralized Checkout Page** — `/checkout` processes beats (via `/api/beats/{id}/purchase`), subscriptions, and Rever Studio plans from a unified order summary with wallet balance display and insufficient balance warning + topup CTA
- [x] **Universal Favorites** — Heart buttons on ALL beat surfaces: BeatMarketplace rows (hover-reveal), GlobalPlayer (persistent), LicenseModal header. Connected to `FavoritesContext` with animated toggle
- [x] **GlobalPlayer Upgrade** — Heart toggle + "Satın Al" button (opens LicenseModal) added to sticky player; LicenseModal shown for currently playing beat
- [x] **Dead Links Eliminated** — `/blog/{id}` (BlogPostDetail), `/blog/create` (CreateBlogPost with UpsellModal gate), `/jobs/{id}` (JobRequestDetail), `/checkout` all fully built
- [x] **Job Proposal Comparison View** — `/jobs/{id}` shows job brief + proposals in side-by-side grid: price, delivery, seller avatar, portfolio link, "Onayla & Escrow Oluştur" one-click accept
- [x] **Rever Studio Billing** — `POST /api/studio/subscribe?tier=studio_X` deducts wallet balance, sets `user.studio_tier`, creates 30-day subscription record. GET /api/studio/plans + GET /api/studio/my
- [x] **Logo Sizing** — Logo upgraded from `size="md"` to `size="lg"` in Navbar; Auth page uses `size="xl"` with glow effect; TEXT_SIZES map added to Logo component
- [x] **URL Params in BeatMarketplace** — `/beats?genre=Trap` initializes genre filter, `/beats?type=pack` initializes item type filter on page load

### Sprint 6 Additions
- [x] **BeatStars-Inspired Navbar** — Grouped "Keşfet" dropdown (7 items), "Oluştur" dropdown (role-filtered), search bar with category selector, Cart badge icon, notification bell, theme/lang toggles, "Start Selling" CTA
- [x] **Global Cart System** — CartContext (localStorage-backed), CartDrawer (slide-in), "Add to Cart" + "Sepete Ekle" buttons on beats, bulk checkout from wallet
- [x] **Favorites System** — FavoritesContext (API-backed), heart buttons on all beat cards, `/favorites` page with tabbed beat/gig lists, toggle API
- [x] **New Landing Page** — Full-screen hero with center search bar (BeatStars style), Trending Tracks horizontal carousel cards with price buttons, "Trusted By" dual-direction marquee, "Made on ReverSound" alternating vertical scroll, Popular Genres vertical card grid, Testimonials, AI Coach CTA, full footer
- [x] **Custom Offers in Chat** — `POST /api/conversations/{id}/offer`, accept/decline endpoints, escrow creation on accept
- [x] **Upsell Modal** — `UpsellModal.js` component for feature gating with tier benefits + upgrade CTA
- [x] **Job Requests Board** — `/jobs` page, buyers post project briefs, sellers submit proposals with price/delivery, category filtering
- [x] **Blog System** — `/blog` page, post listing by category, admin/Pro creators can publish
- [x] **Rever Studio Landing** — `/studio` page with feature grid, 3-tier independent billing (Basic ₺149/Pro ₺399/Elite ₺799), "coming soon" status
- [x] **My Roadmap** — `/roadmap` gamified career dashboard with 8 milestones, XP system, real stats integration, AI Coach CTA
- [x] **Public Profile** — `/u/{username}` with full OG meta tags for social sharing, tabs for beats/gigs/packs, alternating vertical scroll reference
- [x] **MarqueeLogos Component** — CSS-animated dual-direction horizontal marquee, AlternatingScroll two-column vertical
- [x] **UpsellModal Component** — Premium feature gate with tier comparison + upgrade flow

### Sprint 4 Additions
- [x] **Pro Analytics Dashboard** — Recharts-powered dashboard at `/analytics` (gated Pro/Enterprise): revenue LineChart, beat play heatmap (7-day × 24h grid), gig conversion BarChart, audience demographics PieChart, top beats performance table
- [x] **Analytics Tier Gating** — Free/Starter blocked with paywall + upgrade CTA; admin role bypasses tier check
- [x] **Notification Engine** — `notifications` collection, CRUD endpoints, `notification_service.py` creates+pushes; `NotificationCenter` bell with real-time WebSocket push, unread badge counter, mark read/all read
- [x] **Order Notification Triggers** — Order funded/delivered/completed/cancelled events auto-create notifications for both buyer and seller
- [x] **Redis-Ready LiveRoom** — Dual-backend state manager (Redis when `REDIS_URL` env is set, in-memory fallback); graceful degradation logged
- [x] **Iyzico Mock Payment Architecture** — Full marketplace payment flow: sub-merchant registration, checkout form init with HTML form, mock approve webhook, escrow release with 90/10 split, payout records
- [x] **Beat Play Event Tracking** — Each play logs to `play_events` collection with `hour` and `day_of_week` for heatmap aggregation
- [x] **Gig View Tracking** — `total_views` counter incremented on gig detail fetch for conversion rate analytics
- [x] **Sound Pack Previewer** — `PackDetail.js` page at `/packs/{id}` with mini-playlist player for individual preview tracks, WaveformBars sync
- [x] **Preview Tracks in Upload** — UploadBeat form has dynamic preview track list (up to 5) for Sound Pack type
- [x] **Pack Type Badge** — Beat marketplace shows "PACK" badge on pack items with link to PackDetail

### Sprint 3 Additions
- [x] **Order Detail Page** — `/orders/{id}` with interactive progress tracker (funded→in_progress→delivered→completed), integrated WebSocket chat per order, file attachments, delivery submission, buyer approve/revision flow
- [x] **Order Revision System** — Seller start/deliver, buyer approve/request-revision with revision counter
- [x] **AI Audio Analysis** — Upload audio files to coach, mutagen metadata extraction (format/duration/bitrate/sample_rate), Gemini 3.1 Pro analysis with specialized prompt
- [x] **Feed Hashtag System** — Auto-extraction of #hashtags on post create, clickable hashtag links, hashtag filter (`/feed?hashtag=mixingtips`)
- [x] **Trending Topics Sidebar** — MongoDB aggregation of top hashtags, desktop sidebar on Studio Feed
- [x] **Support Center** — `/support` page with ticket creation, category system, reply thread, admin management. Floating SupportWidget on all pages
- [x] **Live Collaboration Room** — `/liveroom` WebSocket room, host/guest roles, host controls playback, room chat, shareable link
- [x] **i18n System** — Full TR/EN translation context with 80+ keys, language toggle in Navbar, persisted in localStorage
- [x] **Light/Dark Mode** — ThemeContext with CSS class toggling, premium light theme, persisted in localStorage, toggle in Navbar
- [x] **Waveform Peak Caching** — Mutagen-powered audio metadata extraction on file upload for backend analysis

### Sprint 2 Additions
- [x] **Object Storage** — Emergent Storage API for audio (.mp3/.wav/.flac), pack (.zip), image uploads
- [x] **FileUpload Component** — Drag & drop with chunked upload, progress bar, error handling
- [x] **Sound Pack Support** — `item_type` field (beat|pack), marketplace type filter
- [x] **WaveSurfer.js** — Waveform visualization in GlobalPlayer (v7.12.5)
- [x] **WebSocket Messaging** — Real-time 1-on-1 messaging replaces 5s polling
- [x] **Studio Feed** — Authenticated-only microblog with AI/regex moderation
- [x] **Feed Moderation** — Profanity list, spam patterns, URL blocking (zero tolerance)
- [x] **Playlist Curation** — Public playlists + artist track submission + jury system
- [x] **Skeleton Loaders** — Card, beat row, post, stat skeleton components
- [x] **Beat Marketplace** — Type filter row (Tümü/Beat/Sound Pack)
- [x] **Updated Navbar** — Feed + Playlist links, updated BottomNav

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
