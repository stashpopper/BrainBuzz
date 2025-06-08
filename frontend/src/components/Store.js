import { create } from 'zustand';

// Use environment variable for API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const useAuthStore = create((set) => ({
    // API base URL for all requests
    apiUrl: API_URL,
    
    name: '',
    setName: (name) => set({ name: name }),
    email: '',
    setEmail: (email) => set({ email: email }),
    password: '',
    setPassword: (password) => set({ password: password }),
    // Authentication state
    token: null,
    isLoggedIn: false,
    setIsLoggedIn: (status) => set({ isLoggedIn: status }),
    setToken: (token) => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
        set({ token, isLoggedIn: !!token });
    },
    setUserData: (data) => {
        if (data) {
            localStorage.setItem('userData', JSON.stringify(data));
            set({ name: data.name, isLoggedIn: true });
        }
    },
    initFromStorage: () => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('userData');
        if (token && userData) {
            const parsedUserData = JSON.parse(userData);
            set({ 
                token,
                name: parsedUserData.name,
                isLoggedIn: true
            });
        }
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        set({ token: null, isLoggedIn: false, name: '' });
    },

    inviteLink: '',
    setInviteLink: (link) => set({ inviteLink: link }),
    // Step management
    stepsItems: ["Category", "Difficulty", "Customise", "Review"],
    currentStep: 1,
    setCurrentStep: (step) => set({ currentStep: step }),
    nextStep: () => set((state) => ({
        currentStep: Math.min(state.currentStep + 1, state.stepsItems.length)
    })),
    prevStep: () => set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 1)
    })),

    // Categories
    categories: [],
    setCategories: (newCategories) => set({ categories: newCategories }),
    quizName: '',
    setQuizName: (name) => set({ quizName: name }),
    removeCategory: (category) => set((state) => ({
        categories: state.categories.filter((c) => c !== category)
    })),

    // Difficulty Level
    difficulty: "Medium",
    setDifficulty: (level) => set({ difficulty: level }),

    // Quiz Customization
    optionsCount: 4,
    setOptionsCount: (count) => set({ optionsCount: count }),

    questionCount: 10,
    setQuestionCount: (count) => set({ questionCount: count }),

    timePerQuestion: 60,
    setTimePerQuestion: (time) => set({ timePerQuestion: time }),

    // Selected Quiz for taking the quiz
    selectedQuiz: null,
    setSelectedQuiz: (quiz) => set({ selectedQuiz: quiz }),
    
    // Quiz Results
    quizResults: {
        totalQuestions: 0,
        correctAnswers: 0,
        score: 0,
        userAnswers: [],
        
    },
    setQuizResults: (results) => set({ quizResults: results }),
    updateQuizResults: (partialResults) => set((state) => ({
        quizResults: { ...state.quizResults, ...partialResults }
    })),
}));

export default useAuthStore;
