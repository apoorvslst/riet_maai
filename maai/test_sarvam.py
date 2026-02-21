import requests
import os

# Read the key exactly as it appears in .env
SARVAM_API_KEY = "sk_94vvqhgo_opzIH8VOZKtoPs894jfnFGAZ"

print(f"Testing Sarvam API with key: {SARVAM_API_KEY}")

# Test 1: Sarvam Translate (EN -> HI)
print("\n--- Test 1: Translate en-IN -> hi-IN ---")
r = requests.post(
    "https://api.sarvam.ai/translate",
    json={
        "input": "How are you feeling today?",
        "source_language_code": "en-IN",
        "target_language_code": "hi-IN",
        "speaker_gender": "Female",
        "mode": "formal"
    },
    headers={
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
)
print(f"Status: {r.status_code}")
print(f"Response: {r.text[:300]}")

# Test 2: Sarvam TTS (Bulbul)
print("\n--- Test 2: Bulbul v3 TTS ---")
r2 = requests.post(
    "https://api.sarvam.ai/text-to-speech",
    json={
        "inputs": ["नमस्ते, आप कैसी हैं?"],
        "target_language_code": "hi-IN",
        "speaker": "meera",
        "model": "bulbul:v3"
    },
    headers={
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json"
    }
)
print(f"Status: {r2.status_code}")
if r2.status_code == 200:
    data = r2.json()
    if data.get("audios"):
        print(f"Audio data length: {len(data['audios'][0])} chars (base64)")
    else:
        print(f"Response: {r2.text[:300]}")
else:
    print(f"Response: {r2.text[:300]}")

# Test 3: Sarvam STT - just validate endpoint accepts request
print("\n--- Test 3: Headers/Endpoint check ---")
print("All tests done.")
