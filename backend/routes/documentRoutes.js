const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const router = express.Router();

const Document = require('../models/document');
const DocumentChunk = require('../models/documentChunk');
const DocumentQuiz = require('../models/documentQuiz');
const { authenticateToken } = require('../middleware/auth');

// ── Cloudinary setup (production only) ────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';
let cloudinary = null;

if (isProduction && process.env.CLOUDINARY_URL) {
    cloudinary = require('cloudinary').v2;
    // CLOUDINARY_URL env var is picked up automatically by the cloudinary SDK
    console.log('[cloudinary] Cloudinary configured for production PDF storage');
}

/**
 * Upload a local file to Cloudinary and return its secure URL.
 * Uses 'raw' resource type so non-image files (PDFs) are supported.
 */
async function uploadToCloudinary(localFilePath, documentId) {
    const result = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'raw',
        folder: 'brainbuzz/uploads',
        public_id: documentId,
        use_filename: false,
        overwrite: true,
    });
    return result.secure_url;
}

// ── Python service URL ─────────────────────────────────────────────────────────
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:5002';

// Ensure uploads directory exists (used as temp storage even in production)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${crypto.randomUUID()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/pdf',
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Socket.IO instance will be passed in
let io;

function initializeDocumentRoutes(socketIO) {
    io = socketIO;
    return router;
}

// Emit progress to user's socket room
function emitProgress(userId, event, data) {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
}

/**
 * POST /document/upload
 * Upload a PDF and start processing via Python service
 */
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
    const userId = req.user.id;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const documentId = crypto.randomUUID();
        const filePath = req.file.path;
        const mimeType = req.file.mimetype;

        // Create document record
        const document = new Document({
            documentId,
            userId,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType,
            status: 'processing'
        });
        await document.save();

        // Send immediate response
        res.status(201).json({
            message: 'Document uploaded successfully',
            documentId,
            filename: req.file.originalname,
            status: 'processing'
        });

        // Process document asynchronously via Python service
        processDocument(documentId, userId, filePath);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

/**
 * Process document by calling Python service.
 * In production, uploads PDF to Cloudinary first and passes the URL.
 * In development, passes the local absolute path directly.
 */
async function processDocument(documentId, userId, filePath) {
    try {
        emitProgress(userId, 'documentProgress', {
            documentId,
            phase: 'processing',
            message: 'Processing document with AI...'
        });

        let pythonPayload;

        if (isProduction && cloudinary) {
            // ── Production: upload to Cloudinary, pass URL to Python ──────────
            emitProgress(userId, 'documentProgress', {
                documentId,
                phase: 'uploading',
                message: 'Uploading document to cloud storage...'
            });

            const fileUrl = await uploadToCloudinary(filePath, documentId);

            // Delete local temp file now that it's in Cloudinary
            try { fs.unlinkSync(filePath); } catch (_) {}

            pythonPayload = { file_url: fileUrl, document_id: documentId };
            console.log(`[document] Uploaded to Cloudinary: ${fileUrl}`);
        } else {
            // ── Development: pass local absolute path ─────────────────────────
            pythonPayload = { file_path: path.resolve(filePath), document_id: documentId };
        }

        // Call Python service to ingest the PDF
        const response = await axios.post(`${PYTHON_SERVICE_URL}/process`, pythonPayload, {
            timeout: 300000 // 5 minute timeout for large PDFs
        });

        const { chunk_count, page_count } = response.data;

        // Mark document as ready
        await Document.updateOne(
            { documentId },
            {
                status: 'ready',
                chunkCount: chunk_count,
                pageCount: page_count
            }
        );

        emitProgress(userId, 'documentProgress', {
            documentId,
            phase: 'complete',
            message: 'Document processed successfully',
            chunkCount: chunk_count
        });

        // Clean up local file (dev only — production deletes it right after Cloudinary upload)
        if (!isProduction) {
            try { fs.unlinkSync(filePath); } catch (_) {}
        }

    } catch (error) {
        console.error('Document processing error:', error.response?.data || error.message);

        await Document.updateOne(
            { documentId },
            { status: 'failed', errorMessage: error.response?.data?.detail || error.message }
        );

        emitProgress(userId, 'documentProgress', {
            documentId,
            phase: 'error',
            message: `Processing failed: ${error.response?.data?.detail || error.message}`
        });
    }
}

/**
 * GET /document/:documentId/status
 */
router.get('/:documentId/status', authenticateToken, async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await Document.findOne({
            documentId,
            userId: req.user.id
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json({
            documentId: document.documentId,
            filename: document.originalName,
            status: document.status,
            pageCount: document.pageCount,
            chunkCount: document.chunkCount,
            topicsExtracted: document.topicsExtracted,
            errorMessage: document.errorMessage,
            createdAt: document.createdAt
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to get document status' });
    }
});

/**
 * POST /document/:documentId/generate-quiz
 */
router.post('/:documentId/generate-quiz', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { documentId } = req.params;
    const { questionCount = 10, timePerQuestion = 30, optionsCount = 4, quizName } = req.body;

    try {
        const document = await Document.findOne({ documentId, userId });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        if (document.status !== 'ready') {
            return res.status(400).json({
                error: `Document not ready. Current status: ${document.status}`
            });
        }

        const existingQuiz = await DocumentQuiz.findOne({
            documentId,
            userId,
            status: 'generating'
        });

        if (existingQuiz) {
            return res.status(400).json({
                error: 'Quiz generation already in progress for this document'
            });
        }

        res.status(202).json({
            message: 'Quiz generation started',
            documentId,
            questionCount,
            timePerQuestion,
            optionsCount
        });

        generateQuizAsync(documentId, userId, {
            questionCount: Math.min(Math.max(questionCount, 5), 25),
            timePerQuestion: Math.min(Math.max(timePerQuestion, 10), 120),
            optionsCount: Math.min(Math.max(optionsCount, 2), 6),
            quizName: quizName || `Quiz from ${document.originalName}`
        });

    } catch (error) {
        console.error('Generate quiz error:', error);
        res.status(500).json({ error: 'Failed to start quiz generation' });
    }
});

/**
 * Generate quiz by calling Python service
 */
async function generateQuizAsync(documentId, userId, options) {
    const { questionCount, timePerQuestion, optionsCount, quizName } = options;

    // Create quiz record in 'generating' status
    const quiz = new DocumentQuiz({
        documentId,
        userId,
        quizName,
        questionCount,
        timePerQuestion,
        optionsCount,
        status: 'generating'
    });
    await quiz.save();

    try {
        emitProgress(userId, 'quizGenerationProgress', {
            documentId,
            phase: 'generating',
            message: 'Generating quiz from document...'
        });

        // Call Python service
        const response = await axios.post(`${PYTHON_SERVICE_URL}/generate-quiz`, {
            document_id: documentId,
            question_count: questionCount,
            options_count: optionsCount
        }, {
            timeout: 300000 // 5 minute timeout
        });

        const { topics, questions } = response.data;

        // Update quiz with results
        quiz.topics = topics;
        quiz.questions = questions.map(q => ({
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            topic: q.topic
        }));
        quiz.status = 'complete';
        await quiz.save();

        // Update document with extracted topics
        await Document.updateOne(
            { documentId },
            { topicsExtracted: topics }
        );

        emitProgress(userId, 'quizComplete', {
            documentId,
            quizId: quiz._id,
            questionCount: quiz.questions.length,
            topics: quiz.topics
        });

    } catch (error) {
        console.error('Quiz generation error:', error.response?.data || error.message);

        quiz.status = 'failed';
        await quiz.save();

        emitProgress(userId, 'quizGenerationProgress', {
            documentId,
            phase: 'error',
            message: `Quiz generation failed: ${error.response?.data?.detail || error.message}`
        });
    }
}

/**
 * GET /document/:documentId/quiz
 */
router.get('/:documentId/quiz', authenticateToken, async (req, res) => {
    try {
        const { documentId } = req.params;

        const quiz = await DocumentQuiz.findOne({
            documentId,
            userId: req.user.id,
            status: 'complete'
        }).sort({ createdAt: -1 });

        if (!quiz) {
            return res.status(404).json({ error: 'No completed quiz found for this document' });
        }

        res.json({
            quizId: quiz._id,
            documentId: quiz.documentId,
            quizName: quiz.quizName,
            topics: quiz.topics,
            questionCount: quiz.questionCount,
            timePerQuestion: quiz.timePerQuestion,
            optionsCount: quiz.optionsCount,
            questions: quiz.questions,
            status: quiz.status,
            createdAt: quiz.createdAt
        });
    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({ error: 'Failed to get quiz' });
    }
});

/**
 * GET /document - List user's documents
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const documents = await Document.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .select('documentId originalName status pageCount chunkCount topicsExtracted createdAt');

        res.json(documents);
    } catch (error) {
        console.error('List documents error:', error);
        res.status(500).json({ error: 'Failed to list documents' });
    }
});

/**
 * DELETE /document/:documentId
 */
router.delete('/:documentId', authenticateToken, async (req, res) => {
    try {
        const { documentId } = req.params;

        const document = await Document.findOne({ documentId, userId: req.user.id });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        await DocumentChunk.deleteMany({ documentId });
        await DocumentQuiz.deleteMany({ documentId });
        await Document.deleteOne({ documentId });

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

module.exports = { router, initializeDocumentRoutes };
