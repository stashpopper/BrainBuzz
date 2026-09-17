import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import useAuthStore from './Store';
import Nav from './Nav';

const CreateQuizRoom = () => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const apiUrl = useAuthStore((state) => state.apiUrl);
  const storeUser = useAuthStore((state) => state.user);
  const ensureGuestSession = useAuthStore((state) => state.ensureGuestSession);

  const [formData, setFormData] = useState({
    roomName: '',
    categories: ['General Knowledge'],
    difficulty: 'medium',
    questionCount: 10,
    optionsCount: 4,
    timePerQuestion: 30,
    maxParticipants: 10
  });

  const [availableCategories] = useState([
    'General Knowledge', 'Science', 'Technology', 'History', 'Geography',
    'Sports', 'Entertainment', 'Literature', 'Math', 'Art', 'Music',
    'Movies', 'TV Shows', 'Animals', 'Food', 'Travel', 'Business',
    'Politics', 'Philosophy', 'Psychology', 'Medicine', 'Physics',
    'Chemistry', 'Biology', 'Computer Science', 'Programming'
  ]);

  // Quiz source: 'categories' (default, existing behavior) or 'document' (PDF uploaded in the room)
  const [quizSource, setQuizSource] = useState('categories');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(null); // { documentId, documentName, status }
  const [docProgress, setDocProgress] = useState('');
  const socketRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Anonymous visitors get a guest session automatically — no login needed
  useEffect(() => {
    if (!token) {
      ensureGuestSession().catch((err) => {
        console.error('Guest session failed:', err);
        setError('Could not start a session. Please refresh the page.');
      });
    }
  }, [token]);

  // Socket connection for document processing progress (only needed in document mode)
  useEffect(() => {
    if (quizSource !== 'document' || !token) return;

    socketRef.current = io(apiUrl);
    const storeId = storeUser?.id;
    let userData = null;
    try { userData = JSON.parse(localStorage.getItem('userData')); } catch (_) {}
    const userId = storeId || userData?.id;
    if (userId) {
      socketRef.current.emit('joinUserChannel', { userId });
    }

    socketRef.current.on('documentProgress', (data) => {
      setDocProgress(data.message || data.phase);
      if (data.phase === 'complete') {
        setUploadingDoc(false);
        setUploadedDoc(prev => prev ? { ...prev, status: 'ready' } : prev);
      } else if (data.phase === 'error') {
        setUploadingDoc(false);
        setError(data.message || 'Document processing failed');
        setUploadedDoc(null);
        setFileInputKey(k => k + 1);
      }
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [quizSource, token, apiUrl]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategoryChange = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleSourceChange = (source) => {
    setQuizSource(source);
    setError('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    setError('');

    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB');
      e.target.value = '';
      return;
    }

    setUploadingDoc(true);
    setDocProgress('Uploading document...');
    setUploadedDoc(null);

    try {
      const authToken = token || await ensureGuestSession();
      const fd = new FormData();
      fd.append('document', file);
      const response = await axios.post(`${apiUrl}/document/upload`, fd, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadedDoc({
        documentId: response.data.documentId,
        documentName: response.data.filename,
        status: 'processing'
      });
      setDocProgress('Processing document with AI...');
    } catch (err) {
      console.error('Document upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload document');
      setUploadingDoc(false);
      setDocProgress('');
      setFileInputKey(k => k + 1);
    }
  };

  const removeDocument = () => {
    setUploadedDoc(null);
    setDocProgress('');
    setFileInputKey(k => k + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.roomName.trim()) {
      setError('Room name is required');
      return;
    }

    let authToken;
    try {
      authToken = token || await ensureGuestSession();
    } catch (err) {
      setError('Could not start a session. Please refresh the page and try again.');
      return;
    }

    let payload = { ...formData, quizSource };

    if (quizSource === 'categories') {
      if (formData.categories.length === 0) {
        setError('Please select at least one category');
        return;
      }
    } else {
      if (!uploadedDoc) {
        setError('Please upload a PDF document for the quiz');
        return;
      }
      if (uploadedDoc.status !== 'ready') {
        setError('Document is still processing. Please wait until it is ready.');
        return;
      }
      payload = {
        ...payload,
        categories: [],
        documentId: uploadedDoc.documentId,
        documentName: uploadedDoc.documentName
      };
    }

    setLoading(true);

    try {
      const response = await axios.post(`${apiUrl}/quiz-room`, payload, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      const { roomCode } = response.data.room;
      navigate(`/quiz-room/${roomCode}`);
    } catch (error) {
      console.error('Error creating quiz room:', error);
      if (error.response?.status === 401) {
        setError('Your session has expired. Please refresh the page and try again.');
      } else {
        setError(error.response?.data?.error || 'Failed to create quiz room');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 py-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Create Quiz Room</h1>
              <p className="text-gray-600 dark:text-gray-400">Set up a multiplayer quiz room for up to 100 participants</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Room Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Room Name *
                </label>
                <input
                  type="text"
                  name="roomName"
                  value={formData.roomName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  placeholder="Enter room name"
                  required
                />
              </div>

              {/* Quiz Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quiz Source *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className={`cursor-pointer border-2 rounded-lg p-4 transition-colors ${
                    quizSource === 'categories'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-indigo-300'
                  }`}>
                    <input
                      type="radio"
                      name="quizSource"
                      value="categories"
                      checked={quizSource === 'categories'}
                      onChange={() => handleSourceChange('categories')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🗂️</span>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white">Categories</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">AI generates questions from selected categories</div>
                      </div>
                    </div>
                  </label>

                  <label className={`cursor-pointer border-2 rounded-lg p-4 transition-colors ${
                    quizSource === 'document'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-indigo-300'
                  }`}>
                    <input
                      type="radio"
                      name="quizSource"
                      value="document"
                      checked={quizSource === 'document'}
                      onChange={() => handleSourceChange('document')}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-white">Document (PDF)</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Upload a PDF — questions are generated from its content</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Document Upload — only in document mode */}
              {quizSource === 'document' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Document (PDF, max 10MB) *
                  </label>

                  {!uploadedDoc ? (
                    <div>
                      <input
                        key={fileInputKey}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer"
                        disabled={uploadingDoc}
                      />
                      {(uploadingDoc || docProgress) && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm text-blue-700 dark:text-blue-300">{docProgress}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white text-sm">{uploadedDoc.documentName}</div>
                          {uploadedDoc.status === 'ready' ? (
                            <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Ready — quiz will be generated from this document
                            </div>
                          ) : (
                            <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                              {docProgress || 'Processing...'}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeDocument}
                        className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Categories — only in categories mode */}
              {quizSource === 'categories' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categories * (Select at least one)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-3 dark:bg-gray-800">
                    {availableCategories.map(category => (
                      <label key={category} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.categories.includes(category)}
                          onChange={() => handleCategoryChange(category)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Selected: {formData.categories.join(', ')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Question Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    name="questionCount"
                    value={formData.questionCount}
                    onChange={handleInputChange}
                    min="5"
                    max={quizSource === 'document' ? '25' : '50'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* Options Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Options per Question
                  </label>
                  <input
                    type="number"
                    name="optionsCount"
                    value={formData.optionsCount}
                    onChange={handleInputChange}
                    min="2"
                    max="6"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* Time per Question */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time per Question (seconds)
                  </label>
                  <input
                    type="number"
                    name="timePerQuestion"
                    value={formData.timePerQuestion}
                    onChange={handleInputChange}
                    min="10"
                    max="120"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {/* Max Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    name="maxParticipants"
                    value={formData.maxParticipants}
                    onChange={handleInputChange}
                    min="2"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => navigate('/quiz-rooms')}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
                  disabled={loading || uploadingDoc || (quizSource === 'document' && (!uploadedDoc || uploadedDoc.status !== 'ready'))}
                >
                  {loading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateQuizRoom;
