from datetime import datetime, timezone

BEAT_COVER = "https://static.prod-images.emergentagent.com/jobs/8d651a01-9aa6-4ca1-8c99-7adb0f65b5e1/images/4353e7abc8a5458c35dfe98b8c3055921ced3b34150def14fa5bec17b9dd0e42.png"
GIG_COVER_1 = "https://images.unsplash.com/photo-1622386010273-646e12d1c02f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwzfHxkaiUyMGNvbnNvbGV8ZW58MHx8fHwxNzc0NzgzMDkyfDA&ixlib=rb-4.1.0&q=85"
GIG_COVER_2 = "https://images.unsplash.com/photo-1537215685160-2496ed0c0aed?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwxfHxkaiUyMGNvbnNvbGV8ZW58MHx8fHwxNzc0NzgzMDkyfDA&ixlib=rb-4.1.0&q=85"

DEMO_BEATS = [
    {
        "producer_id": "demo", "producer_name": "TrapcStarTR", "producer_username": "trapcstar",
        "title": "Dark Trap 808", "genre": "Trap", "bpm": 140, "key": "Cm",
        "tags": ["trap", "dark", "808", "drill"],
        "description": "Hard hitting trap beat with heavy 808 basslines. Perfect for rap and drill artists.",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "cover_url": BEAT_COVER,
        "licenses": [
            {"type": "basic", "price": 25, "rights": "Non-exclusive MP3 lease"},
            {"type": "premium", "price": 75, "rights": "Non-exclusive WAV + stems"},
            {"type": "exclusive", "price": 350, "rights": "Full exclusive rights + contract"}
        ],
        "plays": 2450, "purchases": 47, "status": "approved",
    },
    {
        "producer_id": "demo", "producer_name": "LofiStudio", "producer_username": "lofistudio",
        "title": "Chill Lo-Fi Study", "genre": "Lo-Fi", "bpm": 85, "key": "Fm",
        "tags": ["lofi", "chill", "study", "jazz"],
        "description": "Smooth lo-fi hip hop beat with warm vinyl textures. Great for content creators.",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        "cover_url": BEAT_COVER,
        "licenses": [
            {"type": "basic", "price": 15, "rights": "Non-exclusive MP3 lease"},
            {"type": "premium", "price": 45, "rights": "Non-exclusive WAV + stems"},
            {"type": "exclusive", "price": 200, "rights": "Full exclusive rights"}
        ],
        "plays": 5820, "purchases": 112, "status": "approved",
    },
    {
        "producer_id": "demo", "producer_name": "TechnoGod", "producer_username": "technogod",
        "title": "Berlin Warehouse", "genre": "Techno", "bpm": 138, "key": "Am",
        "tags": ["techno", "berlin", "rave", "electronic"],
        "description": "Pure Berlin techno energy. Industrial sound design meets 4/4 groove.",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        "cover_url": BEAT_COVER,
        "licenses": [
            {"type": "basic", "price": 35, "rights": "Non-exclusive MP3 lease"},
            {"type": "premium", "price": 100, "rights": "Non-exclusive WAV + stems"},
            {"type": "exclusive", "price": 500, "rights": "Full exclusive rights"}
        ],
        "plays": 1890, "purchases": 23, "status": "approved",
    },
    {
        "producer_id": "demo", "producer_name": "PopKingTR", "producer_username": "popking",
        "title": "Summer Pop Anthem", "genre": "Pop", "bpm": 120, "key": "G",
        "tags": ["pop", "summer", "radio", "catchy"],
        "description": "Radio-ready pop production with shimmering synths and infectious chorus.",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        "cover_url": BEAT_COVER,
        "licenses": [
            {"type": "basic", "price": 30, "rights": "Non-exclusive MP3 lease"},
            {"type": "premium", "price": 90, "rights": "Non-exclusive WAV + stems"},
            {"type": "exclusive", "price": 400, "rights": "Full exclusive rights"}
        ],
        "plays": 3340, "purchases": 68, "status": "approved",
    },
    {
        "producer_id": "demo", "producer_name": "DrillBoss", "producer_username": "drillboss",
        "title": "UK Drill Night", "genre": "Drill", "bpm": 142, "key": "Bm",
        "tags": ["drill", "uk", "dark", "bass"],
        "description": "Authentic UK drill vibes with sliding bass and menacing atmosphere.",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
        "cover_url": BEAT_COVER,
        "licenses": [
            {"type": "basic", "price": 30, "rights": "Non-exclusive MP3 lease"},
            {"type": "premium", "price": 80, "rights": "Non-exclusive WAV + stems"},
            {"type": "exclusive", "price": 400, "rights": "Full exclusive rights"}
        ],
        "plays": 1650, "purchases": 31, "status": "approved",
    },
    {
        "producer_id": "demo", "producer_name": "HipHopHero", "producer_username": "hiphophero",
        "title": "Golden Era Boom Bap", "genre": "Hip-Hop", "bpm": 92, "key": "Dm",
        "tags": ["boom bap", "golden era", "sample", "hiphop"],
        "description": "Classic boom bap with thick drums and soulful samples.",
        "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
        "cover_url": BEAT_COVER,
        "licenses": [
            {"type": "basic", "price": 20, "rights": "Non-exclusive MP3 lease"},
            {"type": "premium", "price": 60, "rights": "Non-exclusive WAV + stems"},
            {"type": "exclusive", "price": 280, "rights": "Full exclusive rights"}
        ],
        "plays": 4200, "purchases": 89, "status": "approved",
    },
]

DEMO_GIGS = [
    {
        "seller_id": "demo", "seller_name": "MixMaster Pro", "seller_username": "mixmaster",
        "seller_avatar": "",
        "title": "Professional Mixing & Mastering Service",
        "description": "I will mix and master your tracks to industry standard. 10+ years experience. Worked with artists across Turkey, Europe and US. Certified Waves and iZotope engineer.",
        "category": "Mixing & Mastering",
        "cover_url": GIG_COVER_1,
        "tags": ["mixing", "mastering", "professional", "certified"],
        "tiers": {
            "basic": {"price": 150, "delivery_days": 3, "description": "Stereo mix + master for 1 song", "revisions": 2, "features": ["Stereo mix", "Mastering", "2 revisions"]},
            "standard": {"price": 300, "delivery_days": 5, "description": "Full mix with stems + master", "revisions": 3, "features": ["Stem mixing", "Mastering", "3 revisions", "Reference track matching"]},
            "premium": {"price": 600, "delivery_days": 7, "description": "EP package (up to 5 tracks)", "revisions": 5, "features": ["5 tracks", "Stem mixing", "Mastering", "Unlimited revisions", "Dolby Atmos ready"]}
        },
        "rating": 4.9, "total_reviews": 127, "total_orders": 340, "status": "approved",
    },
    {
        "seller_id": "demo", "seller_name": "BeatArchitect", "seller_username": "beatarchitect",
        "seller_avatar": "",
        "title": "Custom Trap & Drill Beat Production",
        "description": "I produce custom trap, drill and hip-hop beats tailored exactly to your vision. Your brief, my craft. Top quality sound design.",
        "category": "Beat Production",
        "cover_url": GIG_COVER_2,
        "tags": ["trap", "drill", "custom", "production"],
        "tiers": {
            "basic": {"price": 200, "delivery_days": 4, "description": "1 custom beat (MP3 only)", "revisions": 1, "features": ["Custom beat", "MP3 delivery", "1 revision"]},
            "standard": {"price": 400, "delivery_days": 6, "description": "1 custom beat with stems", "revisions": 3, "features": ["Custom beat", "WAV + stems", "3 revisions", "Exclusive rights"]},
            "premium": {"price": 750, "delivery_days": 10, "description": "3 custom beats with full rights", "revisions": 5, "features": ["3 custom beats", "WAV + stems", "Unlimited revisions", "Full exclusive package"]}
        },
        "rating": 4.8, "total_reviews": 89, "total_orders": 215, "status": "approved",
    },
    {
        "seller_id": "demo", "seller_name": "CoverDesignTR", "seller_username": "coverdesign",
        "seller_avatar": "",
        "title": "Stunning Album & Single Cover Art",
        "description": "Professional music cover art design. Spotify, Apple Music ready. Dark, cinematic, minimalist — you choose your style.",
        "category": "Cover Art",
        "cover_url": GIG_COVER_1,
        "tags": ["cover art", "design", "album", "spotify"],
        "tiers": {
            "basic": {"price": 50, "delivery_days": 2, "description": "1 cover concept, 1 format", "revisions": 2, "features": ["1 concept", "3000x3000px", "2 revisions"]},
            "standard": {"price": 120, "delivery_days": 3, "description": "3 concepts, all formats", "revisions": 4, "features": ["3 concepts", "All formats", "4 revisions", "Source files"]},
            "premium": {"price": 250, "delivery_days": 5, "description": "Full visual identity package", "revisions": 10, "features": ["5+ concepts", "Full branding", "Social media kit", "Unlimited revisions"]}
        },
        "rating": 4.7, "total_reviews": 203, "total_orders": 510, "status": "approved",
    },
    {
        "seller_id": "demo", "seller_name": "VocalCoachTR", "seller_username": "vocalcoach",
        "seller_avatar": "",
        "title": "Professional Vocal Recording & Tuning",
        "description": "Record, edit and tune your vocals to perfection. Remote sessions available. Melodyne certified.",
        "category": "Vocal Production",
        "cover_url": GIG_COVER_2,
        "tags": ["vocals", "recording", "tuning", "melodyne"],
        "tiers": {
            "basic": {"price": 100, "delivery_days": 3, "description": "Basic vocal edit + tuning", "revisions": 2, "features": ["Vocal editing", "Pitch correction", "2 revisions"]},
            "standard": {"price": 200, "delivery_days": 4, "description": "Full vocal production", "revisions": 3, "features": ["Recording", "Editing", "Tuning", "Harmonies", "3 revisions"]},
            "premium": {"price": 400, "delivery_days": 7, "description": "EP vocal production (5 tracks)", "revisions": 5, "features": ["5 tracks", "Full production", "Unlimited revisions", "Stems delivery"]}
        },
        "rating": 4.6, "total_reviews": 67, "total_orders": 145, "status": "approved",
    },
]

async def seed_demo_data(db):
    """Seed demo beats and gigs if collections are empty"""
    now = datetime.now(timezone.utc)

    if await db.beats.count_documents({}) == 0:
        docs = [{**b, "created_at": now} for b in DEMO_BEATS]
        await db.beats.insert_many(docs)

    if await db.gigs.count_documents({}) == 0:
        docs = [{**g, "created_at": now} for g in DEMO_GIGS]
        await db.gigs.insert_many(docs)
