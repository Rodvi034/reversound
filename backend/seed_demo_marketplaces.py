"""
Demo Marketplace Seeder — Sprint 10
Populates Studios and Gear with realistic Turkish market demo data.
Idempotent: only runs if collections are empty (or forced via admin command).
"""
from datetime import datetime, timezone, timedelta

# ── Demo Studios ─────────────────────────────────────────────────────────────
DEMO_STUDIOS = [
    {
        "name": "Istanbul Sound Studio",
        "description": (
            "İstanbul'un kalbinde, Karaköy'de konumlanan premium kayıt stüdyosu. "
            "SSL G-Series konsolu, Neve preamp'ları ve Genelec monitörlerle donanmış kontrol odası. "
            "Canlı oda, vokal kabini ve tam izoleli drum odası mevcut. "
            "Türkiye'nin önde gelen sanatçılarının tercih ettiği profesyonel ortam."
        ),
        "address": "Rıhtım Cad. No:12, Karaköy, Beyoğlu",
        "city": "İstanbul",
        "country": "Türkiye",
        "lat": 41.0221,
        "lng": 28.9742,
        "photos": [
            "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=500&fit=crop",
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=500&fit=crop",
            "https://images.unsplash.com/photo-1519683109079-d5f539e1542f?w=800&h=500&fit=crop",
        ],
        "hourly_rate": 350.0,
        "amenities": [
            "SSL G-Series Console", "Neve Preamps", "Genelec Monitors",
            "Vokal Kabini", "Full Davul Seti", "Pro Tools HD", "Logic Pro X",
            "Yüksek Hızlı WiFi", "Lounge Alan", "Catering", "Otopark"
        ],
        "equipment": [
            "Neumann U87 Condenser Mic", "AKG C414 x2", "Shure SM7B",
            "Universal Audio Apollo x8p", "Roland TR-8S Drum Machine",
            "Korg Minilogue XD Synthesizer", "Fender Stratocaster American"
        ],
        "max_capacity": 8,
        "rules": "Sigara içilmez. Gürültü saatleri: 09:00-23:00. Ekipman kullanımı için önceden bilgi alınız.",
        "owner_id": "demo",
        "owner_name": "Istanbul Sound Studio",
        "status": "active",
        "rating": 4.9,
        "total_reviews": 47,
        "total_views": 1240,
    },
    {
        "name": "Ankara Müzik Yapımevi",
        "description": (
            "Ankara Kızılay merkezinde, modern tasarımlı tam donanımlı kayıt stüdyosu. "
            "Ableton Live ve Pro Tools kurulu workstation'lar, 5.1 surround monitoring. "
            "Başlangıç seviyesinden profesyonele kadar tüm müzisyenlere uygun fiyatlarla."
        ),
        "address": "Atatürk Bulvarı No:89, Kızılay, Çankaya",
        "city": "Ankara",
        "country": "Türkiye",
        "lat": 39.9183,
        "lng": 32.8617,
        "photos": [
            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=500&fit=crop",
            "https://images.unsplash.com/photo-1571974599782-87624638275b?w=800&h=500&fit=crop",
        ],
        "hourly_rate": 200.0,
        "amenities": [
            "Pro Tools", "Ableton Live", "5.1 Surround Monitoring",
            "Vokal Kabini", "Focusrite Scarlett Interface",
            "Yüksek Hızlı WiFi", "Klima", "Otopark"
        ],
        "equipment": [
            "Audio-Technica AT2020 Condenser", "Shure SM58 Dynamic",
            "Roland A-88 MIDI Keyboard", "Maschine MK3",
            "ADAM Audio T7V Monitors x2"
        ],
        "max_capacity": 6,
        "rules": "24 saat hizmet. Ekipman hasarı kullanıcıya aittir.",
        "owner_id": "demo",
        "owner_name": "Ankara Müzik Yapımevi",
        "status": "active",
        "rating": 4.7,
        "total_reviews": 28,
        "total_views": 820,
    },
    {
        "name": "İzmir Sound Factory",
        "description": (
            "İzmir Konak'ta, Ege'nin en büyük kayıt ve prodüksiyon tesisi. "
            "3 bağımsız kayıt odası, Dolby Atmos mixing odası ve tam donanımlı mastering suite. "
            "Yerli ve yabancı sanatçılar için 24/7 açık, yüksek kapasiteli profesyonel ortam."
        ),
        "address": "Anafartalar Cad. No:67, Konak",
        "city": "İzmir",
        "country": "Türkiye",
        "lat": 38.4192,
        "lng": 27.1287,
        "photos": [
            "https://images.unsplash.com/photo-1567600794782-7e9b5b0f4a3e?w=800&h=500&fit=crop",
            "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&h=500&fit=crop",
        ],
        "hourly_rate": 280.0,
        "amenities": [
            "Neve 8078 Console", "Dolby Atmos Suite", "3 Bağımsız Oda",
            "Grand Piyano", "Full Davul Seti", "Vokal Kabini",
            "Canlı Oda", "Pro Tools Ultimate", "Kontrol Odası",
            "Catering", "Lounge Alan", "Yüksek Hızlı WiFi", "Otopark"
        ],
        "equipment": [
            "Neumann U67 Vintage Tube Mic", "AKG C12 VR",
            "Universal Audio 1176 Compressor", "Lexicon 480L Reverb",
            "Yamaha C5 Grand Piano", "Ludwig Classic Maple Drum Kit"
        ],
        "max_capacity": 12,
        "rules": "Stüdyo kuralları için yetkiliyle görüşünüz. Minimum 2 saatlik kiralama.",
        "owner_id": "demo",
        "owner_name": "İzmir Sound Factory",
        "status": "active",
        "rating": 4.8,
        "total_reviews": 63,
        "total_views": 2100,
    },
]

# ── Demo Gear Listings ────────────────────────────────────────────────────────
DEMO_GEAR = [
    {
        "title": "Fender Stratocaster American Professional II — 2021",
        "description": (
            "Meksika değil, ABD yapımı orijinal American Professional II. "
            "Ultra-Noiseless pickups, Deep C boyun profili. Kutusuz ama hiç kullanılmamış gibi. "
            "2021 alındı, 2022'den beri dolapta bekliyor. Sertifikasız ama faturası var."
        ),
        "price": 28000.0,
        "category": "guitars",
        "subcategory": "Elektro Gitar",
        "brand": "Fender",
        "condition": "Sıfır Gibi",
        "images": [
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=400&fit=crop",
        ],
        "city": "İstanbul",
        "is_negotiable": True,
        "seller_id": "demo",
        "seller_name": "MuratGuitar",
        "seller_username": "muratguitar",
        "status": "active",
        "views": 234,
    },
    {
        "title": "KRK Rokit 5 G4 — Çift (Stereo Çift)",
        "description": (
            "2023 alım, faturası mevcut. 2 adet KRK Rokit 5 G4 studio monitör. "
            "DSP ekolayzer ile stüdyoya özel akustik ayarı yapılmış. "
            "Orijinal kutularında, hiç hasarsız. Yurt dışından getirme."
        ),
        "price": 8500.0,
        "category": "studio",
        "subcategory": "Monitor Hoparlor",
        "brand": "KRK",
        "condition": "Sıfır Gibi",
        "images": [
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
        ],
        "city": "Ankara",
        "is_negotiable": False,
        "seller_id": "demo",
        "seller_name": "StudioAnkara",
        "seller_username": "studioankara",
        "status": "active",
        "views": 187,
    },
    {
        "title": "Shure SM7B — Broadcast Mikrofon + Boom Stand",
        "description": (
            "Podcast, vokal kayıt ve broadcast için endüstri standardı SM7B. "
            "1 yıl kullanıldı, kondisyon A+. Boom stand ve xlr kablo dahil. "
            "Yeni fiyatı 18.000₺, 12.000₺ istiyorum, pazarlık yok."
        ),
        "price": 12000.0,
        "category": "microphones",
        "subcategory": "Dynamic Mikrofon",
        "brand": "Shure",
        "condition": "İyi",
        "images": [
            "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&h=400&fit=crop",
        ],
        "city": "İzmir",
        "is_negotiable": False,
        "seller_id": "demo",
        "seller_name": "VokalStudio",
        "seller_username": "vokalstudio",
        "status": "active",
        "views": 312,
    },
    {
        "title": "Native Instruments Komplete Kontrol M32 — MIDI Klavye",
        "description": (
            "32 tuşlu NI Komplete Kontrol M32, Komplete Select 14 lisansı dahil. "
            "Scale ve chord mode, Smart Play özellikleri. USB bağlantılı, kablo dahil. "
            "6 ay kullanıldı, sıfır gibi. Orijinal ambalajında."
        ),
        "price": 4500.0,
        "category": "synths",
        "subcategory": "MIDI Klavye",
        "brand": "Native Instruments",
        "condition": "Sıfır Gibi",
        "images": [
            "https://images.unsplash.com/photo-1519683109079-d5f539e1542f?w=600&h=400&fit=crop",
        ],
        "city": "İstanbul",
        "is_negotiable": True,
        "seller_id": "demo",
        "seller_name": "BeatProducer34",
        "seller_username": "beatproducer34",
        "status": "active",
        "views": 156,
    },
    {
        "title": "Roland TR-8S Rhythm Performer — Davul Makinesi",
        "description": (
            "Roland TR-8S, tüm klasik TR davul sesi ile modern üretim kapasitesi. "
            "Sample import, efektler ve sekans editörü dahil. "
            "Orijinal TR-808, TR-909 sesleri fabrika yüklü. 18 ay kullanıldı."
        ),
        "price": 18500.0,
        "category": "drums",
        "subcategory": "Elektronik Davul",
        "brand": "Roland",
        "condition": "İyi",
        "images": [
            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop",
        ],
        "city": "İstanbul",
        "is_negotiable": True,
        "seller_id": "demo",
        "seller_name": "DrummerTR",
        "seller_username": "drummertr",
        "status": "active",
        "views": 423,
    },
    {
        "title": "Focusrite Scarlett 2i2 4th Gen — Ses Kartı",
        "description": (
            "Focusrite Scarlett 2i2 4. nesil, en çok satan USB ses kartı. "
            "Air modu ile vintage preamp simulasyonu. 2 XLR/TRS combo giriş. "
            "3 ay kullanıldı, kutusu ve kablo dahil. Garantisi devam ediyor."
        ),
        "price": 4200.0,
        "category": "studio",
        "subcategory": "Ses Kartı",
        "brand": "Focusrite",
        "condition": "Sıfır Gibi",
        "images": [
            "https://images.unsplash.com/photo-1571974599782-87624638275b?w=600&h=400&fit=crop",
        ],
        "city": "Ankara",
        "is_negotiable": True,
        "seller_id": "demo",
        "seller_name": "HomeStudio06",
        "seller_username": "homestudio06",
        "status": "active",
        "views": 98,
    },
]


async def seed_demo_marketplaces(db, force: bool = False):
    """Seed studios and gear listings if empty (idempotent)."""
    now = datetime.now(timezone.utc)
    results = {"studios_seeded": 0, "gear_seeded": 0}

    # Studios
    studio_count = await db.studios.count_documents({})
    if studio_count == 0 or force:
        if force:
            await db.studios.delete_many({"owner_id": "demo"})
        for studio_data in DEMO_STUDIOS:
            total_rate = round(studio_data["hourly_rate"] * 1.15, 2)
            doc = {
                **studio_data,
                "total_rate": total_rate,
                "commission_rate": 0.15,
                "created_at": now
            }
            await db.studios.insert_one(doc)
        results["studios_seeded"] = len(DEMO_STUDIOS)

    # Gear
    gear_count = await db.gear_listings.count_documents({})
    if gear_count == 0 or force:
        if force:
            await db.gear_listings.delete_many({"seller_id": "demo"})
        for gear_data in DEMO_GEAR:
            await db.gear_listings.insert_one({
                **gear_data,
                "created_at": now
            })
        results["gear_seeded"] = len(DEMO_GEAR)

    return results
