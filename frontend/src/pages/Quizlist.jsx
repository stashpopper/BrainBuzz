import React, { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../components/Store";

const Quizlist = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const setSelectedQuiz = useAuthStore((state) => state.setSelectedQuiz);
  const apiUrl = useAuthStore((state) => state.apiUrl);
  useEffect(() => {
    const fetchQuizList = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${apiUrl}/quiz`);
        
        // Get stored quiz scores from local storage
        const quizScores = JSON.parse(localStorage.getItem('quizScores') || '{}');
        
        // Add lastScore property to each quiz
        const quizzesWithScores = response.data.map(quiz => {
          // Make sure to parse the score as a number
          const lastScore = quizScores[quiz._id] ? parseFloat(quizScores[quiz._id]).toFixed(0) : undefined;
          return {
            ...quiz,
            lastScore: lastScore // Add the last score if available
          };
        });
        
        setQuizzes(quizzesWithScores);
      } catch (error) {
        console.error("Error fetching quiz list:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizList();
  }, [apiUrl]);
  const handleTakeQuiz = (quiz) => {
    // Get current scores from localStorage
    try {
      const quizScores = JSON.parse(localStorage.getItem('quizScores') || '{}');
      const lastScore = quizScores[quiz._id];
      
      // Store the selected quiz in the global state and navigate to quiz page
      setSelectedQuiz({
        ...quiz,
        lastScore: lastScore
      });
      
      navigate(`/quiz/${quiz._id}`);
    } catch (error) {
      console.error('Error retrieving quiz scores:', error);
      // Fall back to basic navigation if there's an error
      setSelectedQuiz(quiz);
      navigate(`/quiz/${quiz._id}`);
    }
  };

  return (
    <>
      <Nav />
      <section className="py-14">
        <div className="max-w-screen-xl mx-auto px-4 text-gray-600 md:px-8">          <div className="relative max-w-xl mx-auto sm:text-center">
            <h3 className="text-gray-800 text-3xl font-semibold sm:text-4xl">
              Available Quizzes
            </h3>
            <div className="mt-3 max-w-xl">
              <p>
                Browse through our collection of quizzes and test your knowledge. Click on any quiz to participate!
              </p>
            </div>
          </div>
          
          <div className="mt-8 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search quizzes by name..."
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
          </div>          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
                    
                    <div className="mt-3 flex items-center gap-3 text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                      <span>{quiz.lastScore !== undefined ? `Last Score: ${quiz.lastScore}%` : 'Not attempted yet'}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-end">
                    <button 
                      onClick={() => handleTakeQuiz(quiz)} 
                      className="px-3 py-3 rounded-lg w-full font-semibold text-sm duration-150 text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700"
                    >
                      Take Quiz
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-16 text-center">
              <p className="text-gray-500 text-lg">No quizzes available at the moment.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Quizlist;

