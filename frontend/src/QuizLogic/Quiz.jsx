import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import useAuthStore from "../components/Store";
import Nav from "../components/Nav";

// API configuration for AI quiz generation
const API_KEY = "w9MCe67fIaMN4PT4koycxNt6ae50XVXG"; // Replace with your key
const API_URL = "https://api.mistral.ai/v1/chat/completions";

const QuizApp = () => {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const { id } = useParams();
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  
  const navigate = useNavigate();
  const selectedQuiz = useAuthStore((state) => state.selectedQuiz);
  const updateQuizResults = useAuthStore((state) => state.updateQuizResults);
  const timePerQuestion = useAuthStore((state) => state.timePerQuestion);
  
  // Get quiz customization parameters from store
  const categories = useAuthStore((state) => state.categories);
  const difficulty = useAuthStore((state) => state.difficulty);
  const optionsCount = useAuthStore((state) => state.optionsCount);
  const questionCount = useAuthStore((state) => state.questionCount);
  const quizName = useAuthStore((state) => state.quizName);
  
  // Get API URL from store
  const apiUrl = useAuthStore((state) => state.apiUrl);

  // Fetch AI-generated quiz
  const fetchAIQuiz = async () => {
    if (categories.length === 0) {
      alert("Please select at least one category!");
      return;
    }

    setLoading(true);
    const categoryString = categories.join(", ");

    const prompt = `
      Generate a ${difficulty} level multiple-choice quiz with ${questionCount} questions.
      Each question should have ${optionsCount} answer options.
      The quiz should be based on these categories: ${categoryString}.
      The time limit for each question is ${timePerQuestion} seconds.
      Questions should be non-repetitive and cover a wide range of topics within the categories.
      Provide a JSON response with "question", "options", and "correct_answer" fields, without extra text.
    `;

    try {
      const response = await axios.post(
        API_URL,
        {
          model: "mistral-large-2411",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      let rawContent = response.data.choices[0]?.message?.content?.trim();
      if (!rawContent) {
        console.error("API response is empty or incorrect:", response.data);
        setLoading(false);
        return;
      }

      // Extract JSON part (between the first '[' and last ']')
      const startIdx = rawContent.indexOf("[");
      const endIdx = rawContent.lastIndexOf("]");      if (startIdx === -1 || endIdx === -1) {
        console.error("JSON not found in response:", rawContent);
        setLoading(false);
        return;
      }
      const jsonContent = rawContent.substring(startIdx, endIdx + 1);

      try {
        const parsedQuiz = JSON.parse(jsonContent);
        
        // Make sure the quiz name is unique by adding timestamp
        const timestamp = new Date().getTime();
       
      
        
        // Create quiz object with proper structure
        const formattedQuiz = {
          quizName: quizName,
          questions: parsedQuiz,
          categories: categories,
          optionsCount: optionsCount,
          questionCount: questionCount,
          difficulty: difficulty,
          timePerQuestion: timePerQuestion
        };
          // Set the quiz state to start taking it immediately
        setQuiz(formattedQuiz);
        setCurrentQuestionIndex(0);
        setSelectedAnswers(Array(parsedQuiz.length).fill(null));
        setShowQuizConfig(false); // Hide the configuration screen

        // Save the quiz to the database in the background
        try {

          if (!categories || categories.length === 0) {
            throw new Error('Category is required');
        }
          // Get token from store for authenticated request
          const token = useAuthStore.getState().token; 
          if (!token) {
              console.error("User not authenticated. Cannot save quiz.");              // Optionally alert the user or handle differently
              return; // Stop if no token
          }

          axios.post(`${apiUrl}/quiz`, {
            quizName: quizName,
            questions: parsedQuiz,
            categories: categories,
            optionsCount: optionsCount,
            questionCount: questionCount,
            difficulty: difficulty,
            timePerQuestion: timePerQuestion
          }, { // Add headers for authentication
            headers: {
              Authorization: `Bearer ${token}`
            }          }).then(response => {
            // Update the formattedQuiz with the database ID if needed
            if (response.data.quiz && response.data.quiz._id) {
              formattedQuiz._id = response.data.quiz._id;
              setQuiz({...formattedQuiz});
            }
          }).catch(saveError => {
            // Enhanced error logging for saving quiz
            const errorData = saveError.response?.data;
            const status = saveError.response?.status;
            console.error(`Error saving quiz to database (Status: ${status}):`, errorData || saveError.message);
            if (status === 401) {
              console.error("Authentication failed. Token might be invalid, expired, or missing.");
              // Optionally, prompt user to log in again or handle token refresh if implemented
              alert("Authentication failed. Please log in again to save quizzes.");
              // navigate('/login'); // Example: redirect to login
            } else {
              alert("An error occurred while trying to save the quiz. You can still take the quiz, but it won't be saved to your account.");
            }
            // Continue with the quiz even if saving fails
          });
        } catch (saveError) {
          console.error("Error initiating save to database:", saveError);
          // Continue with the quiz even if saving fails
        }
        
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError, "Extracted JSON:", jsonContent);
        setLoading(false);
        alert("Error generating quiz. Please try again.");
        return;
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      alert("Failed to generate quiz. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  // Fetch existing quiz data if it's not already in the store
  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        setLoading(true);
        
        // Check if we're in quiz generation mode 
        if (!id && !selectedQuiz) {
          setShowQuizConfig(true);
          setLoading(false);
          return;
        }
        
        // If quiz is already in store, use it
        if (selectedQuiz && (!id || selectedQuiz._id === id)) {
          setQuiz(selectedQuiz);
          setSelectedAnswers(Array(selectedQuiz.questions.length).fill(null));
        } 
        // Otherwise fetch it from the API
        else if (id) {
          const response = await axios.get(`${apiUrl}/quiz/${id}`);
          setQuiz(response.data);
          setSelectedAnswers(Array(response.data.questions.length).fill(null));
        } else {
          // If no quiz is selected or provided, show quiz config
          setShowQuizConfig(true);
        }
      } catch (error) {
        console.error("Error fetching quiz:", error);
        if (id) {
          alert("Failed to load the quiz. Please try again.");
          navigate('/quizlist');
        } else {
          setShowQuizConfig(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [id, selectedQuiz, navigate, apiUrl]);

  // Timer for each question
  useEffect(() => {
    if (quiz && quiz.questions && quiz.questions.length > 0) {
      setRemainingTime(timePerQuestion);
      const timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto move to next question if time is up
            handleNextQuestion();
            return timePerQuestion;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentQuestionIndex, quiz, timePerQuestion]);

  // Save the selected answer for the current question
  const handleOptionSelect = (option) => {
    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[currentQuestionIndex] = option;
    setSelectedAnswers(updatedAnswers);
  };

  // Move to the next question or finish the quiz
  const handleNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (quiz) {
      // Calculate results
      let correctCount = 0;
      const userAnswers = [];
      
      quiz.questions.forEach((q, i) => {
        const isCorrect = selectedAnswers[i] === q.correct_answer;
        if (isCorrect) {
          correctCount++;
        }
        
        userAnswers.push({
          question: q.question,
          userAnswer: selectedAnswers[i] || "No answer",
          correctAnswer: q.correct_answer,
          isCorrect
        });
      });
      
      const score = (correctCount / quiz.questions.length) * 100;
      
      // Store results in the global state
      updateQuizResults({
        totalQuestions: quiz.questions.length,
        correctAnswers: correctCount,
        score,
        userAnswers,
        quizName: quiz.quizName
      });
      
      // Navigate to score page
      navigate('/score');
    }
  };

  if (loading) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="ml-3 text-lg text-indigo-600">
            {showQuizConfig ? "Loading..." : "Generating your quiz..."}
          </p>
        </div>
      </>
    );
  }

  if (showQuizConfig) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 py-10">
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Quiz Configuration</h2>
              <div className="mb-8 space-y-2">
                <p className="text-gray-700">
                  <span className="font-semibold">Selected Categories:</span> {categories.join(", ") || "None"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Difficulty:</span> {difficulty}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Options per Question:</span> {optionsCount}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Total Questions:</span> {questionCount}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Time per Question:</span> {timePerQuestion}s
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={fetchAIQuiz}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate & Start Quiz"}
                </button>
                <button
                  onClick={() => navigate('/quizlist')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Browse Existing Quizzes
                </button>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                Generate a new quiz to take immediately, or browse existing quizzes to take later.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <>
        <Nav />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-6 bg-white rounded-xl shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Quiz Not Found</h2>
            <p className="text-gray-600 mb-6">The quiz you're looking for doesn't exist or has no questions.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button 
                onClick={() => {
                  setShowQuizConfig(true);
                  navigate('/quiz');
                }} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
              >
                Generate New Quiz
              </button>
              <button 
                onClick={() => navigate('/quizlist')} 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 mt-2 sm:mt-0"
              >
                Browse Quiz List
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Get current question
  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{quiz.quizName || "Quiz"}</h1>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-semibold text-gray-800">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </h3>
              <div className="text-sm text-gray-600">
                Time Remaining: <span className="font-semibold">{remainingTime}s</span>
              </div>
            </div>
            {/* Add check for currentQuestion before accessing its properties */}
            <p className="text-xl text-gray-800 mb-6">{currentQuestion?.question || 'Loading question...'}</p>
            <div className="grid gap-4">
              {/* Add check to ensure options is an array before mapping */}
              {currentQuestion && Array.isArray(currentQuestion.options) ? currentQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionSelect(opt)}
                  className={`w-full px-4 py-3 border rounded-lg transition-colors 
                    ${selectedAnswers[currentQuestionIndex] === opt ? "bg-indigo-200 border-indigo-600" : "bg-white hover:bg-gray-50"}`}
                >
                  {opt}
                </button>
              )) : <p>Loading options...</p>} 
            </div>
          </div>
          <div className="flex justify-end mb-6">
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {currentQuestionIndex === quiz.questions.length - 1 ? "Submit Quiz" : "Next Question"}
            </button>
          </div>
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-right text-sm text-gray-500 mt-1">
              {currentQuestionIndex + 1} / {quiz.questions.length}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuizApp;
