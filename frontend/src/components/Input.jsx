import { useState } from 'react';
import Next from './Next';
import useAuthStore from '../components/Store';

const Input = () => {
  const [inputCategory, setInputCategory] = useState(""); // Local state for input field
  const { categories, setCategories, quizName, setQuizName } = useAuthStore();

  const handleAddCategory = (e) => {
    if (e) e.preventDefault();
    if (inputCategory.trim() !== '') {
      setCategories([...categories, inputCategory.trim()]);
      setInputCategory(''); // Clear local input state
    }
  };
  const handleAddName = (e) => {
    if (e) e.preventDefault();
    if (quizName.trim() !== '') {
      setQuizName(quizName.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    }
  };

  const handleRemoveCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="max-w-md px-4 mx-auto mt-12">
      <div className="relative flex flex-wrap gap-2 mt-4">
        <input
          type="text"
          value={quizName}
          onChange={(e) => setQuizName(e.target.value)}
          placeholder="Enter Quiz Name (optional)"
          className="flex-1 py-3 pl-4 pr-12 text-gray-500 border rounded-md outline-none bg-gray-50 focus:bg-white focus:border-indigo-600"
        />
        <button
          type="button"
          className="px-4 py-2 text-white bg-indigo-600 rounded-md"
          onClick={handleAddName}
        >
          Save
        </button>
        <input
          type="text"
          value={inputCategory}
          onChange={(e) => setInputCategory(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Select Category"
          className="flex-1 py-3 pl-4 pr-12 text-gray-500 border rounded-md outline-none bg-gray-50 focus:bg-white focus:border-indigo-600"
        />
        <button
          type="button"
          className="px-4 py-2 text-white bg-indigo-600 rounded-md"
          onClick={handleAddCategory}
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {categories.map((c, index) => (
          <span key={index} className="flex items-center gap-2 px-3 py-1 text-white bg-indigo-600 rounded-md">
            {c}
            <button onClick={() => handleRemoveCategory(index)} className="text-white rounded-full w-4 h-4 flex items-center justify-center">
              ❌
            </button>          </span>
        ))}
      </div>
      <div className="mt-6">
        <Next />
      </div>
    </form>
  );
};

export default Input;
