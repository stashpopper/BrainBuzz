# Document Mode — How It Works (End to End)

The feature has three running parts: the React frontend, a Node.js backend, and a Python backend. The Python backend does all the AI work. The Node.js backend handles authentication, file uploads, and real-time updates. The frontend talks only to Node.js.

---

## Part 1 — Uploading a PDF

The user picks a PDF file from the `DocumentMode` page. The frontend immediately validates it's a PDF, then sends it to Node.js as a multipart form request. Multer, a Node.js middleware, intercepts this request, reads the binary file, and saves it to a local `uploads/` folder with a UUID in the filename to avoid naming conflicts.

Node.js creates a document record in MongoDB right away, with a status of `"processing"`, and sends a 202 response back to the frontend immediately — it doesn't wait for any AI processing. This is the async background pattern: respond first, work later.

In the background, Node.js calls `processDocument()` which sends an HTTP POST to the Python service at port 5002, passing the absolute file path and a document ID.

Inside the Python service, `ingest_pdf()` takes over. First it uses `PyPDFLoader` to read every page of the PDF and extract the text. Then it uses `RecursiveCharacterTextSplitter` to break that text into overlapping chunks of about 1000 characters each, with a 200-character overlap between adjacent chunks. The overlap matters because it preserves context at the boundaries — a sentence that crosses a chunk boundary is partially in both, so retrieval won't lose it.

Now it needs to turn each chunk of text into a vector embedding — a list of 1024 numbers that represents the chunk's meaning mathematically. It does this by calling the Mistral `mistral-embed` API directly via `httpx`, sending 16 chunks at a time with retries and exponential backoff in case of rate limits. This batch-and-retry logic exists because Mistral's API has limits and a 350-page PDF might produce 400+ chunks.

Once all embeddings are ready, Python inserts every chunk into MongoDB's `documentchunks` collection in one bulk operation. Each document in that collection has the chunk's text, its page number, its position index, and its 1024-dimensional embedding vector.

Python responds back to Node.js with the chunk count and page count. Node.js updates the MongoDB document status to `"ready"` and then emits a Socket.IO event called `documentProgress` with phase `"complete"` to the frontend. The frontend, which has been listening on a WebSocket connection the whole time, receives this event and refreshes the document list — the new PDF now appears in "Your Documents" as ready to use.

MongoDB Atlas has a vector index called `vector_index` on the `documentchunks` collection. It's set up to index the `embedding` field with cosine similarity. This index is what makes vector similarity search possible later.

---

## Part 2 — Generating a Quiz

The user selects one of their ready documents, configures how many questions they want, and clicks "Generate Quiz." The frontend sends a POST request to Node.js with the question count, options count, and time per question.

Node.js again responds immediately with a 202, creates a quiz record in MongoDB with status `"generating"`, and calls `generateQuizAsync()` in the background. This function calls the Python service's `/generate-quiz` endpoint.

Inside Python, the `generate_quiz()` function runs a two-step AI pipeline.

**Step 1 — Topic Extraction.** `extract_topics()` reads the document's chunks directly from MongoDB (no vector search here). It samples 8 chunks spaced evenly across the document to get a representative picture of the whole thing. It concatenates these excerpts into a prompt and calls the Mistral large language model using LangChain's `with_structured_output()` feature. This tells the LLM to return a response that exactly matches a Pydantic `TopicList` schema — a list of topics each with a title and description. There's no manual JSON parsing involved; LangChain enforces the structure. The result is typically 3–6 topic objects.

**Step 2 — RAG Question Generation.** For each topic, `generate_questions_for_topic()` runs. It builds a search query from the topic's title and description, then calls `search_similar_chunks()`. That function uses MongoDB Atlas Vector Search to find the 5 most semantically relevant chunks for that topic query across the document. This is vector similarity search — it doesn't look for exact keywords, it finds chunks whose meaning is closest to the query. The retrieved chunks become the "context" block.

The function then calls the LLM again, this time instructing it to generate multiple-choice questions using only information from the retrieved context. This is what makes it RAG (Retrieval-Augmented Generation) — the LLM is grounded in real document content, not generating from memory. The output is again structured via Pydantic to guarantee every question has a `question`, `options`, `correct_answer`, and `topic` field.

This question generation step repeats for each topic, asking for slightly more questions than needed each time to account for the LLM occasionally generating fewer. Once all topics are done, the questions are trimmed to the exact requested count and shuffled so topics are mixed together.

Python returns the final `{ topics, questions }` object to Node.js. Node.js saves the quiz to MongoDB with status `"complete"` and fires a Socket.IO `quizComplete` event to the frontend.

The frontend receives this event, calls `fetchQuiz()` to GET the completed quiz from Node.js, stores it in state, and shows the "Quiz Ready!" section with a Start Quiz button. When the user clicks Start Quiz, the quiz questions are placed into Zustand (the global state store) and the user is navigated to the existing quiz-taking page.

---

## The Real-Time Layer

The frontend establishes a WebSocket connection to Node.js via Socket.IO on page load. It immediately joins a private room named `user_<userId>`. All progress events (document processing, quiz generation) are emitted only to that room, so User A's progress never reaches User B. This is why there's no polling — the browser just listens passively and the server pushes updates the instant anything changes. This is far more efficient and feels instantaneous.

---

## Why It's Built This Way

The Node.js and Python services are separate because Node.js is the right tool for auth, file handling, and WebSockets, while Python has the best AI/ML ecosystem (LangChain, PyPDF). Rather than rebuild auth in Python, Node.js acts as a gateway and proxies AI work to Python over HTTP.

The PDF is chunked because LLMs have a token limit — you can't feed a 350-page PDF into a prompt. Chunking lets you retrieve only the most relevant 4–5 chunks for each specific question topic, keeping prompts focused and cheap.

Vector embeddings allow semantic search rather than keyword search. When you search for "neural network architecture," vector search also finds chunks about "deep learning layers" or "model topology" because their meaning is similar — something keyword search would miss entirely.
