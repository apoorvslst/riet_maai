import os
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

load_dotenv()

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
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://apoorv13:wmxfzy5ZPQJY5P7L@cluster0.dzdexwp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
mongo_client = AsyncIOMotorClient(MONGO_URI)
db = mongo_client.get_default_database("test")  # same DB as Node.js backend
health_logs_collection = db["healthlogs"]  # same collection as HealthLog model

# Initialize RAG Service
service = PregnancyRAGService()

# Initialize Groq for Translation
translator_llm = ChatGroq(
    temperature=0,
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY")
)

# Initialize Groq for Clinical Extraction
clinical_llm = ChatGroq(
    temperature=0.2,
    model_name="llama-3.3-70b-versatile",
    groq_api_key=os.getenv("GROQ_API_KEY")
)


class ChatMessage(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    language_code: str = "hi-IN"
    patient_data: str = "Mother is 2nd week of pregnancy, general wellness query."
    history: List[ChatMessage] = []
    # User identity — passed from frontend
    user_phone: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    source: str = "website"  # "website" or "voice_call"


async def translate_text(text: str, target_lang: str) -> str:
    if target_lang.lower().startswith("en"):
        return text
    prompt = f"Translate the following text to {target_lang}. Provide ONLY the translation, no explanation:\n\n{text}"
    response = translator_llm.invoke(prompt)
    return response.content.strip()


async def extract_clinical_data(transcript: str, medical_context: str = ""):
    """Extract symptoms, medications, and relief from a transcript using Groq Llama 3."""
    prompt = f"""You are a maternal health clinical data extractor. Analyze this patient's message carefully.

PATIENT MESSAGE: "{transcript}"
{f'MEDICAL CONTEXT: "{medical_context}"' if medical_context else ''}

Extract and return ONLY valid JSON:
{{
  "symptoms": [
    {{"name": "symptom in English", "reported_time": "when (morning/afternoon/night) or empty", "status": "active or relieved or recurring"}}
  ],
  "medications": [
    {{"name": "medicine in English", "taken": true/false, "taken_time": "when (morning/daytime/night) or empty", "effect_noted": "effect mentioned or empty"}}
  ],
  "relief_noted": true/false,
  "relief_details": "what relief was mentioned or empty",
  "fetal_movement": "Yes or No",
  "severity": 1-10,
  "summary": "brief medical summary in English"
}}

RULES:
- If no symptoms mentioned, return empty symptoms array
- If no medications mentioned, return empty medications array
- Always detect: headache, nausea, vomiting, fever, swelling, bleeding, pain, cramps, dizziness, fatigue
- If transcript is a greeting or general query, set severity to 1 and empty arrays"""

    try:
        response = clinical_llm.invoke(prompt)
        import json
        return json.loads(response.content.strip())
    except Exception as e:
        print(f"Clinical extraction failed: {e}")
        return {
            "symptoms": [], "medications": [],
            "relief_noted": False, "relief_details": "",
            "fetal_movement": "No", "severity": 1, "summary": ""
        }


async def save_to_mongodb(request: QueryRequest, english_query: str, english_answer: str, localized_answer: str, clinical_data: dict):
    """Save chat interaction to the same HealthLog collection used by voice calls."""
    # Determine user identifier — prefer phone number
    user_identifier = request.user_phone or request.user_email
    if not user_identifier:
        print("⚠️ No user identity provided, skipping MongoDB save.")
        return

    # Build the interaction entry (same structure as voice.js)
    interaction = {
        "timestamp": datetime.utcnow(),
        "user_message_native": request.query,
        "user_message_english": english_query,
        "rag_reply_native": localized_answer,
        "rag_reply_english": english_answer,
        "symptoms": clinical_data.get("symptoms", []),
        "medications": clinical_data.get("medications", []),
        "relief_noted": clinical_data.get("relief_noted", False),
        "relief_details": clinical_data.get("relief_details", ""),
        "fetal_movement_status": clinical_data.get("fetal_movement", "No"),
        "severity_score": clinical_data.get("severity", 1),
        "ai_summary": clinical_data.get("summary", ""),
        "_source": request.source,  # 'website' to distinguish from 'voice_call'
        "_language": request.language_code
    }

    # Determine which field to match on
    if request.user_phone:
        filter_query = {"phone_number": request.user_phone}
    else:
        filter_query = {"user_email": request.user_email}

    # Upsert: find by phone or email, push to history (same pattern as voice.js)
    update = {
        "$push": {"history": interaction},
        "$set": {"updated_at": datetime.utcnow()},
        "$setOnInsert": {
            "phone_number": request.user_phone or "",
            "user_email": request.user_email or "",
            "created_at": datetime.utcnow()
        }
    }

    result = await health_logs_collection.update_one(filter_query, update, upsert=True)
    
    # Count total interactions for this user
    user_doc = await health_logs_collection.find_one(filter_query, {"history": {"$slice": -1}})
    total = await health_logs_collection.aggregate([
        {"$match": filter_query},
        {"$project": {"count": {"$size": "$history"}}}
    ]).to_list(1)
    
    count = total[0]["count"] if total else 0
    print(f"💾 Saved website chat for {user_identifier} | Interaction #{count} | Symptoms: {len(clinical_data.get('symptoms', []))} | Meds: {len(clinical_data.get('medications', []))}")


@app.post("/ask")
async def ask(request: QueryRequest):
    try:
        # 1. Translate Query to English if needed
        english_query = request.query
        is_local = not request.language_code.lower().startswith("en")
        
        if is_local:
            # More descriptive prompt for dialect-aware translation and language verification
            prompt = f"Identify the language of this text and translate it to English. The text is from a rural Indian patient about pregnancy health. Provide the response as JSON: {{'detected_language': '...', 'english_translation': '...'}}.\n\nTEXT: {request.query}"
            id_res = translator_llm.invoke(prompt).content.strip()
            try:
                # Basic JSON cleanup if LLM adds markdown
                id_res_clean = id_res.strip('`').replace('json\n', '').strip()
                id_data = json.loads(id_res_clean)
                english_query = id_data.get('english_translation', request.query)
                # Update language code if LLM detected a specific native language
                detected_lang = id_data.get('detected_language', request.language_code)
                if detected_lang and detected_lang.lower() != 'unknown':
                    request.language_code = detected_lang
                
                # Keep tracked verified language for response
                actual_language = request.language_code
            except:
                # Fallback to simple translation if JSON fails
                prompt = f"Translate this query from a rural Indian patient to English. Provide ONLY the English translation:\n\n{request.query}"
                english_query = translator_llm.invoke(prompt).content.strip()

        # 2. Convert history format
        history_msgs = []
        for msg in request.history[-5:]:
            if msg.role == "user":
                history_msgs.append(HumanMessage(content=msg.content))
            else:
                history_msgs.append(AIMessage(content=msg.content))

        # 3. Get response from RAG (in English)
        english_answer = ""
        for chunk in service.ask_stream(english_query, request.patient_data, history_msgs):
            english_answer += chunk
        
        # 4. Translate Answer (Successive Fallback: Native -> Hindi -> NO ENGLISH)
        final_answer = english_answer.strip()
        
        # Determine target language (Default to Hindi if unknown/English)
        target_lang = request.language_code
        if not target_lang or target_lang.lower() in ['unknown', 'en', 'en-in']:
            target_lang = 'Hindi'
            
        try:
            # Attempt Native Translation - Emphasis on NATIVE SCRIPT (LIPI)
            prompt = f"Translate this medical advice to {target_lang}. TARGET: Rural Indian woman. TONE: Supportive 'Asha Didi'. CRITICAL: Use the NATIVE WRITTEN LIPI (Script). NEVER USE ENGLISH in the output. Provide ONLY the translation:\n\n{english_answer}"
            final_answer = translator_llm.invoke(prompt).content.strip()
            
            # Zero-English Enforcement Check
            if any(char.isalpha() for char in final_answer) and target_lang.lower() not in ['english', 'en']:
                # If too much english/latin chars found, fallback to strict Hindi
                if target_lang.lower() != 'hindi':
                     target_lang = "Hindi"
                     actual_language = "Hindi"
                     prompt = f"The previous translation had English. Translate strictly to HINDI using Devanagari script. Provide ONLY the Hindi translation:\n\n{english_answer}"
                     final_answer = translator_llm.invoke(prompt).content.strip()
        except Exception as trans_err:
            print(f"⚠️ Native translation failed, falling back to Hindi: {trans_err}")
            target_lang = "Hindi"
            actual_language = "Hindi"
            prompt = f"Translate this medical advice to HINDI using Devanagari script. Provide ONLY the Hindi translation:\n\n{english_answer}"
            final_answer = translator_llm.invoke(prompt).content.strip()

        # 5. Extract clinical data (symptoms, medications, relief) in background
        clinical_data = await extract_clinical_data(english_query, english_answer)

        # 6. Save to MongoDB (same collection as voice calls)
        try:
            await save_to_mongodb(request, english_query, english_answer.strip(), final_answer, clinical_data)
        except Exception as db_err:
            print(f"⚠️ MongoDB save error (non-fatal): {db_err}")

        return {
            "english_query": english_query,
            "english_answer": english_answer.strip(),
            "localized_answer": final_answer,
            "verified_language": target_lang,
            "status": "success"
        }
    except Exception as e:
        print(f"Error in /ask: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.on_event("startup")
async def startup_db():
    """Verify MongoDB connection on startup."""
    try:
        await mongo_client.admin.command("ping")
        print("✅ MongoDB connected from Python RAG API")
    except Exception as e:
        print(f"⚠️ MongoDB connection warning: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
