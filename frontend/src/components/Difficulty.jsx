import Next from "./Next";
import useAuthStore from "./Store"; // Import Zustand store

const difficulties = [
    {
        title: "Easy",
        desc: "Beginner friendly questions",
        color: "text-green-600",
        icon: <span className="text-2xl sm:text-3xl relative right-2">★</span>
    },
    {
        title: "Medium",
        desc: "Moderate challenge questions",
        color: "text-yellow-600",
        icon: <span className="text-2xl sm:text-3xl">★★</span>
    },
    {
        title: "Hard",
        desc: "Expert level questions",
        color: "text-red-600",
        icon: <span className="text-2xl sm:text-3xl relative left-2">★★★</span>
    },
];

export default () => {
    const { difficulty, setDifficulty } = useAuthStore(); // Zustand state

    return (
        <section className="py-8 sm:py-12">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-8">
                <div className="max-w-md">
                    <h1 className="text-gray-800 text-lg sm:text-xl md:text-2xl font-extrabold">
                        Choose Quiz Difficulty
                    </h1>
                    <p className="text-gray-600 mt-2 text-sm sm:text-base">
                        Select a difficulty level that matches your knowledge level.
                    </p>
                </div>
                <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {difficulties.map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setDifficulty(item.title)} // Set difficulty
                            className={`w-full text-left border rounded-lg 
                                hover:bg-gray-50 focus:outline-none focus:ring-2 
                                focus:ring-indigo-600 focus:border-transparent transition-all
                                ${difficulty === item.title ? "border-indigo-600 bg-gray-100" : ""}
                            `}
                        >
                            <div className="flex items-start justify-between p-3 sm:p-4">
                                <div className="space-y-1 sm:space-y-2">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center ${item.color}`}>
                                        {item.icon}
                                    </div>
                                    <h4 className="text-gray-800 font-semibold text-base sm:text-lg">
                                        {item.title}
                                    </h4>
                                    <p className="text-gray-600 text-xs sm:text-sm">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                <Next />
            </div>
        </section>
    );
};
