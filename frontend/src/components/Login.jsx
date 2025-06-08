import { useNavigate } from 'react-router-dom';
import useAuthStore from '../components/Store';
import axios from 'axios';

function Login () { 
    const setEmail = useAuthStore((state) => state.setEmail);
    const setPassword = useAuthStore((state) => state.setPassword);
    const apiUrl = useAuthStore((state) => state.apiUrl);
    const email = useAuthStore((state) => state.email);
    const password = useAuthStore((state) => state.password);
    const setToken = useAuthStore((state) => state.setToken);
    const setUserData = useAuthStore((state) => state.setUserData);
    const navigate = useNavigate();
    function handlesignupClick() {
        navigate('/signup');
    }

    const handleLogin = async () => {
        try {
            const response = await axios.post(`${apiUrl}/login`, { email, password });

            if (response.data.token) {
                setToken(response.data.token);
                setUserData({ name: response.data.name });
                navigate('/');  // Redirect after login
            }
        } catch (error) {
            console.error("Login failed", error);
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
                    <button
                        className="w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150"
                    onClick={handleLogin}> 
                        Sign in
                    </button>
                </form>
               
                <p className="text-center">Don't have an account? <a href="javascript:void(0)" className="font-medium text-indigo-600 hover:text-indigo-500" onClick={handlesignupClick}>Sign up</a></p>
            </div>
        </main>
    )
}

export default Login;
