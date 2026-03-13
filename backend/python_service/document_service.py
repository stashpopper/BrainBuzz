"""
Document ingestion service: PDF loading, chunking, embedding, and vector storage.
Uses LangChain with Mistral embeddings and MongoDB Atlas Vector Search.
"""

import os
import uuid
import time
import tempfile
from typing import Optional

import httpx
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_mistralai import MistralAIEmbeddings
from pymongo import MongoClient

load_dotenv()

MISTRAL_API_KEY = os.environ["MISTRAL_API_KEY"]
MONGODB_URI = os.environ["MONGODB_URI"]
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "test")

COLLECTION_NAME = "documentchunks"
INDEX_NAME = "vector_index"

# Chunk size 1000 with 200 overlap:
# - 1000 chars ≈ 150-200 tokens, fits well within Mistral's embedding window
# - Smaller chunks produce tighter, more focused retrieval results
# - 200 char overlap preserves cross-boundary context (roughly one paragraph)
# - RecursiveCharacterTextSplitter splits on \n\n > \n > . > space, preserving semantic units
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

MISTRAL_EMBED_URL = "https://api.mistral.ai/v1/embeddings"
BATCH_SIZE = 16   # Mistral recommends ≤16 texts per request for stability
MAX_RETRIES = 3

_client: Optional[MongoClient] = None


def _get_db():
    """Get MongoDB database connection (reuse client)."""
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client[MONGODB_DB_NAME]


def _get_collection():
    """Get the documentchunks collection."""
    return _get_db()[COLLECTION_NAME]


def _embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Call Mistral's embedding API directly in small batches.
    Retries on rate-limit (429) and transient errors.
    Returns a flat list of embedding vectors.
    """
    all_vectors: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        last_error = None

        for attempt in range(MAX_RETRIES):
            try:
                resp = httpx.post(
                    MISTRAL_EMBED_URL,
                    headers={
                        "Authorization": f"Bearer {MISTRAL_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={"model": "mistral-embed", "input": batch},
                    timeout=60,
                )

                if resp.status_code == 429:
                    wait = 2 ** attempt  # exponential back-off: 1s, 2s, 4s
                    print(f"[embed] Rate limited, waiting {wait}s (attempt {attempt+1})")
                    time.sleep(wait)
                    last_error = f"Rate limited: {resp.text}"
                    continue

                resp.raise_for_status()
                data = resp.json()

                if "data" not in data:
                    raise ValueError(f"Unexpected Mistral response: {data}")

                batch_vectors = [item["embedding"] for item in data["data"]]
                all_vectors.extend(batch_vectors)
                last_error = None
                break  # success

            except (httpx.HTTPError, ValueError) as e:
                last_error = str(e)
                print(f"[embed] Error on attempt {attempt+1}: {e}")
                time.sleep(1)

        if last_error:
            raise RuntimeError(f"Embedding failed after {MAX_RETRIES} attempts: {last_error}")

        # Small pause between batches to avoid rate limits
        if i + BATCH_SIZE < len(texts):
            time.sleep(0.3)

    return all_vectors


def _get_vector_store() -> MongoDBAtlasVectorSearch:
    """Get the MongoDB Atlas Vector Search store (used for retrieval only)."""
    return MongoDBAtlasVectorSearch(
        collection=_get_collection(),
        embedding=MistralAIEmbeddings(model="mistral-embed", api_key=MISTRAL_API_KEY),
        index_name=INDEX_NAME,
        text_key="text",
        embedding_key="embedding",
    )


def ingest_pdf(file_path_or_url: str, document_id: str) -> dict:
    """
    Load a PDF, chunk it, generate embeddings, and store in MongoDB Atlas.

    Accepts either a local file path (dev) or an HTTPS URL (production/Cloudinary).
    When a URL is given the file is downloaded to a temporary location first.

    Args:
        file_path_or_url: Local path or HTTPS URL of the PDF.
        document_id: Unique ID to associate all chunks with.

    Returns:
        dict with chunk_count and page_count.
    """
    is_url = file_path_or_url.startswith("http://") or file_path_or_url.startswith("https://")
    tmp_path = None

    if is_url:
        # Download to a temp file so PyPDFLoader can open it
        print(f"[ingest] Downloading PDF from URL: {file_path_or_url}")
        resp = httpx.get(file_path_or_url, timeout=60, follow_redirects=True)
        resp.raise_for_status()

        suffix = ".pdf"
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=suffix)
        try:
            with os.fdopen(tmp_fd, "wb") as f:
                f.write(resp.content)
            pdf_source = tmp_path
        except Exception:
            os.unlink(tmp_path)
            raise
    else:
        pdf_source = file_path_or_url

    try:
        return _process_pdf_file(pdf_source, document_id)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
            print(f"[ingest] Cleaned up temp file: {tmp_path}")


def _process_pdf_file(file_path: str, document_id: str) -> dict:
    """Internal: load, chunk, embed and store a local PDF file."""
    loader = PyPDFLoader(file_path)
    pages = loader.load()

    if not pages:
        raise ValueError("PDF is empty or could not be read")

    page_count = len(pages)

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(pages)

    if not chunks:
        raise ValueError("No text content could be extracted from PDF")

    # Prepare documents for MongoDB with required fields matching Mongoose schema
    collection = _get_collection()

    texts = [chunk.page_content for chunk in chunks]

    print(f"[ingest] Embedding {len(texts)} chunks in batches of {BATCH_SIZE}...")
    vectors = _embed_texts(texts)

    # Build MongoDB documents matching the existing Mongoose DocumentChunk schema
    mongo_docs = []
    for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
        mongo_docs.append({
            "documentId": document_id,
            "chunkId": str(uuid.uuid4()),
            "chunkIndex": i,
            "text": chunk.page_content,
            "page": chunk.metadata.get("page", None),
            "section": None,
            "embedding": vector,
            "createdAt": None,  # Let MongoDB set via Mongoose if needed
            "updatedAt": None,
        })

    # Insert all at once
    if mongo_docs:
        collection.insert_many(mongo_docs)

    return {
        "chunk_count": len(mongo_docs),
        "page_count": page_count,
    }


def get_chunks_for_document(document_id: str, limit: int = 0) -> list[dict]:
    """
    Retrieve all chunks for a document (for topic extraction).

    Args:
        document_id: The document ID.
        limit: Max chunks to retrieve. 0 = all.

    Returns:
        List of chunk dicts with text and chunkIndex.
    """
    collection = _get_collection()
    query = {"documentId": document_id}
    projection = {"text": 1, "chunkIndex": 1, "_id": 0}

    cursor = collection.find(query, projection).sort("chunkIndex", 1)
    if limit > 0:
        cursor = cursor.limit(limit)

    return list(cursor)


def search_similar_chunks(query: str, document_id: str, k: int = 4) -> list[dict]:
    """
    Perform vector similarity search for a query within a specific document.

    Args:
        query: The search query text.
        document_id: Filter to this document.
        k: Number of results.

    Returns:
        List of chunk dicts with text and score.
    """
    vector_store = _get_vector_store()

    results = vector_store.similarity_search_with_score(
        query=query,
        k=k,
        pre_filter={"documentId": {"$eq": document_id}},
    )

    return [
        {
            "text": doc.page_content,
            "score": score,
            "chunkId": doc.metadata.get("chunkId", ""),
            "page": doc.metadata.get("page"),
        }
        for doc, score in results
    ]


def delete_document_chunks(document_id: str) -> int:
    """Delete all chunks for a document. Returns count deleted."""
    result = _get_collection().delete_many({"documentId": document_id})
    return result.deleted_count
