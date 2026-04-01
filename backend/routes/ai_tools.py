"""
Rever Studio AI Tools Routes
- POST /api/studio-tools/bpm-key — BPM & Key analysis
- POST /api/studio-tools/stem-split — Stem separation
- POST /api/studio-tools/master — AI mastering
"""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional

from auth import get_current_user

studio_tools_router = APIRouter(prefix="/studio-tools", tags=["studio_tools"])

@studio_tools_router.post("/bpm-key")
async def analyze_bpm_key(
    file: UploadFile = File(...),
    request: Request = None
):
    """Upload audio file and get BPM + Key analysis via librosa."""
    if request:
        await get_current_user(request)
    
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large. Max 50MB for analysis.")
    
    audio_data = await file.read()
    if len(audio_data) > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large.")
    
    from services.ai_tools import analyze_bpm_key
    result = await analyze_bpm_key(audio_data)
    
    if "error" in result:
        raise HTTPException(500, f"Analysis failed: {result['error']}")
    
    return {
        "filename": file.filename,
        "file_size_mb": round(len(audio_data) / (1024 * 1024), 2),
        **result
    }

@studio_tools_router.post("/stem-split")
async def stem_split(
    file: UploadFile = File(...),
    model: str = Form("htdemucs"),
    request: Request = None
):
    """Stem separation (vocals, drums, bass, other)."""
    if request:
        await get_current_user(request)
    
    audio_data = await file.read()
    from services.ai_tools import stem_split as _split
    result = await _split(audio_data, file.filename or "audio.mp3")
    result["filename"] = file.filename
    result["model_used"] = model
    return result

@studio_tools_router.post("/master")
async def ai_master(
    file: UploadFile = File(...),
    target_loudness: float = Form(-14.0),
    request: Request = None
):
    """AI mastering to streaming platform standards."""
    if request:
        await get_current_user(request)
    
    if target_loudness < -23 or target_loudness > -6:
        raise HTTPException(400, "target_loudness must be between -23 and -6 LUFS")
    
    audio_data = await file.read()
    from services.ai_tools import ai_master as _master
    result = await _master(audio_data, target_loudness)
    result["filename"] = file.filename
    result["target_loudness_lufs"] = target_loudness
    return result
