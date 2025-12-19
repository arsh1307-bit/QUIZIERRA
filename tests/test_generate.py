# tests/test_generate.py
import json
from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)

# Mock response object that has a .text attribute
class MockResponse:
    def __init__(self, text):
        self.text = text
    def __str__(self):
        return self.text

# Helper: valid array JSON
VALID_JSON = json.dumps([
    {
        "question": "What is 2+2?",
        "distractors": ["1","2","3"],
        "answer": "4",
        "difficulty": "easy",
        "explanation": "Simple addition",
        "topic": "math"
    }
])

# Example malformed model output (preamble + JSON)
MALFORMED_OUTPUT = "Here are the MCQs:\n" + VALID_JSON + "\nThanks!"

@pytest.fixture(autouse=True)
def patch_genai(monkeypatch):
    # Monkeypatch the genai.GenerativeModel.generate_content to return MockResponse
    class DummyModel:
        def __init__(self, model_name):
            self.model_name = model_name
        def generate_content(self, prompt):
            # Return MALFORMED_OUTPUT for tests
            return MockResponse(MALFORMED_OUTPUT)

    monkeypatch.setattr("app.routers.generate.genai.GenerativeModel", lambda model_name: DummyModel(model_name))
    yield

def test_from_text_endpoint_success():
    payload = {"text": "Simple text about addition.", "num_questions": 1}
    resp = client.post("/ai/from_text", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "generated" in data
    assert isinstance(data["generated"], list)
    assert len(data["generated"]) == 1
    item = data["generated"][0]
    assert item["question"].lower().startswith("what is")
    assert "distractors" in item
