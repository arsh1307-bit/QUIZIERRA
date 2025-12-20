import os
from google import generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Listing models your API key can access:\n")

try:
    models = genai.list_models()
    for m in models:
        try:
            print(m.name)
        except:
            print(m)
except Exception as e:
    print("Error listing models:", e)
