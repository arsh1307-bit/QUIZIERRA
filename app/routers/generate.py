# app/routers/generate.py
import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.llm_openai import generate_mcq_from_text, local_fallback_mcq
from app.services.pdf_extract import extract_text_from_pdf

router = APIRouter()

# Rate limit settings (consider a more robust solution like redis for production)
MAX_REQUESTS_PER_MINUTE = 20
request_timestamps = []


@router.post("/from_text")
async def generate_from_text(text: str, n: int = 10):
    """
    Generate MCQs from raw text.
    This endpoint uses the robust llm_openai service with retry and error handling.
    """
    if not text:
        raise HTTPException(status_code=400, detail="Text content is required.")

    try:
        # Delegate directly to the centralized and robust service
        mcq_list = await generate_mcq_from_text_async(text, num_questions=n)
        return {"questions": mcq_list}
    except HTTPException as e:
        # Re-raise HTTP exceptions from the service
        raise e
    except Exception as e:
        # All other exceptions are caught and returned as a 500
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.post("/from_pdf")
async def generate_from_pdf(file: UploadFile = File(...), n: int = 10):
    """
    Generate MCQs from an uploaded PDF file.
    This endpoint now uses a secure temporary file and the robust llm_openai service.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF is supported.")

    try:
        # Securely create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Extract text from the securely stored PDF
        text = extract_text_from_pdf(tmp_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF file: {e}")
    finally:
        # Ensure the temporary file is cleaned up
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the PDF.")

    try:
        # Delegate to the centralized service
        mcq_list = await generate_mcq_from_text_async(text, num_questions=n)
        return {"questions": mcq_list}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


# Wrapper to run the synchronous llm_openai function in a thread pool
async def generate_mcq_from_text_async(text: str, num_questions: int):
    import asyncio
    loop = asyncio.get_event_loop()
    try:
        # Use a thread pool to avoid blocking the event loop
        return await loop.run_in_executor(None, generate_mcq_from_text, text, num_questions)
    except Exception as e:
        # If the LLM service fails, use the local fallback
        return local_fallback_mcq(text, num_questions)
