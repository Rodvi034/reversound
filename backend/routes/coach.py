import os
import io
import re
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId

from database import get_db
from utils import doc_to_dict, docs_to_list
from auth import get_current_user
from emergentintegrations.llm.chat import LlmChat, UserMessage

coach_router = APIRouter(prefix="/coach", tags=["coach"])

def _build_system_prompt(user: dict) -> str:
    genres = ", ".join(user.get("genres", [])) or "çeşitli türler"
    role = user.get("role", "artist")
    goal = user.get("onboarding_goal", "müzik kariyerini geliştir")
    coach_profile = user.get("coach_profile", {})
    target_audience = coach_profile.get("target_audience", "geniş kitle")
    musical_style = coach_profile.get("musical_style", genres)
    equipment = coach_profile.get("current_equipment", "temel setup")
    tech_level = coach_profile.get("technical_level", "orta düzey")
    if isinstance(musical_style, list):
        musical_style = ", ".join(musical_style)

    return f"""Sen ReverSound platformunun deneyimli müzik endüstrisi danışmanısın — 20+ yıllık sektör tecrübesine sahip, gerçekten önem veren bir koç.

KESİN YAKLAŞIM:
- Önce sağlam, sadık bir hayran kitlesi inşa et — "hızlı para" yerine sürdürülebilir kariyer
- Her tavsiye, sanatçının GERÇEK durumuna göre kişiselleştirilmiş olmalı
- Türkiye müzik piyasası dinamiklerini derinlemesine biliyorsun
- Pratik, uygulanabilir adımlar — soyut tavsiyeden kaçın

KULLANICI PROFİLİ:
- Rol: {role} | Türler: {musical_style}
- Hedef Kitle: {target_audience} | Ekipman: {equipment}
- Teknik Deneyim: {tech_level} | Hedef: {goal}

TEMEL KURALLAR:
1. Önce FAN TABANINI İNŞA ET — algoritma değil, gerçek insanlar
2. Tutarlı içerik takvimi > viral hit arayışı
3. Her platformun (Spotify, YouTube, Instagram) farklı stratejisi var
4. Somut rakamlar ve zaman çerçeveleri kullan (örn: "3 ayda 500 gerçek takipçi")
5. Her mesajın sonunda SONRAKI ADIM'ı belirt

YANIT KURALLARI:
- Kullanıcı Türkçe yazıyorsa Türkçe, İngilizce yazıyorsa İngilizce yanıtla
- Maddeli liste + başlıklar + motivasyon dengesi. Maks 400 kelime."""

def _build_audio_analysis_prompt(user: dict, metadata: dict, user_question: str) -> str:
    return f"""Sen uzman bir ses mühendisi ve müzik analisti olarak görev yapıyorsun.
Kullanıcı sana bir ses dosyasının teknik meta verilerini ve analizini gönderiyor.

Kullanıcı: {user.get('name')} | Rol: {user.get('role')} | Türler: {', '.join(user.get('genres', []) or ['belirtilmemiş'])}

Ses Dosyası Meta Verileri:
- Dosya adı: {metadata.get('filename', 'bilinmiyor')}
- Format: {metadata.get('format', 'bilinmiyor')}
- Süre: {metadata.get('duration_str', 'bilinmiyor')}
- Bit hızı: {metadata.get('bitrate', 'bilinmiyor')} kbps
- Sample rate: {metadata.get('sample_rate', 'bilinmiyor')} Hz
- Kanallar: {metadata.get('channels', 'bilinmiyor')}
- Tahmini BPM aralığı: {metadata.get('estimated_bpm', 'analiz edilemedi')}
- Dosya boyutu: {metadata.get('size_mb', '?')} MB

Kullanıcının Sorusu: {user_question}

Lütfen şunları değerlendir (verilen meta verilere dayanarak):
1. **Teknik Kalite**: Bit hızı ve sample rate yeterli mi? Profesyonel yayın için uygun mu?
2. **Mix/Mastering**: Format ve süreye göre nasıl bir işlem gerekli olabilir?
3. **Piyasa Uyumu**: Bu tür ve süre için tipik platform gereksinimleri neler?
4. **Sonraki Adımlar**: Dosyayı nasıl optimize eder ve dağıtıma hazırlarsın?
5. **Genel Tavsiye**: Kullanıcının rolü ve türlerine göre 2-3 somut öneri.

Yanıtı Türkçe ver. Profesyonel ama motive edici bir ton kullan."""

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class AudioAnalysisRequest(BaseModel):
    storage_path: str   # path from object storage
    filename: str
    file_size: int      # bytes
    question: str = "Bu ses dosyasını analiz et ve geri bildirim ver."

def _extract_audio_metadata(path: str, filename: str, file_size: int) -> dict:
    """Extract metadata from stored audio file using mutagen."""
    metadata = {
        "filename": filename,
        "size_mb": round(file_size / (1024 * 1024), 2),
        "format": "unknown",
        "duration": None,
        "duration_str": "unknown",
        "bitrate": None,
        "sample_rate": None,
        "channels": None,
        "estimated_bpm": "—",
    }
    try:
        from routes.upload import get_object
        data, content_type = get_object(path)
        metadata["format"] = content_type.split("/")[-1].upper()

        # Try mutagen
        try:
            import mutagen
            from mutagen import File as MutagenFile
            audio = MutagenFile(io.BytesIO(data))
            if audio:
                info = audio.info
                if hasattr(info, 'length'):
                    dur = info.length
                    metadata["duration"] = dur
                    mins = int(dur // 60)
                    secs = int(dur % 60)
                    metadata["duration_str"] = f"{mins}:{secs:02d}"
                if hasattr(info, 'bitrate'):
                    metadata["bitrate"] = round(info.bitrate / 1000)
                if hasattr(info, 'sample_rate'):
                    metadata["sample_rate"] = info.sample_rate
                if hasattr(info, 'channels'):
                    metadata["channels"] = info.channels
        except Exception as me:
            # Fallback: estimate from file size
            if file_size > 0:
                est_dur_secs = (file_size * 8) / (128 * 1000)
                metadata["duration_str"] = f"~{int(est_dur_secs // 60)}:{int(est_dur_secs % 60):02d} (tahmini)"
                metadata["bitrate"] = 128
    except Exception as e:
        pass
    return metadata

@coach_router.get("/history")
async def get_history(request: Request):
    user = await get_current_user(request)
    db = get_db()
    session = await db.coach_sessions.find_one({"user_id": user["id"]})
    if not session:
        return {"messages": [], "session_id": None}
    result = doc_to_dict(session)
    return {"messages": result.get("messages", []), "session_id": result["id"]}

@coach_router.post("/chat")
async def chat_with_coach(body: ChatMessage, request: Request):
    user = await get_current_user(request)
    db = get_db()
    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(500, "AI service not configured")

    session = await db.coach_sessions.find_one({"user_id": user["id"]})
    if not session:
        session_doc = {"user_id": user["id"], "messages": [], "created_at": datetime.now(timezone.utc)}
        res = await db.coach_sessions.insert_one(session_doc)
        session_doc["_id"] = res.inserted_id
        session = session_doc

    session_id = str(session["_id"])

    user_msg_entry = {"role": "user", "content": body.message, "timestamp": datetime.now(timezone.utc).isoformat(), "type": "text"}

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"coach_{session_id}",
            system_message=_build_system_prompt(user)
        ).with_model("gemini", "gemini-3.1-pro-preview")

        response_text = await chat.send_message(UserMessage(text=body.message))

        ai_msg_entry = {"role": "assistant", "content": response_text, "timestamp": datetime.now(timezone.utc).isoformat(), "type": "text"}

        await db.coach_sessions.update_one(
            {"_id": session["_id"]},
            {"$push": {"messages": {"$each": [user_msg_entry, ai_msg_entry]}}}
        )
        return {"response": response_text, "session_id": session_id}
    except Exception as e:
        raise HTTPException(500, f"AI service error: {str(e)}")

@coach_router.post("/analyze-audio")
async def analyze_audio(body: AudioAnalysisRequest, request: Request):
    """Premium feature: AI analysis of uploaded audio files."""
    user = await get_current_user(request)
    db = get_db()

    llm_key = os.environ.get("EMERGENT_LLM_KEY")
    if not llm_key:
        raise HTTPException(500, "AI service not configured")

    # Extract metadata
    metadata = _extract_audio_metadata(body.storage_path, body.filename, body.file_size)

    # Build analysis prompt
    system_prompt = _build_audio_analysis_prompt(user, metadata, body.question)

    try:
        session_id = f"audio_analysis_{user['id']}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        chat = LlmChat(
            api_key=llm_key,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("gemini", "gemini-3.1-pro-preview")

        response_text = await chat.send_message(UserMessage(text=body.question))

        # Save to session history
        session = await db.coach_sessions.find_one({"user_id": user["id"]})
        if session:
            analysis_entry = {
                "role": "user",
                "content": f"[Ses Analizi: {body.filename}]\n{body.question}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "audio_analysis",
                "metadata": metadata
            }
            ai_entry = {
                "role": "assistant",
                "content": response_text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "audio_analysis_response"
            }
            await db.coach_sessions.update_one(
                {"_id": session["_id"]},
                {"$push": {"messages": {"$each": [analysis_entry, ai_entry]}}}
            )

        return {
            "analysis": response_text,
            "metadata": metadata,
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(500, f"Audio analysis failed: {str(e)}")

@coach_router.delete("/history")
async def clear_history(request: Request):
    user = await get_current_user(request)
    db = get_db()
    await db.coach_sessions.delete_one({"user_id": user["id"]})
    return {"message": "Chat history cleared"}
