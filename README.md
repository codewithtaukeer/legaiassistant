# Legal AI Assistant ⚖️🇮🇳

An AI-powered Indian Legal Assistant built with FastAPI, React, and Ollama (Mistral). Features RAG (Retrieval Augmented Generation), landmark case laws, government procedures, multilingual support (Hindi, Hinglish, English), voice input, PDF upload, and an admin panel.

## Features

- ⚖️ IPC, Constitution, IT Act, CrPC and more
- 📋 30+ landmark Supreme Court case laws
- 🏛️ Government procedures (Aadhaar, Driving Licence, FIR, RTI, etc.)
- 📄 Upload your own legal PDFs
- 🎤 Voice input (Hindi + English)
- 🌐 Multilingual (Hindi, Hinglish, English)
- 👍👎 Feedback system
- 🛡️ Admin panel
- 🌙 Dark/Light theme

---

## Prerequisites

Before starting, install these:

| Tool         | Download                      |
| ------------ | ----------------------------- |
| Python 3.11+ | https://python.org/downloads  |
| Node.js 18+  | https://nodejs.org            |
| Ollama       | https://ollama.com/download   |
| Git          | https://git-scm.com/downloads |

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/legal-ai-assistant.git
cd legal-ai-assistant
```

---

## Step 2 — Download Mistral AI model

Make sure Ollama is installed first, then run:

```bash
ollama pull mistral
```

This downloads the Mistral model (~4GB). Wait for it to complete.

---

## Step 3 — Backend setup

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**Mac/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Step 4 — Create .env file

Create a file called `.env` in the root folder with this content:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@legal123
SECRET_KEY=supersecretkey123
```

---

## Step 5 — Create admin user

**Windows:**

```bash
venv\Scripts\activate
python -c "
from backend.database import SessionLocal, User
from backend.auth import hash_password
db = SessionLocal()
existing = db.query(User).filter(User.username == 'admin').first()
if not existing:
    admin = User(username='admin', email='admin@legalai.com', hashed_password=hash_password('admin@legal123'))
    db.add(admin)
    db.commit()
    print('Admin created!')
else:
    print('Admin already exists!')
db.close()
"
```

**Mac/Linux:**

```bash
source venv/bin/activate
python3 -c "
from backend.database import SessionLocal, User
from backend.auth import hash_password
db = SessionLocal()
existing = db.query(User).filter(User.username == 'admin').first()
if not existing:
    admin = User(username='admin', email='admin@legalai.com', hashed_password=hash_password('admin@legal123'))
    db.add(admin)
    db.commit()
    print('Admin created!')
else:
    print('Admin already exists!')
db.close()
"
```

---

## Step 6 — Frontend setup

```bash
cd frontend
npm install
cd ..
```

---

## Running the project

You need **3 terminals** open at the same time:

### Terminal 1 — Start Ollama

```bash
ollama serve
```

### Terminal 2 — Start Backend

**Windows:**

```bash
venv\Scripts\activate
uvicorn backend.main:app --reload
```

**Mac/Linux:**

```bash
source venv/bin/activate
uvicorn backend.main:app --reload
```

### Terminal 3 — Start Frontend

```bash
cd frontend
npm run dev
```

---

## Open in browser

Go to: **http://localhost:5173**

Default admin login:

- Username: `admin`
- Password: `admin@legal123`

---

## Project Structure

```
legal-ai-assistant/
├── backend/
│   ├── main.py              # FastAPI app, all endpoints
│   ├── auth.py              # JWT authentication
│   ├── database.py          # SQLite database models
│   └── routers/
│       ├── auth_router.py
│       ├── chat_router.py
│       └── admin_router.py
├── rag/
│   ├── generator.py         # Ollama/Mistral LLM
│   ├── retriever.py         # Legal sections search
│   ├── case_retriever.py    # Case law search
│   ├── procedure_retriever.py # Govt procedure search
│   ├── pdf_vector_store.py  # PDF indexing
│   ├── language_detector.py # Hindi/Hinglish detection
│   └── translator.py        # Translation
├── data/
│   ├── legal_sections.csv   # 80+ IPC/Constitution sections
│   ├── case_laws.csv        # 30+ landmark cases
│   └── govt_procedures.csv  # Government procedures
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Chat.jsx
│       │   ├── Admin.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   └── Landing.jsx
│       └── components/
│           └── ThemeToggle.jsx
└── uploads/                 # Uploaded PDFs stored here
```

---

## Troubleshooting

**Ollama connection error:**
Make sure `ollama serve` is running in Terminal 1 before starting the backend.

**Port already in use:**
Frontend may start on port 5174 instead of 5173 — that's fine, just open the URL shown in the terminal.

**Module not found errors:**
Make sure your venv is activated before running the backend.

**Admin login not working:**
Re-run the admin creation script from Step 5.
