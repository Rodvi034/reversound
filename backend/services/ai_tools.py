"""
Rever Studio AI Tools Service
- BPM & Key Detection: librosa (real analysis)
- Stem Splitter: Architecture wrapper (Demucs/Spleeter via external API)
- AI Mastering: Dolby.io Media API wrapper
"""
import io
import os
import asyncio
import logging
import numpy as np

logger = logging.getLogger(__name__)

async def analyze_bpm_key(audio_data: bytes) -> dict:
    """Real BPM and key detection using librosa."""
    try:
        import librosa
        y, sr = await asyncio.get_event_loop().run_in_executor(
            None, lambda: librosa.load(io.BytesIO(audio_data), sr=22050, mono=True)
        )

        def _analyze():
            # BPM
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            bpm = float(tempo) if not isinstance(tempo, np.ndarray) else float(tempo[0])

            # Key via Krumhansl-Schmuckler key-finding algorithm
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
            chroma_mean = np.mean(chroma, axis=1)

            NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
            MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

            major_scores = [np.corrcoef(chroma_mean, np.roll(MAJOR, i))[0, 1] for i in range(12)]
            minor_scores = [np.corrcoef(chroma_mean, np.roll(MINOR, i))[0, 1] for i in range(12)]

            bm = int(np.argmax(major_scores))
            bmin = int(np.argmax(minor_scores))

            if major_scores[bm] > minor_scores[bmin]:
                key, mode = NOTES[bm], "Major"
                confidence = float(major_scores[bm])
            else:
                key, mode = NOTES[bmin] + "m", "Minor"
                confidence = float(minor_scores[bmin])

            # Energy + spectral features
            rms = float(np.mean(librosa.feature.rms(y=y)))
            spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))

            return {
                "bpm": round(bpm, 1),
                "key": key,
                "mode": mode,
                "confidence": round(max(0.0, min(1.0, confidence)), 2),
                "energy": round(rms * 1000, 2),
                "brightness": round(spectral_centroid / 5000, 2),
                "duration_seconds": round(len(y) / sr, 1),
            }

        return await asyncio.get_event_loop().run_in_executor(None, _analyze)

    except ImportError:
        return {"error": "librosa not installed", "bpm": None, "key": None}
    except Exception as e:
        logger.error(f"BPM/Key analysis error: {e}")
        return {"error": str(e), "bpm": None, "key": None}


async def stem_split(audio_data: bytes, filename: str = "audio.mp3") -> dict:
    """
    Stem splitting architecture wrapper.
    Production: Connect to Demucs API (https://github.com/facebookresearch/demucs)
    or Spleeter (https://github.com/deezer/spleeter).
    Requires STEM_SPLIT_API_URL env var for external processing.
    """
    api_url = os.environ.get("STEM_SPLIT_API_URL", "")
    if api_url:
        try:
            import aiohttp
            form_data = aiohttp.FormData()
            form_data.add_field("audio", audio_data, filename=filename, content_type="audio/mpeg")
            form_data.add_field("model", "htdemucs")
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{api_url}/split", data=form_data, timeout=120) as resp:
                    result = await resp.json()
                    return result
        except Exception as e:
            logger.error(f"Stem split API error: {e}")

    # Mock response with architecture
    return {
        "status": "queued",
        "job_id": f"stem_{id(audio_data):x}",
        "stems": {
            "vocals": None,
            "drums": None,
            "bass": None,
            "other": None,
        },
        "model": "htdemucs",
        "message": "Stem splitting queued. Set STEM_SPLIT_API_URL to activate (e.g., Demucs Docker container).",
        "mock": True,
    }


async def ai_master(audio_data: bytes, target_loudness: float = -14.0) -> dict:
    """
    AI Mastering via Dolby.io Media API.
    Production: Set DOLBY_APP_KEY + DOLBY_APP_SECRET in .env.
    """
    app_key = os.environ.get("DOLBY_APP_KEY", "")
    app_secret = os.environ.get("DOLBY_APP_SECRET", "")

    if app_key and app_secret:
        try:
            import aiohttp, base64
            auth = base64.b64encode(f"{app_key}:{app_secret}".encode()).decode()
            # Dolby.io Media API mastering flow
            async with aiohttp.ClientSession() as session:
                # 1. Get upload URL
                async with session.post(
                    "https://api.dolby.io/media/input",
                    headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
                    json={"url": "dlb://in/input.mp3"}
                ) as resp:
                    upload_data = await resp.json()
                    upload_url = upload_data.get("url")
                if upload_url:
                    await session.put(upload_url, data=audio_data)
                    # 2. Enhance/master
                    async with session.post(
                        "https://api.dolby.io/media/enhance",
                        headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
                        json={
                            "input": "dlb://in/input.mp3",
                            "output": "dlb://out/mastered.mp3",
                            "audio": {"loudness": {"enable": True, "target_level": target_loudness}}
                        }
                    ) as resp:
                        job = await resp.json()
                        return {"job_id": job.get("job_id"), "status": "processing", "provider": "dolby_io"}
        except Exception as e:
            logger.error(f"Dolby mastering error: {e}")

    # Analyze with librosa if available
    try:
        import librosa
        y, sr = librosa.load(io.BytesIO(audio_data), sr=44100, mono=False)
        duration = len(y) / sr if y.ndim == 1 else y.shape[1] / sr
        return {
            "status": "analysis_complete",
            "duration_seconds": round(duration, 1),
            "recommended_settings": {
                "target_loudness_lufs": target_loudness,
                "true_peak": -1.0,
                "eq_boost_hz": 12000,
                "compression_ratio": "4:1",
                "limiter_ceiling": -0.1,
            },
            "message": "Set DOLBY_APP_KEY + DOLBY_APP_SECRET to enable real mastering. Alternatively, use iZotope Ozone or Adobe Audition.",
            "mock": True,
        }
    except Exception:
        return {
            "status": "architecture_ready",
            "message": "AI Mastering ready. Set DOLBY_APP_KEY + DOLBY_APP_SECRET for real processing.",
            "mock": True,
        }
