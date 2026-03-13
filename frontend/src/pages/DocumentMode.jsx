import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../components/Store';
import Nav from '../components/Nav';
import io from 'socket.io-client';

const DocumentMode = () => {
    const navigate = useNavigate();
    const { token, isLoggedIn, isInitialized, apiUrl } = useAuthStore();
    const fileInputRef = useRef(null);
    const socketRef = useRef(null);

    // State
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [quizProgress, setQuizProgress] = useState(null);
    const [generatedQuiz, setGeneratedQuiz] = useState(null);
    const [error, setError] = useState(null);

    // Quiz configuration
    const [questionCount, setQuestionCount] = useState(10);
    const [timePerQuestion, setTimePerQuestion] = useState(30);
    const [optionsCount, setOptionsCount] = useState(4);

    // Redirect if not logged in (only after store is initialized)
    useEffect(() => {
        if (isInitialized && !isLoggedIn) {
            navigate('/login');
        }
    }, [isInitialized, isLoggedIn, navigate]);

    // Setup Socket.IO connection
    useEffect(() => {
        if (isLoggedIn && token) {
            socketRef.current = io(apiUrl);

            // Join user channel for progress updates
            const userData = JSON.parse(localStorage.getItem('userData'));
            if (userData?.id) {
                socketRef.current.emit('joinUserChannel', { userId: userData.id });
            }

            // Listen for document processing progress
            socketRef.current.on('documentProgress', (data) => {
                setUploadProgress(data);
                if (data.phase === 'complete') {
                    setUploading(false);
                    fetchDocuments();
                } else if (data.phase === 'error') {
                    setUploading(false);
                    setError(data.message);
                }
            });

            // Listen for quiz generation progress
            socketRef.current.on('quizGenerationProgress', (data) => {
                console.log('Quiz progress received:', data);
                // Merge with previous progress to preserve topics list
                setQuizProgress(prev => ({
                    ...prev,
                    ...data,
                    // Keep topics from topic_extraction phase if current event doesn't have them
                    topics: data.topics || prev?.topics
                }));
                if (data.phase === 'error') {
                    setGeneratingQuiz(false);
                    setError(data.message);
                }
            });

            // Listen for quiz completion
            socketRef.current.on('quizComplete', (data) => {
                setGeneratingQuiz(false);
                setQuizProgress(null);
                fetchQuiz(data.documentId);
            });

            return () => {
                socketRef.current?.disconnect();
            };
        }
    }, [isLoggedIn, token, apiUrl]);

    // Fetch user's documents
    const fetchDocuments = async () => {
        try {
            const response = await fetch(`${apiUrl}/my-documents`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchDocuments();
        }
    }, [isLoggedIn]);

    // Handle file upload
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            setError('Please upload a PDF document');
            return;
        }

        setUploading(true);
        setError(null);
        setUploadProgress({ phase: 'uploading', message: 'Uploading document...' });

        const formData = new FormData();
        formData.append('document', file);

        try {
            const response = await fetch(`${apiUrl}/document/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            setUploadProgress({ phase: 'processing', message: 'Processing document...', documentId: data.documentId });
        } catch (err) {
            setUploading(false);
            setError('Failed to upload document. Please try again.');
        }
    };

    // Generate quiz from document
    const handleGenerateQuiz = async () => {
        if (!selectedDocument) return;

        setGeneratingQuiz(true);
        setError(null);
        setQuizProgress({ phase: 'starting', message: 'Starting quiz generation...' });
        setGeneratedQuiz(null);

        try {
            const response = await fetch(`${apiUrl}/document/${selectedDocument.documentId}/generate-quiz`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionCount,
                    timePerQuestion,
                    optionsCount,
                    quizName: `Quiz from ${selectedDocument.originalName}`
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate quiz');
            }
        } catch (err) {
            setGeneratingQuiz(false);
            setError(err.message);
        }
    };

    // Fetch generated quiz
    const fetchQuiz = async (documentId) => {
        try {
            const response = await fetch(`${apiUrl}/document/${documentId}/quiz`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const quiz = await response.json();
                setGeneratedQuiz(quiz);
            }
        } catch (err) {
            console.error('Failed to fetch quiz:', err);
        }
    };

    // Start taking the quiz
    const handleStartQuiz = () => {
        if (generatedQuiz) {
            // Set the timePerQuestion in the store (used by Quiz timer)
            useAuthStore.getState().setTimePerQuestion(generatedQuiz.timePerQuestion);

            useAuthStore.getState().setSelectedQuiz({
                questions: generatedQuiz.questions.map(q => ({
                    question: q.question,
                    options: q.options,
                    correct_answer: q.correct_answer
                })),
                timePerQuestion: generatedQuiz.timePerQuestion,
                quizName: generatedQuiz.quizName
            });
            navigate('/quiz');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Nav />
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Document Mode</h1>
                <p className="text-gray-600 mb-8">Upload a PDF document to generate a quiz based on its content.</p>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                        <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
                    </div>
                )}

                {/* Upload Section */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Upload Document</h2>
                    <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf"
                            className="hidden"
                        />
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-2 text-gray-600">Click to upload a PDF document</p>
                        <p className="text-sm text-gray-400">Max 10MB</p>
                    </div>

                    {uploading && uploadProgress && (
                        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                                <span className="text-indigo-700">{uploadProgress.message}</span>
                            </div>
                            {uploadProgress.processed && (
                                <div className="mt-2 bg-indigo-200 rounded-full h-2">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full transition-all"
                                        style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Documents List */}
                {documents.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Documents</h2>
                        <div className="space-y-3">
                            {documents
                                .filter(doc => doc.status === 'ready')
                                .slice(0, 5)
                                .map((doc) => (
                                    <div
                                        key={doc.documentId}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedDocument?.documentId === doc.documentId
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-indigo-300'
                                            }`}
                                        onClick={() => setSelectedDocument(doc)}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-medium text-gray-800">{doc.originalName}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {doc.chunkCount} chunks • {doc.status}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700`}>
                                                {doc.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Quiz Configuration */}
                {selectedDocument && (
                    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Quiz Configuration</h2>
                        <p className="text-sm text-gray-500 mb-4">Selected: {selectedDocument.originalName}</p>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Questions</label>
                                <input
                                    type="number"
                                    min="5"
                                    max="25"
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Time/Question (s)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="120"
                                    value={timePerQuestion}
                                    onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Options/Question</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="6"
                                    value={optionsCount}
                                    onChange={(e) => setOptionsCount(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateQuiz}
                            disabled={generatingQuiz}
                            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
                        >
                            {generatingQuiz ? 'Generating Quiz...' : 'Generate Quiz'}
                        </button>

                        {generatingQuiz && (
                            <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                                    <span className="text-indigo-700">Generating your quiz... This may take a moment.</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Generated Quiz */}
                {generatedQuiz && (
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4">Quiz Ready!</h2>
                        <div className="mb-4">
                            <p className="text-gray-600"><strong>Topics:</strong> {generatedQuiz.topics?.join(', ')}</p>
                            <p className="text-gray-600"><strong>Questions:</strong> {generatedQuiz.questions?.length}</p>
                            <p className="text-gray-600"><strong>Time per question:</strong> {generatedQuiz.timePerQuestion}s</p>
                        </div>
                        <button
                            onClick={handleStartQuiz}
                            className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Start Quiz
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentMode;
