import useAuthStore from "./Store";
import Next from "./Next";

const QuizConfigurator = () => {
    const { 
        optionsCount, setOptionsCount, 
        questionCount, setQuestionCount, 
        timePerQuestion, setTimePerQuestion 
    } = useAuthStore();

    const optionButtons = [
        { value: 2, label: "2 Options" },
        { value: 3, label: "3 Options" },
        { value: 4, label: "4 Options" },
    ];    return (
        <div className="max-w-md mx-auto px-4 space-y-8">
            <h2 className="text-gray-800 text-xl font-medium">Configure Your Quiz</h2>
                
                {/* Options Selection */}
                <div className="space-y-4">
                    <h3 className="text-gray-700 font-medium">Number of Options</h3>
                    <ul className="grid grid-cols-3 gap-3">
                        {optionButtons.map((item, idx) => (
                            <li key={idx}>
                                <label className="block relative">
                                    <input 
                                        type="radio" 
                                        name="options" 
                                        checked={optionsCount === item.value}
                                        onChange={() => setOptionsCount(item.value)}
                                        className="sr-only peer"
                                    />
                                    <div className={`w-full p-3 text-center cursor-pointer rounded-lg border bg-white shadow-sm 
                                        peer-checked:ring-2 peer-checked:ring-indigo-600 duration-200`}>
                                        {item.label}
                                    </div>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Question Count */}
                <div className="space-y-4">
                    <h3 className="text-gray-700 font-medium">
                        Number of Questions: {questionCount}
                    </h3>
                    <input
                        type="range"
                        min="5"
                        max="50"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>5</span>
                        <span>50</span>
                    </div>
                </div>

                {/* Time Per Question */}
                <div className="space-y-4">
                    <h3 className="text-gray-700 font-medium">
                        Time per Question: {timePerQuestion} seconds
                    </h3>
                    <input
                        type="range"
                        min="30"
                        max="300"
                        step="30"
                        value={timePerQuestion}
                        onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>30s</span>
                        <span>5m</span>
                    </div>                </div>

                <Next />
        </div>
    );
};

export default QuizConfigurator;
