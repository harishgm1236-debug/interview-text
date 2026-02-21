# 📝 AI Text-Based Interview Platform

A streamlined, high-performance platform for **Technical Interviews**. This system allows users to practice coding and behavioral interviews by typing detailed answers. It features an advanced **NLP scoring engine** and **anti-cheating proctoring**.

## 🚀 Features

- **🤖 AI-Driven Interviews:** Questions generated based on role (Frontend, Backend, etc.).
- **📝 Text-Based Evaluation:** Instant feedback on technical accuracy and communication.
- **📊 Detailed Analytics:** Skill breakdown graphs, progress tracking, and PDF reports.
- **🛡️ Smart Proctoring:** Detects tab switching and alerts the user to maintain integrity.
- **⚡ Admin Panel:** Dashboard to monitor user activity and view stats.

---

## 🧠 AI & Evaluation Logic

The core of this project is the **Python AI Service** (`evaluator.py`), which uses Natural Language Processing (NLP) to grade answers objectively.

### 1. NLP Relevance Scoring (TF-IDF & Cosine Similarity)
*   **Vectorization:** We use `TfidfVectorizer` from Scikit-Learn to convert both the **Student's Answer** and the **Model Answer** into numerical vectors.
*   **Similarity:** We calculate the **Cosine Similarity** between these two vectors.
    *   `Score = 1.0` (Perfect Match)
    *   `Score = 0.0` (Completely Irrelevant)
*   **Why?** This ensures the candidate captures the *meaning* of the answer, not just exact words.

### 2. Keyword Completeness
*   Every question in the `Question Bank` has a list of required **Keywords** (e.g., for React: "components", "hooks", "virtual DOM").
*   We use Regex to check how many keywords are present in the candidate's answer.
*   **Formula:** `(Matched Keywords / Total Keywords) * 100`

### 3. Sentiment & Confidence
*   We use **TextBlob** to analyze the sentiment polarity (-1 to +1).
*   We check for **Confidence Indicators** (e.g., "definitely", "proven") vs. **Hesitation Words** (e.g., "maybe", "I guess").

### 4. Final Scoring Algorithm
The final score is a weighted average of multiple metrics:
```python
Overall Score = (Relevance * 0.40) + 
                (Completeness * 0.35) + 
                (Clarity * 0.15) + 
                (Confidence * 0.10)
🛠️ Tech Stack
Frontend
Next.js 14 (App Router)
TypeScript & Tailwind CSS
Framer Motion (Animations)
Recharts (Analytics)
Backend
Node.js + Express
MongoDB Atlas (Data Persistence)
JWT (Secure Authentication)
AI Engine (Python)
FastAPI (High-performance API)
Scikit-Learn (TF-IDF & Cosine Similarity)
TextBlob (Sentiment Analysis)
⚙️ Installation & Setup
1. Clone the Repository
Bash

git clone https://github.com/harishgm1236-debug/text-interview-ai.git
cd text-interview-ai
2. Setup AI Service (Python)
Bash

cd AI-INTERVIEW-AI
python -m venv venv
# Windows: venv\Scripts\activate  |  Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
3. Setup Backend (Node.js)
Open a new terminal:

Bash

cd ../BACKEND
npm install
# Create .env file with MONGO_URI and JWT_SECRET
npm run seed  # (Optional: Creates Admin User)
npm run dev   # Runs on Port 5000
4. Setup Frontend (Next.js)
Open a new terminal:

Bash

cd ../FRONTEND
npm install
npm run dev   # Runs on Port 3000
🔑 Default Credentials
If you ran the seed script, use these to login:

Role	Email	Password
Admin	admin@interviewai.com	admin123456
User	test@interviewai.com	test123456
📂 Project Structure
text

├── FRONTEND/          # Next.js UI (Dashboard, Interview, Reports)
├── BACKEND/           # Express API (Auth, DB Connections)
├── AI-INTERVIEW-AI/   # Python NLP Engine (Scoring Logic)
└── README.md          # Documentation
👨‍💻 Developed By
Harish G M - Full Stack Developer & AI Enthusiast.

Built for the Future of Recruitment. 🚀