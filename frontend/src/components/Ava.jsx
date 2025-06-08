import * as Avatar from "@radix-ui/react-avatar";
import { useNavigate } from 'react-router-dom';  
import useAuthStore from '../components/Store';

const Ava = () => {
  const navigate = useNavigate();
  // Only select what we need and memoize the selector
  const name = useAuthStore(state => state.name);
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);

  if (!isLoggedIn || !name) {
    return null;
  }

  // Move computation outside component to prevent unnecessary recalculations
  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-center gap-x-10">
      <Avatar.Root className="flex items-center space-x-3">
        <Avatar.Fallback
          className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-semibold"
        >
          {initials}
        </Avatar.Fallback>
        <div>
          <span className="text-gray-700 text-sm font-medium">
            {name}
          </span>
          <button 
            onClick={() => navigate("/Logout")} // Navigate to the logout page or perform the logout action as needed
            className="block text-indigo-600 hover:text-indigo-500 text-xs"
          >
            Logout
          </button>
        </div>
      </Avatar.Root>
    </div>
  );
};

export default Ava;
