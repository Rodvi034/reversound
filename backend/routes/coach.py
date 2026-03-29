import os
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
    genres = ", ".join(user.get("genres", [])) or "varied genres"
    role = user.get("role", "artist")
    goal = user.get("onboarding_goal", "grow career")
    return f"""Sen ReverSound AI Kariyer Koçu'sun - müzik endüstrisinde uzmanlaşmış bir danışmansın.
Uzmanlık alanların:
- Beat prodüksiyon ve sample oluşturma teknikleri
- Müzik pazarlama ve promosyon stratejileri
- Freelance müzik hizmetleri iş geliştirme
- Sanatçı marka inşası ve sosyal medya büyümesi
- Türkiye ve küresel müzik piyasası trendleri
- Müzik lisanslama ve telif hakkı rehberliği
- Streaming platformları stratejileri (Spotify, YouTube, Apple Music)

Kullanıcı Profili:
- Rol: {role}
- Türler: {genres}
- Hedef: {goal}

Kural: Yanıtların somut, kişiselleştirilmiş ve uygulanabilir olsun. Kullanıcı Türkçe yazıyorsa Türkçe, İngilizce yazıyorsa İngilizce yanıt ver.
Yanıtları yapılandırılmış, maddeler halinde ve motive edici tut. Maksimum 400 kelime."""

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

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

    # Get or create session
    session = await db.coach_sessions.find_one({"user_id": user["id"]})
    if not session:
        session_doc = {
            "user_id": user["id"],
            "messages": [],
            "created_at": datetime.now(timezone.utc)
        }
        result = await db.coach_sessions.insert_one(session_doc)
        session_doc["_id"] = result.inserted_id
        session = session_doc

    session_id = str(session["_id"])
    history = session.get("messages", [])

    # Save user message to history
    user_msg_entry = {
        "role": "user",
        "content": body.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    try:
        # Build context from history for the LLM
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"coach_{session_id}",
            system_message=_build_system_prompt(user)
        ).with_model("gemini", "gemini-3.1-pro-preview")

        response_text = await chat.send_message(UserMessage(text=body.message))

        ai_msg_entry = {
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Persist messages
        await db.coach_sessions.update_one(
            {"_id": session["_id"]},
            {"$push": {"messages": {"$each": [user_msg_entry, ai_msg_entry]}}}
        )

        return {
            "response": response_text,
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(500, f"AI service error: {str(e)}")

@coach_router.delete("/history")
async def clear_history(request: Request):
    user = await get_current_user(request)
    db = get_db()
    await db.coach_sessions.delete_one({"user_id": user["id"]})
    return {"message": "Chat history cleared"}
