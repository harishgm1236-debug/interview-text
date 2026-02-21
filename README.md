# 📝 AI Text-Based Interview Platform

A streamlined, high-performance platform for **Technical Interviews**. This system allows users to practice coding and behavioral interviews by typing detailed answers. It features an advanced **NLP scoring engine** and **anti-cheating proctoring**.

## 🚀 Key Features

### 1. 📝 Text-Based Evaluation Engine
- **Instant AI Feedback:** Answers are analyzed in real-time for:
  - **Relevance:** Uses Cosine Similarity & TF-IDF to compare against model answers.
  - **Clarity:** Checks sentence structure and vocabulary.
  - **Completeness:** Verifies if key technical keywords are present.
  - **Sentiment:** Analyzes confidence and tone.
- **Strict Grading:** Generates a percentage score (0-100%) and a Letter Grade (A-F).

### 2. 🛡️ Smart Proctoring
- **Tab-Switch Detection:** Monitors focus status and logs warnings if the candidate leaves the interview tab.
- **Timer Enforcement:** Auto-submits answers when the time limit expires.

### 3. 📊 Analytics & Reports
- **Detailed Dashboards:** Visual radar charts and bar graphs using `Recharts`.
- **PDF Export:** Download a complete performance report with one click.
- **Admin Panel:** Manage users and view platform-wide statistics.

---

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 14** (App Router)
- **TypeScript** & **Tailwind CSS**
- **Framer Motion** (Animations)
- **Recharts** (Data Visualization)

### **Backend**
- **Node.js** + **Express**
- **MongoDB Atlas** (Data Persistence)
- **JWT** (Secure Authentication)

### **AI Engine (Python)**
- **FastAPI** (High-performance API)
- **Scikit-Learn** (TF-IDF & Cosine Similarity)
- **TextBlob** (Sentiment Analysis)

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
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
├── AI-INTERVIEW-AI/   # Python NLP Engine (Scoring)
└── README.md          # Documentation
👨‍💻 Developed By
Harish G M - Full Stack Developer & AI Enthusiast.

Built for the Future of Recruitment. 🚀

