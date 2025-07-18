import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Features from "../components/Features";
import Nav from "../components/Nav";
import useAuthStore from "../components/Store";
import LoginPopup from "../components/LoginPopup";


function Pages() {
    const navigate = useNavigate();
    const { setCurrentStep } = useAuthStore();
    const [showLoginPopup, setShowLoginPopup] = useState(false);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

    return (
        <>
            <Nav />
            <section className="py-28">
                <div className="max-w-screen-xl mx-auto text-gray-600 gap-x-12 items-center justify-between overflow-hidden md:flex md:px-8">
                    <div className="flex-none space-y-5 px-4 sm:max-w-lg md:px-0 lg:max-w-xl">
                        <h1 className="text-sm text-indigo-600 font-medium">
                            WELCOME TO BRAINBUZZ
                        </h1>
                        <h2 className="text-4xl text-gray-800 font-extrabold md:text-5xl">
                            Your all-in-one platform for quizzes, tests, and exams
                        </h2>
                        <p>
                            BrainBuzz is a powerful platform that allows you to create quizzes, tests, and exams online. It's easy to use and perfect for teachers, trainers, and anyone else who needs to create online assessments.
                        </p>                        <div className="items-center sm:space-y-0 flex flex-wrap gap-4">
                            <button 
                                onClick={() => { 
                                    if (isLoggedIn) {
                                        setCurrentStep(1); 
                                        navigate("/Steps");
                                    } else {
                                        setShowLoginPopup(true);
                                    }
                                }} 
                                className="block py-2 px-4 text-center text-white font-medium bg-indigo-600 duration-150 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg shadow-lg hover:shadow-none"
                            >
                                Create a quiz
                            </button>
                            <button 
                                className="flex items-center justify-center gap-x-2 py-2 px-4 text-gray-700 hover:text-gray-500 font-medium duration-150 active:bg-gray-100 border rounded-lg md:inline-flex" 
                                onClick={() => navigate('/quizlist')}
                            >
                                Browse All Quizzes
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h12.59l-2.1-1.95a.75.75 0 111.02-1.1l3.5 3.25a.75.75 0 010 1.1l-3.5 3.25a.75.75 0 11-1.02-1.1l2.1-1.95H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                                </svg>
                            </button>                            <button 
                                className="flex items-center justify-center gap-x-2 py-2 px-4 text-gray-700 hover:text-gray-500 font-medium duration-150 active:bg-gray-100 border rounded-lg md:inline-flex bg-indigo-100 hover:bg-indigo-200" 
                                onClick={() => {
                                    if (isLoggedIn) {
                                        navigate('/quiz-rooms');
                                    } else {
                                        setShowLoginPopup(true);
                                    }
                                }}
                            >
                                Join a Room
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex-none mt-14 md:mt-0 md:max-w-xl">
                        <img
                            src="https://images.unsplash.com/photo-1573164713619-24c711fe7878?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1738&q=80"
                            className="md:rounded-tl-[108px]"
                            alt=""
                        />
                    </div>                </div>
            </section>
            <section>
                <Features />
            </section>
            
            {/* Login Popup */}
            {showLoginPopup && (
                <LoginPopup onClose={() => setShowLoginPopup(false)} />
            )}
        </>
    );
}

export default Pages;