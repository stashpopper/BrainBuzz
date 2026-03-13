const mongoose = require('mongoose');

const documentQuizSchema = new mongoose.Schema({
    documentId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'brainbuzzsignup',
        required: true
    },
    quizName: {
        type: String,
        required: true
    },
    topics: [{
        type: String
    }],
    questionCount: {
        type: Number,
        required: true,
        min: 5,
        max: 25,
        default: 10
    },
    timePerQuestion: {
        type: Number,
        required: true,
        min: 10,
        max: 120,
        default: 30
    },
    optionsCount: {
        type: Number,
        required: true,
        min: 2,
        max: 6,
        default: 4
    },
    questions: [{
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correct_answer: { type: String, required: true },
        sourceChunkId: { type: String },
        topic: { type: String }
    }],
    totalLLMCalls: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['generating', 'complete', 'failed'],
        default: 'generating'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('DocumentQuiz', documentQuizSchema);
