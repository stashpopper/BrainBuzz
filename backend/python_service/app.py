"""
FastAPI server for the Document Mode Python service.
Exposes endpoints for document ingestion and quiz generation.
Called by the Node.js backend.
"""

import os
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from document_service import ingest_pdf, delete_document_chunks
from quiz_generator import generate_quiz

load_dotenv()

app = FastAPI(title="BrainBuzz Document Service")


# ── Request/Response models ────────────────────────────────────────────────────


class ProcessRequest(BaseModel):
    document_id: str
    # In development: pass local file path
    # In production: pass Cloudinary URL (or any HTTPS URL)
    file_path: str | None = None
    file_url: str | None = None


class ProcessResponse(BaseModel):
    chunk_count: int
    page_count: int


class GenerateQuizRequest(BaseModel):
    document_id: str
    question_count: int = 10
    options_count: int = 4


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_answer: str
    topic: str


class GenerateQuizResponse(BaseModel):
    topics: list[str]
    questions: list[QuizQuestion]


# ── Endpoints ──────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    return {"status": "ok", "service": "brainbuzz-python-document-service"}


@app.post("/process", response_model=ProcessResponse)
def process_document(req: ProcessRequest):
    """
    Ingest a PDF: extract text, chunk, embed, store in MongoDB.
    Called by Node.js after file upload.
    Accepts either a local file_path (dev) or a remote file_url (production/Cloudinary).
    """
    if not req.file_path and not req.file_url:
        raise HTTPException(status_code=400, detail="Either file_path or file_url must be provided")

    source = req.file_url or req.file_path

    # For local path, verify existence upfront
    if req.file_path and not req.file_url and not os.path.exists(req.file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {req.file_path}")

    try:
        result = ingest_pdf(source, req.document_id)
        return ProcessResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.post("/generate-quiz", response_model=GenerateQuizResponse)
def generate_quiz_endpoint(req: GenerateQuizRequest):
    """
    Generate a quiz from a processed document using RAG.
    Called by Node.js after user requests quiz generation.
    """
    try:
        result = generate_quiz(
            document_id=req.document_id,
            question_count=req.question_count,
            options_count=req.options_count,
        )
        return GenerateQuizResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)
