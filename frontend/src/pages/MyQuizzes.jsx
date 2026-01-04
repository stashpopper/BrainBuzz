import React, { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../components/Store";

const MyQuizzes = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const setSelectedQuiz = useAuthStore((state) => state.setSelectedQuiz);
  const apiUrl = useAuthStore((state) => state.apiUrl);
  const token = useAuthStore((state) => state.token); // Get token from store
  
  useEffect(() => {
    const fetchMyQuizzes = async () => {
      if (!token) {
        setError("You must be logged in to view your quizzes.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${apiUrl}/my-quizzes`, {
          headers: {
            Authorization: `Bearer ${token}`, // Include token in header
          },
        });
        
        // No longer getting scores from localStorage
        setQuizzes(response.data);
      } catch (err) {
        console.error("Error fetching user's quizzes:", err);
        if (err.response && err.response.status === 404) {
          setError("You haven't created any quizzes yet.");
          setQuizzes([]); // Ensure quizzes array is empty
        } else if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          setError("Authentication failed. Please log in again.");
        } else {
          setError("An error occurred while fetching your quizzes.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMyQuizzes();
  }, [apiUrl, token, navigate]);
  
  const handleTakeQuiz = (quiz) => {
    // No longer getting scores from localStorage
    setSelectedQuiz(quiz);
    navigate(`/quiz/${quiz._id}`);
  };

  const handleDeleteQuiz = async (quizId) => {
    // Confirmation dialog
    if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    if (!token) {
      setError("Authentication required to delete quizzes.");
      return;
    }

    try {
      setLoading(true); // Indicate activity
      await axios.delete(`${apiUrl}/quiz/${quizId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Remove the deleted quiz from the local state
      setQuizzes(prevQuizzes => prevQuizzes.filter(q => q._id !== quizId));
      setError(null); // Clear any previous errors
      alert("Quiz deleted successfully!");

    } catch (err) {
      console.error("Error deleting quiz:", err);
      const errorMsg = err.response?.data?.error || "An error occurred while deleting the quiz.";
      setError(errorMsg);
      alert(`Error: ${errorMsg}`); // Show error to user
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />
      <section className="py-14">
        <div className="max-w-screen-xl mx-auto px-4 text-gray-600 md:px-8">
          <div className="relative max-w-xl mx-auto sm:text-center">
            <h3 className="text-gray-800 text-3xl font-semibold sm:text-4xl">
              My Created Quizzes
            </h3>
            <div className="mt-3 max-w-xl">
              <p>
                Here are the quizzes you have created. You can take them or manage them.
              </p>
            </div>
          </div>

          <div className="mt-8 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search your quizzes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors duration-200"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute right-3 top-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
             <div className="mt-16 text-center">
               <p className="text-red-500 text-lg">{error}</p>
             </div>
          ) : quizzes.length > 0 ? (
            <div className="mt-16 space-y-6 justify-center gap-6 sm:grid sm:grid-cols-2 sm:space-y-0 lg:grid-cols-3">
              {quizzes
                .filter(quiz =>
                  quiz.quizName && quiz.quizName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((quiz, idx) => (
                <div key={idx} className="relative flex-1 flex items-stretch flex-col p-8 rounded-xl border-2 hover:border-indigo-500 transition-all duration-300">
                  <div>
                    <span className="text-indigo-600 font-medium">
                      Quiz #{idx + 1}
                    </span>
                    <div className="mt-4 text-gray-800 text-2xl font-semibold">
                      {quiz.quizName || `Quiz ${idx + 1}`}
                    </div>
                    <p className="mt-3 text-gray-600">
                      {quiz.description || `A collection of ${quiz.questions ? quiz.questions.length : 'multiple'} questions`}
                    </p>
                  </div>

                  <div className="py-8">
                    <div className="flex items-center gap-3 text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{quiz.questionCount || 'Multiple'} Questions</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{quiz.timePerQuestion || '30'} seconds per question</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Difficulty: {quiz.difficulty || 'Medium'}</span>
                    </div>
                    
                    {/* Removed score display section */}
                  </div>

                  <div className="flex-1 flex items-end gap-4">
                    <button
                      onClick={() => handleTakeQuiz(quiz)}
                      className="px-3 py-3 rounded-lg w-full font-semibold text-sm duration-150 text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700"
                    >
                      Take Quiz
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz._id)}
                      className="mt-2 px-3 py-3 rounded-lg w-full font-semibold text-sm duration-150 text-white bg-red-600 hover:bg-red-500 active:bg-red-700"
                      disabled={loading}
                    >
                      Delete Quiz
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center">
              <p className="text-gray-500 text-lg">You haven't created any quizzes yet.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default MyQuizzes;
