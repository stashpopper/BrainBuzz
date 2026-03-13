const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    documentId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'brainbuzzsignup',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['uploading', 'processing', 'chunking', 'embedding', 'ready', 'failed'],
        default: 'uploading'
    },
    pageCount: {
        type: Number,
        default: 0
    },
    chunkCount: {
        type: Number,
        default: 0
    },
    topicsExtracted: [{
        type: String
    }],
    errorMessage: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
