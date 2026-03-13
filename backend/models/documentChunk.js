const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema({
    documentId: {
        type: String,
        required: true,
        index: true
    },
    chunkId: {
        type: String,
        required: true,
        unique: true
    },
    chunkIndex: {
        type: Number,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    page: {
        type: Number,
        default: null
    },
    section: {
        type: String,
        default: null
    },
    embedding: {
        type: [Number],
        default: []
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
