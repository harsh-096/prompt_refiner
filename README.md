# 🚀 Multi-Modal Prompt Refinement System

### A Dual-Agent AI Architecture for High-Fidelity Technical Specifications

## 📖 Project Overview

This system is designed to solve the problem of **ambiguous user requirements**. It accepts multi-modal inputs (Text, PDF, Word Docs, Images) and transforms them into a standardized, executable **Technical Prompt** using a sophisticated **"Critic-Refiner" AI Architecture**.

Unlike standard wrappers that use a single AI model, this project employs a **Multi-Agent Debate System** to ensure accuracy, eliminate hallucinations, and enforce strict output formatting.

---

## 🧠 The Architecture (Unique Approach)

I implemented a two-step pipeline to separate **Context Gathering** from **Logical Refinement**.

### 1. Agent A: The Observer (Google Gemini)
* **Role:** The "Eyes" and Context Gatherer.
* **Why Chosen:**
    * **Multimodal Native:** It is the only free-tier model capable of analyzing images (architecture diagrams) and parsing large PDF/Word documents simultaneously.
    * **Rate Limit Optimization:** The system auto-detects the `Flash` variant to ensure high throughput (15 RPM) vs strict Pro limits.

### 2. Agent B: The Architect (Llama via Groq)
* **Role:** The "Brain" and Strict Enforcer.
* **Why Chosen:**
    * **Instruction Following:** Llama 3 (8b) is exceptionally good at following negative constraints (e.g., "Do not use conversational filler").
    * **Speed:** Running on Groq's LPU (Language Processing Unit), it provides near-instant logical refinement.
    * **Sanitization:** It takes the raw draft from Gemini and strips away "fluff," outputting *only* the requested technical template.

---

## ✨ Key Features

* **📷 Multi-Modal Input:** Drag & drop support for Images (`.png`, `.jpg`), PDFs (`.pdf`), and Word Documents (`.docx`).
* **📝 Strict Templating:** Automatically enforces a 5-part technical specification format (Intent, Requirements, Constraints, Deliverables, Final Prompt).
* **🧹 "Guillotine" Cleaning:** A custom Regex-based backend process that strictly removes conversational AI filler (e.g., "Here is your prompt...") before the response reaches the frontend.
* **🛡️ Secure Architecture:** API keys are managed via environment variables (`.env`), ensuring no sensitive data is hardcoded.
* **⚡ Reactive UI:** Fast, responsive frontend built with Vite and React.

---

## 🛠️ Tech Stack

* **Frontend:** React.js, Vite, CSS3 (Mobile Responsive)
* **Backend:** Python 3.10+, FastAPI, Uvicorn
* **AI Integration:** `google-generativeai`, `groq`
* **Document Processing:** `pypdf` (PDFs), `python-docx` (Word), `pillow` (Images)

---

## ⚙️ Installation & Setup Guide

Follow these steps to run the project locally.

### Prerequisites
* Node.js & npm installed.
* Python 3.10+ installed.
* API Keys for **Google Gemini** and **Groq**.

Step 1: Clone the Repository

    git clone [https://github.com/harsh-096/prompt_refiner.git](https://github.com/harsh-096/prompt_refiner.git)
    cd prompt_refiner
Step 2: Backend Setup
Navigate to the backend folder:

    cd backend
Install the required Python libraries:

    pip install fastapi uvicorn google-generativeai groq pypdf python-docx pillow python-dotenv python-multipart
Security Setup: Create a .env file in the backend folder:

    # Windows
    type nul > .env
    # Mac/Linux
    touch .env
Open the .env file and add your keys:

Code snippet

    GOOGLE_API_KEY=your_actual_google_key_here
    GROQ_API_KEY=your_actual_groq_key_here
Start the Backend Server:

    python -m uvicorn main:app --reload
You should see: --- 🚀 LOCKED ON MODEL: models/gemini-model ---

Step 3: Frontend Setup
Open a new terminal and navigate to the frontend folder:

    cd frontend
Install dependencies:

    npm install
Start the Frontend:

    npm run dev
Open your browser at the URL shown (usually http://localhost:5173).

📂 Project Structure

    /prompt_refiner
    ├── /backend
    │   ├── main.py           # Core Logic (FastAPI + AI Pipeline)
    │   ├── .env              # API Keys (Not uploaded to GitHub)
    │   └── requirements.txt  # Python Dependencies
    ├── /frontend
    │   ├── src/
    │   │   ├── App.jsx       # Main React Component
    │   │   └── App.css       # Styling
    │   └── package.json
    └── README.md             # Documentation

---

🧪 How to Test (Sample Workflow)
Select Input: Type "I need a chatbot for Gujarat students."

Attach Context: Upload a PDF of the Gujarat Education Board syllabus or an image of a classroom.

Run: Click "Generate Perfect Prompt."

Observe:

The system sends data to Gemini to "see" the files.

Gemini drafts a rough idea.

Llama 3 critiques it, removes the "Sure! I can help," and formats it into the strict template.

Result: The final output appears in the right-hand panel, ready to copy.

---

### 🔒 Security Note
This repository utilizes a .gitignore file to ensure that the .env file containing API keys is never uploaded to the public repository.
