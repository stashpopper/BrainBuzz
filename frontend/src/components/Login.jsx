import { useNavigate } from 'react-router-dom';
import useAuthStore from '../components/Store';
import axios from 'axios';
import { useState, useEffect } from 'react';

function Login () { 
    const setEmail = useAuthStore((state) => state.setEmail);
    const setPassword = useAuthStore((state) => state.setPassword);
    const apiUrl = useAuthStore((state) => state.apiUrl);
    const email = useAuthStore((state) => state.email);
    const password = useAuthStore((state) => state.password);
    const setToken = useAuthStore((state) => state.setToken);
    const setUserData = useAuthStore((state) => state.setUserData);
    const setIsLoading = useAuthStore((state) => state.setIsLoading);
    const isLoading = useAuthStore((state) => state.isLoading);
    const setAuthError = useAuthStore((state) => state.setAuthError);
    const authError = useAuthStore((state) => state.authError);
    
    const navigate = useNavigate();
    
    // Local validation state
    const [validationError, setValidationError] = useState(null);
    
    // Clear errors on unmount or when inputs change
    useEffect(() => {
        setAuthError(null);
        setValidationError(null);
    }, [email, password, setAuthError]);
    
    function handlesignupClick() {
        navigate('/signup');
    }
    
    const validateForm = () => {
        // Email validation using regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setValidationError("Please enter a valid email address");
            return false;
        }
        
        // Password validation
        if (password.length < 8) {
            setValidationError("Password must be at least 8 characters long");
            return false;
        }
        
        return true;
    };
    
    const handleLogin = async () => {
        // Reset errors
        setAuthError(null);
        setValidationError(null);
        
        // Validate form
        if (!validateForm()) {
            return;
        }
        
        // Set loading state
        setIsLoading(true);
        
        try {
            const response = await axios.post(`${apiUrl}/login`, { email, password });

            if (response.data.token) {
                setToken(response.data.token);
                setUserData({ 
                    name: response.data.name,
                    id: response.data.id,
                    email: response.data.email
                });
                navigate('/');  // Redirect after login
            }
        } catch (error) {
            console.error("Login failed", error);
            if (error.response && error.response.data && error.response.data.message) {
                setAuthError(error.response.data.message);
            } else {
                setAuthError("Login failed. Please check your credentials and try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <main className="w-full h-screen flex flex-col items-center justify-center px-4">
            <div className="max-w-sm w-full text-gray-600 space-y-5">
                <div className="text-center pb-8">                <div className="ml-2 flex justify-center">
                    <span className="text-4xl font-bold text-indigo-600">Brain</span>
                    <span className="text-4xl font-bold text-gray-700">Buzz</span>
                    <span className="ml-1 text-xs font-medium text-indigo-400 align-top">QUIZ</span>
                </div>
                <div className="mt-8">
                    <h3 className="text-gray-800 text-2xl font-bold sm:text-3xl">Log in to your account</h3>
                </div>
                </div>
                <form
                    onSubmit={(e) => e.preventDefault()}
                    className="space-y-5"
                >
                    <div>
                        <label className="font-medium">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            placeholder='Enter your email'
                            onChange={(e) => setEmail(e.target.value)} // ✅ Set email in Zustand store
                            className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="font-medium">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            placeholder='Enter your password'
                            onChange={(e) => setPassword(e.target.value)} // ✅ Set password in Zustand store
                            className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                        />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-x-3">
                            <input type="checkbox" id="remember-me-checkbox" className="checkbox-item peer hidden" />
                            <label
                                htmlFor="remember-me-checkbox"
                                className="relative flex w-5 h-5 bg-white peer-checked:bg-indigo-600 rounded-md border ring-offset-2 ring-indigo-600 duration-150 peer-active:ring cursor-pointer after:absolute after:inset-x-0 after:top-[3px] after:m-auto after:w-1.5 after:h-2.5 after:border-r-2 after:border-b-2 after:border-white after:rotate-45"
                            >
                            </label>
                            <span>Remember me</span>
                        </div>
                        <a href="javascript:void(0)" className="text-center text-indigo-600 hover:text-indigo-500">Forgot password?</a>
                    </div>
                    {/* Error message area */}
                    {(validationError || authError) && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                            {validationError || authError}
                        </div>
                    )}
                    <button
                        className="w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150 relative"
                        onClick={handleLogin}
                        disabled={isLoading}
                    > 
                        {isLoading ? (
                            <>
                                <span className="opacity-0">Sign in</span>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </>
                        ) : "Sign in"}
                    </button>
                </form>
               
                <p className="text-center">Don't have an account? <a href="javascript:void(0)" className="font-medium text-indigo-600 hover:text-indigo-500" onClick={handlesignupClick}>Sign up</a></p>
            </div>
        </main>
    )
}

export default Login;
