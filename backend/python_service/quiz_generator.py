"""
Quiz generation service: topic extraction and RAG-based question generation.
Uses LangChain with Mistral LLM and structured Pydantic output.
"""

import os
import random
import time
from typing import Optional

from dotenv import load_dotenv
from langchain_mistralai import ChatMistralAI
from pydantic import BaseModel, Field

from document_service import get_chunks_for_document, search_similar_chunks

load_dotenv()

MISTRAL_API_KEY = os.environ["MISTRAL_API_KEY"]


# ── Pydantic models for structured output ──────────────────────────────────────


class Topic(BaseModel):
    title: str = Field(description="Short topic title, 2-5 words")
    description: str = Field(description="One sentence describing what this topic covers")


class TopicList(BaseModel):
    topics: list[Topic] = Field(description="List of 3-6 globally important topics from the document")


class Question(BaseModel):
    question: str = Field(description="The question text")
    options: list[str] = Field(description="Answer options")
    correct_answer: str = Field(description="The correct answer, must be one of the options")
    topic: str = Field(description="The topic this question belongs to")


class QuestionSet(BaseModel):
    questions: list[Question] = Field(description="List of generated questions")


# ── LLM setup ──────────────────────────────────────────────────────────────────


def _get_llm(temperature: float = 0.0) -> ChatMistralAI:
    return ChatMistralAI(
        model="mistral-large-latest",
        api_key=MISTRAL_API_KEY,
        temperature=temperature,
    )


# ── Topic extraction (no retrieval — uses raw chunks) ─────────────────────────


def extract_topics(document_id: str) -> list[dict]:
    """
    Extract globally important topics from document content.
    Uses evenly sampled chunks to get a representative view of the document.
    No vector retrieval — reads chunks directly.

    Returns:
        List of dicts with 'title' and 'description'.
    """
    chunks = get_chunks_for_document(document_id)

    if not chunks:
        raise ValueError(f"No chunks found for document {document_id}")

    # Sample diverse excerpts from across the document
    total = len(chunks)
    if total <= 8:
        sampled = chunks
    else:
        step = total // 8
        sampled = [chunks[i * step] for i in range(8) if i * step < total]

    # Filter out chunks with no meaningful text
    valid_sampled = [c for c in sampled if c.get("text") and len(c["text"].strip()) > 20]
    if not valid_sampled:
        raise ValueError("Document chunks contain no meaningful text for topic extraction")

    excerpts_text = "\n\n---\n\n".join(
        chunk["text"][:600] for chunk in valid_sampled
    )

    llm = _get_llm(temperature=0.0)
    structured_llm = llm.with_structured_output(TopicList)

    prompt = f"""You are an expert curriculum designer analyzing a document to extract its main topics for quiz generation.

Below are representative excerpts from different parts of the document:

{excerpts_text}

Extract 3-6 globally important topics that this document covers.

REQUIREMENTS:
1. Each topic MUST be directly grounded in the excerpts above — do not invent topics
2. Topics should be specific and concrete (e.g., "Load Balancing Algorithms" not just "Networking")
3. Topics should be distinct from each other — avoid overlapping concepts
4. Each topic should have enough depth to generate multiple meaningful quiz questions
5. Prioritize topics that test understanding, not just memorization
6. The description should clearly define the scope and key concepts of the topic
"""

    max_retries = 3
    last_error = None
    for attempt in range(max_retries):
        try:
            result: TopicList = structured_llm.invoke(prompt)
            return [t.model_dump() for t in result.topics]
        except Exception as e:
            last_error = str(e)
            print(f"[topics] Structured output parse failed (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)

    raise RuntimeError(f"Topic extraction failed after {max_retries} attempts: {last_error}")


# ── RAG-based question generation ─────────────────────────────────────────────


def generate_questions_for_topic(
    document_id: str,
    topic: dict,
    questions_per_topic: int,
    options_count: int,
) -> list[dict]:
    """
    Generate quiz questions for a single topic using RAG.
    Retrieves relevant chunks, then generates grounded questions.

    Returns:
        List of question dicts.
    """
    topic_title = topic["title"]
    topic_desc = topic["description"]

    # Retrieve relevant chunks for this topic using multiple queries for better coverage
    primary_chunks = search_similar_chunks(topic_title, document_id, k=6)
    secondary_chunks = search_similar_chunks(topic_desc, document_id, k=4)

    # Deduplicate by text content, preserving order (primary first)
    seen_texts = set()
    relevant_chunks = []
    for chunk in primary_chunks + secondary_chunks:
        text_key = chunk.get("text", "")[:200]
        if text_key and text_key not in seen_texts:
            seen_texts.add(text_key)
            relevant_chunks.append(chunk)

    # Filter out chunks with empty or very short text
    relevant_chunks = [
        c for c in relevant_chunks
        if c.get("text") and len(c["text"].strip()) > 30
    ]

    if not relevant_chunks:
        print(f"[quiz] No valid chunks found for topic '{topic_title}', skipping")
        return []

    context = "\n\n---\n\n".join(chunk["text"] for chunk in relevant_chunks)

    llm = _get_llm(temperature=0.3)
    structured_llm = llm.with_structured_output(QuestionSet)

    prompt = f"""You are an expert assessment designer. Generate exactly {questions_per_topic} high-quality multiple-choice quiz questions about "{topic_title}".

Each question must have exactly {options_count} answer options.

SOURCE CONTEXT (use ONLY this information):
{context}

STRICT REQUIREMENTS:
1. Every question MUST be directly answerable from the source context above
2. Distribute questions across these cognitive levels:
   - Remembering (20%): Recall specific facts, definitions, or terms from the context
   - Understanding (30%): Explain concepts, interpret relationships, summarize ideas
   - Applying (30%): Apply concepts to new scenarios or solve problems using context info
   - Analyzing (20%): Compare/contrast elements, identify patterns, draw conclusions
3. The correct_answer MUST be an EXACT string match to one of the options (character-for-character)
4. All distractors MUST be plausible and related to the topic — never use joke answers or obviously wrong options
5. Questions must be specific to THIS document's content, not generic knowledge
6. Do NOT include information not present in the source context
7. Avoid questions that are too easy or too ambiguous
8. Set the 'topic' field to "{topic_title}" for every question
9. Vary question stems: use "Which", "What", "How", "Why", "In the context of...", etc.
"""

    max_retries = 3
    last_error = None
    for attempt in range(max_retries):
        try:
            result: QuestionSet = structured_llm.invoke(prompt)
            # Validate that correct_answer is actually in options
            valid_questions = []
            for q in result.questions:
                if q.correct_answer in q.options:
                    valid_questions.append(q)
                else:
                    print(f"[quiz] Dropping question with invalid correct_answer: {q.question[:50]}...")
            return [q.model_dump() for q in valid_questions]
        except Exception as e:
            last_error = str(e)
            print(f"[quiz] Structured output parse failed for '{topic_title}' (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)

    print(f"[quiz] Question generation failed for topic '{topic_title}': {last_error}")
    return []


def generate_quiz(
    document_id: str,
    question_count: int = 10,
    options_count: int = 4,
) -> dict:
    """
    Full quiz generation pipeline:
    1. Extract topics from document
    2. For each topic, retrieve relevant chunks and generate questions
    3. Assemble and return final quiz

    Returns:
        dict with 'topics' and 'questions'.
    """
    # Step 1: Extract topics
    topics = extract_topics(document_id)

    if not topics:
        raise ValueError("No topics could be extracted from document")

    # Step 2: Generate questions per topic
    # Request ~50% more per topic to account for variability, then trim
    questions_per_topic = max(3, (question_count * 3) // (len(topics) * 2) + 1)

    all_questions: list[dict] = []
    failed_topics: list[str] = []

    for topic in topics:
        if len(all_questions) >= question_count:
            break

        remaining = question_count - len(all_questions)
        request_count = max(questions_per_topic, remaining + 1)

        print(f"[quiz] Generating questions for topic: '{topic['title']}' (requesting {request_count})")
        questions = generate_questions_for_topic(
            document_id=document_id,
            topic=topic,
            questions_per_topic=request_count,
            options_count=options_count,
        )
        if not questions:
            failed_topics.append(topic["title"])
        all_questions.extend(questions)

    if not all_questions:
        raise ValueError(
            f"Failed to generate any questions. "
            f"All {len(topics)} topics failed: {failed_topics}. "
            f"Check vector index configuration and Mistral API connectivity."
        )

    if failed_topics:
        print(f"[quiz] Warning: {len(failed_topics)} topics produced no questions: {failed_topics}")

    # Trim to exact count
    final_questions = all_questions[:question_count]

    # Shuffle to mix topics
    random.shuffle(final_questions)

    return {
        "topics": [t["title"] for t in topics],
        "questions": final_questions,
    }
