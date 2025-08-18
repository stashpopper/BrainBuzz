🧠 BrainBuzz

**BrainBuzz** is an interactive quiz application designed to challenge and enhance your knowledge across various domains. Built with a modern tech stack, it offers a seamless and engaging user experience.

---

🚀 Features

- **Diverse Quiz Categories**: Explore quizzes spanning multiple topics to test and expand your knowledge.
- **User-Friendly Interface**: Intuitive design ensures easy navigation and interaction.
- **Real-Time Feedback**: Immediate responses to your answers to keep you informed.
- **Responsive Design**: Optimized for desktops, tablets, and mobile devices.
- **Secure Authentication**: User login and registration to track progress and scores.

---
🛠️ Tech Stack

- **Frontend**: React.js, HTML5, CSS3, Zustand
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Containerization**: Docker, Docker Compose
- **Deployment**: Netlify (Frontend), Vercel (Backend)

---

## 🧪 Getting Started

### Prerequisites

- Node.js (v14 or above)
- Docker & Docker Compose
- MongoDB

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/HritamBrahmachari/BrainBuzz.git
   cd BrainBuzz
   ```

2. **Setup Environment Variables**

   Create a `.env` file in the `backend/` directory with the following content:

   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```

3. **Run with Docker Compose**

   ```bash
   docker-compose up --build
   ```

   This command will build and start both the frontend and backend services.

4. **Access the Application**

   Open your browser and navigate to `http://localhost:3000` to use BrainBuzz locally.

---

## 🧑‍💻 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---
