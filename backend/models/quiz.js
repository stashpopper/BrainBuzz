const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  quizName: { type: String, required: true, unique: true }, // Category name or quiz title
  questions: [
    {
      question: { type: String, required: true },
      options: { type: [String], required: true },
      correct_answer: { type: String, required: true },
    },
    

  ],
  categories: { type: [String], required: true },
  optionsCount: { type: Number, required: true },
  questionCount: { type: Number, required: true },
  difficulty: { type: String, required: true },
  timePerQuestion: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'brainbuzzsignup', required: true } // Reference to the User model
});

const Quiz = mongoose.model("quizlist", quizSchema);
module.exports = Quiz;
