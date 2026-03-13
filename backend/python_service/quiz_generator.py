"""
Quiz generation service: topic extraction and RAG-based question generation.
Uses LangChain with Mistral LLM and structured Pydantic output.
"""

import os
import random
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

    excerpts_text = "\n\n---\n\n".join(
        chunk["text"][:600] for chunk in sampled
    )

    llm = _get_llm(temperature=0.0)
    structured_llm = llm.with_structured_output(TopicList)

    prompt = f"""You are analyzing a document to extract its main topics.

Below are representative excerpts from different parts of the document:

{excerpts_text}

Extract 3-6 globally important topics that this document covers.
Each topic must be grounded in the excerpts above — do not invent topics.
Topics should be specific enough to generate meaningful quiz questions.
"""

    result: TopicList = structured_llm.invoke(prompt)
    return [t.model_dump() for t in result.topics]


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

    # Retrieve relevant chunks for this topic
    search_query = f"{topic_title}: {topic_desc}"
    relevant_chunks = search_similar_chunks(search_query, document_id, k=5)

    if not relevant_chunks:
        return []

    context = "\n\n---\n\n".join(chunk["text"] for chunk in relevant_chunks)

    llm = _get_llm(temperature=0.3)
    structured_llm = llm.with_structured_output(QuestionSet)

    prompt = f"""Generate exactly {questions_per_topic} multiple-choice quiz questions about the topic "{topic_title}".

Each question must have exactly {options_count} answer options.

CONTEXT (use ONLY this information):
{context}

REQUIREMENTS:
1. Every question MUST be answerable from the context above
2. Generate a mix of question types:
   - Conceptual: tests understanding of definitions and concepts
   - Analytical: requires reasoning about relationships or comparisons
   - Application: applies concepts to scenarios
3. The correct_answer must be exactly one of the options
4. Options should be plausible — avoid obviously wrong distractors
5. Do NOT generate generic textbook questions — ground everything in the specific content
6. Do NOT hallucinate information not in the context
7. Set the 'topic' field to "{topic_title}" for every question
"""

    result: QuestionSet = structured_llm.invoke(prompt)
    return [q.model_dump() for q in result.questions]


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

    for topic in topics:
        if len(all_questions) >= question_count:
            break

        remaining = question_count - len(all_questions)
        request_count = max(questions_per_topic, remaining + 1)

        questions = generate_questions_for_topic(
            document_id=document_id,
            topic=topic,
            questions_per_topic=request_count,
            options_count=options_count,
        )
        all_questions.extend(questions)

    # Trim to exact count
    final_questions = all_questions[:question_count]

    # Shuffle to mix topics
    random.shuffle(final_questions)

    return {
        "topics": [t["title"] for t in topics],
        "questions": final_questions,
    }
