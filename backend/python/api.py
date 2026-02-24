import sys, os
# Force UTF-8 output on Windows to handle emoji/Indic characters in print()
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from rag_service import PregnancyRAGService
from langchain_core.messages import HumanMessage, AIMessage
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from langchain_groq import ChatGroq
import httpx
import json

from pathlib import Path
# Load .env from parent dir (backend/) or current dir
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
else:
    load_dotenv()  # fallback: current directory

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

app = FastAPI(title="Janani Voice RAG API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── MongoDB Connection ─────────────────────────────────────────────────────
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://apoorv13:wmxfzy5ZPQJY5P7L@cluster0.dzdexwp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)
mongo_client = AsyncIOMotorClient(MONGO_URI)
db = mongo_client.get_default_database("test")
health_logs_collection = db["healthlogs"]

# ─── Initialize RAG Service ─────────────────────────────────────────────────
service = PregnancyRAGService()

# ─── Initialize Groq LLMs (Fallbacks) ───────────────────────────────────────
translator_llm = ChatGroq(
    temperature=0,
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY")
)
clinical_llm = ChatGroq(
    temperature=0.2,
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY")
)


# ─── Pydantic Models ─────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    language_code: str = "hi-IN"
    patient_data: str = "Mother is 2nd week of pregnancy, general wellness query."
    history: List[ChatMessage] = []
    user_phone: Optional[str] = None
    user_email: Optional[str] = None
    user_name:  Optional[str] = None
    source: str = "website"  # "website" | "voice_call"


# ─── Sarvam Translate (with Groq fallback) ───────────────────────────────────
async def translate_text_indic(text: str, source_lang: str, target_lang: str) -> str:
    """Translate via Sarvam AI first; fall back to Groq on failure."""
    if not text or not text.strip():
        return text

    s = source_lang.lower().strip()
    t = target_lang.lower().strip()
    if s == t or (s.startswith('en') and t.startswith('en')):
        return text   # nothing to do

    LANG_MAP = {
        'hindi': 'hi-IN', 'punjabi': 'pa-IN', 'marathi': 'mr-IN', 'bengali': 'bn-IN',
        'telugu': 'te-IN', 'tamil': 'ta-IN', 'gujarati': 'gu-IN', 'kannada': 'kn-IN',
        'malayalam': 'ml-IN', 'odia': 'or-IN', 'assamese': 'as-IN', 'urdu': 'ur-IN',
        'sanskrit': 'sa-IN', 'english': 'en-IN'
    }

    src_code = LANG_MAP.get(s, source_lang)
    tgt_code = LANG_MAP.get(t, target_lang)
    if src_code.lower().startswith('en'): src_code = 'en-IN'
    if tgt_code.lower().startswith('en'): tgt_code = 'en-IN'

    # 1️⃣  Try Sarvam Translate
    try:
        print(f"🌐 Sarvam Translate: {src_code} → {tgt_code}")
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                "https://api.sarvam.ai/translate",
                json={
                    "input": text,
                    "source_language_code": src_code,
                    "target_language_code": tgt_code,
                    "speaker_gender": "Female",
                    "mode": "formal"
                },
                headers={"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
            )
            if r.status_code == 200:
                print("✅ Sarvam Translate success")
                return r.json().get("translated_text", text)
            else:
                print(f"⚠️ Sarvam Translate HTTP {r.status_code}: {r.text[:120]}")
    except Exception as e:
        print(f"⚠️ Sarvam Translate exception: {e}")

    # 2️⃣  Groq Fallback
    try:
        lang_label = target_lang if not tgt_code.startswith('en') else 'English'
        print(f"🤖 Groq fallback translation → {lang_label}")
        resp = translator_llm.invoke(
            f"Translate the following to {lang_label} using native script only. "
            f"Provide ONLY the translation, nothing else:\n\n{text}"
        )
        return resp.content.strip()
    except Exception as groq_err:
        print(f"❌ Groq translation also failed: {groq_err}")
        return text   # last resort: return original

async def translate_text(text: str, target_lang: str, source_lang: str = "en-IN") -> str:
    """Compatibility wrapper."""
    return await translate_text_indic(text, source_lang, target_lang)


# ─── Clinical Data Extraction ────────────────────────────────────────────────
async def extract_clinical_data(transcript: str, medical_context: str = "") -> dict:
    """Extract structured clinical data using Groq."""
    try:
        prompt = f"""Extract clinical data from this maternal health conversation.

TRANSCRIPT: {transcript}
CONTEXT: {medical_context}

Return ONLY valid JSON (no markdown):
{{
  "symptoms": ["list of symptoms"],
  "medications": ["list of medications/supplements"],
  "relief_noted": true/false,
  "relief_details": "brief detail",
  "fetal_movement": "Yes/No/Unknown",
  "severity": 1-10,
  "summary": "one sentence clinical summary"
}}"""
        response = clinical_llm.invoke(prompt)
        text = response.content.strip()
        # Strip markdown if present
        if "```" in text:
            text = text.split("```")[1].replace("json", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"⚠️ Clinical extraction error: {e}")
        return {
            "symptoms": [], "medications": [],
            "relief_noted": False, "relief_details": "",
            "fetal_movement": "Unknown", "severity": 5,
            "summary": transcript[:200]
        }


# ─── MongoDB Save ────────────────────────────────────────────────────────────
async def save_to_mongodb(request: QueryRequest, eng_query: str, eng_answer: str, native_answer: str, clinical: dict):
    user_identifier = request.user_phone or request.user_email or "anonymous"
    filter_query = (
        {"phone_number": request.user_phone} if request.user_phone
        else {"user_email": request.user_email} if request.user_email
        else {"phone_number": "anonymous"}
    )

    interaction = {
        "timestamp": datetime.utcnow(),
        "user_message": eng_query,
        "ai_response": eng_answer,
        "user_message_native": request.query,
        "ai_response_native": native_answer,
        "symptoms": clinical.get("symptoms", []),
        "medications": clinical.get("medications", []),
        "relief_noted": clinical.get("relief_noted", False),
        "fetal_movement_status": clinical.get("fetal_movement", "Unknown"),
        "severity_score": clinical.get("severity", 5),
        "ai_summary": clinical.get("summary", ""),
        "_source": request.source,
        "_language": request.language_code
    }

    update = {
        "$push": {"history": interaction},
        "$set": {"updated_at": datetime.utcnow()},
        "$setOnInsert": {
            "phone_number": request.user_phone or "",
            "user_email": request.user_email or "",
            "created_at": datetime.utcnow()
        }
    }
    await health_logs_collection.update_one(filter_query, update, upsert=True)
    print(f"💾 Saved for {user_identifier} | symptoms: {len(clinical.get('symptoms', []))}")


# ─── /ask Endpoint ───────────────────────────────────────────────────────────
@app.post("/ask")
async def ask(request: QueryRequest):
    try:
        print(f"\n📥 /ask | lang={request.language_code} | query='{request.query[:60]}'")

        # 1. Translate query to English for RAG
        english_query = request.query
        if not request.language_code.lower().startswith("en"):
            english_query = await translate_text_indic(request.query, request.language_code, "en-IN")
            print(f"✅ Query in English: '{english_query[:80]}'")

        # 2. Build chat history
        history_msgs = []
        for msg in (request.history or [])[-5:]:
            if msg.role == "user":
                history_msgs.append(HumanMessage(content=msg.content))
            else:
                history_msgs.append(AIMessage(content=msg.content))

        # 3. RAG (English in → English out)
        print("🧠 Querying RAG...")
        english_answer = ""
        for chunk in service.ask_stream(english_query, request.patient_data, history_msgs):
            english_answer += chunk
        english_answer = english_answer.strip()
        print(f"✅ RAG answer: '{english_answer[:80]}...'")

        # 4. Translate RAG answer to user's language
        final_answer = english_answer
        if not request.language_code.lower().startswith("en"):
            final_answer = await translate_text_indic(english_answer, "en-IN", request.language_code)
            print(f"✅ Native answer: '{final_answer[:80]}...'")

        # 5. Clinical extraction (best-effort)
        clinical_data = {
            "symptoms": [], "medications": [], "relief_noted": False,
            "relief_details": "", "fetal_movement": "Unknown", "severity": 5, "summary": ""
        }
        try:
            clinical_data = await extract_clinical_data(english_query, english_answer)
        except Exception as e:
            print(f"⚠️ Clinical extraction skipped: {e}")

        # 6. Save to MongoDB (best-effort)
        try:
            await save_to_mongodb(request, english_query, english_answer, final_answer, clinical_data)
        except Exception as e:
            print(f"⚠️ MongoDB save skipped: {e}")

        return {
            "english_query":   english_query,
            "english_answer":  english_answer,
            "localized_answer": final_answer,
            "verified_language": request.language_code,
            "status": "success"
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Startup ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_db():
    try:
        await mongo_client.admin.command("ping")
        print("✅ MongoDB connected from Python RAG API")
    except Exception as e:
        print(f"⚠️ MongoDB connection warning: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
