# tools/test_gemini_direct.py
import os
import sys
try:
    from google import generativeai as genai
except Exception as e:
    print("Failed importing google.generativeai:", e)
    sys.exit(2)

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")

if not GEMINI_KEY:
    print("GEMINI_API_KEY not set. Set it and retry.")
    sys.exit(3)

try:
    genai.configure(api_key=GEMINI_KEY)
    print("Configured Gemini SDK with model:", GEMINI_MODEL)
    model = genai.GenerativeModel(GEMINI_MODEL)
    # small test prompt
    response = model.generate_content("Say hello briefly and return 'OK' at the end.")
    raw = getattr(response, "text", None) or str(response)
    print("=== RAW RESPONSE ===")
    print(raw)
    print("=== END ===")
except Exception as e:
    print("Gemini call failed:", e)
    import traceback; traceback.print_exc()
    sys.exit(1)
