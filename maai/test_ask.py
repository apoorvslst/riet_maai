import requests, traceback

try:
    r = requests.post(
        "http://localhost:8000/ask",
        json={"query": "mujhe bahut thakan ho rahi hai", "language_code": "hi-IN"},
        timeout=120
    )
    print("Status:", r.status_code)
    print("Response:", r.text[:800])
except Exception as e:
    traceback.print_exc()
