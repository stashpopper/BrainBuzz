import { useNavigate } from 'react-router-dom';
import useAuthStore from '../components/Store';
import axios from 'axios';

function Form() {
    const setName = useAuthStore((state) => state.setName);
    const setEmail = useAuthStore((state) => state.setEmail);
    const setPassword = useAuthStore((state) => state.setPassword);
    const setToken = useAuthStore((state) => state.setToken);
    const setUserData = useAuthStore((state) => state.setUserData);
    const name = useAuthStore((state) => state.name);
    const email = useAuthStore((state) => state.email);
    const password = useAuthStore((state) => state.password);
    const apiUrl = useAuthStore((state) => state.apiUrl);
    const navigate = useNavigate();

    const handleLoginClick = () => {
        navigate('/login');
    };
    const handlesignup = async (e) => {
        e.preventDefault();
        try {
       const response = await axios.post(`${apiUrl}/signup`, { // Use apiUrl from store
            
            name,
            email,
            password
    })
    if (response.data.token) {
        setToken(response.data.token);
        setUserData({ name });
        navigate('/');
    }

    }
    catch (error) {
        console.error(error);
    }
    }   

    return (
        <>
        <main className="w-full h-screen flex flex-col items-center justify-center bg-gray-50 sm:px-4">
            <div className="w-full space-y-6 text-gray-600 sm:max-w-md">                <div className="text-center">
                <div className="ml-2 flex justify-center">
                    <span className="text-4xl font-bold text-indigo-600">Brain</span>
                    <span className="text-4xl font-bold text-gray-700">Buzz</span>
                    <span className="ml-1 text-xs font-medium text-indigo-400 align-top">QUIZ</span>
                </div>
                <div className="mt-8 space-y-2">
                    <h3 className="text-gray-800 text-2xl font-bold sm:text-3xl">Create an account</h3>
                    <p className="">Already have an account? <a href="javascript:void(0)" className="font-medium text-indigo-600 hover:text-indigo-500" onClick={handleLoginClick}>Log in</a></p>
                </div>
                </div>
                <div className="bg-white shadow p-4 py-6 sm:p-6 sm:rounded-lg">
                    <form
                        onSubmit={handlesignup}
                        className="space-y-5"
                    

                    >
                        <div>
                            <label className="font-medium">
                                Name
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Enter your name"
                                onChange={(e) => setName(e.target.value)} // ✅ Set name in Zustand store
                                className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="font-medium">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="Enter your email"
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
                                placeholder="Enter your password"
                                onChange={(e) => setPassword(e.target.value)} // ✅ Set password in Zustand store
                                className="w-full mt-2 px-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                            />
                        </div>
                        <button
                            className="w-full px-4 py-2 text-white font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600 rounded-lg duration-150"
                        >
                            Create account
                        </button>
                    </form>
                    
                </div>
            </div>
        </main>
        
        </>
    )
}

export default Form;
 // ✅ Export isloggedin variable
