import json
import os
import uuid

CONVERSATIONS_FILE = "data/conversations.json"

def _load():
    if os.path.exists(CONVERSATIONS_FILE):
        with open(CONVERSATIONS_FILE, "r") as f:
            return json.load(f)
    return {}

def _save(data):
    os.makedirs("data", exist_ok=True)
    with open(CONVERSATIONS_FILE, "w") as f:
        json.dump(data, f, indent=2)

def create_session():
    session_id = str(uuid.uuid4())
    data = _load()
    data[session_id] = []
    _save(data)
    return session_id

def add_message(session_id, question, answer):
    data = _load()
    if session_id not in data:
        data[session_id] = []
    data[session_id].append({
        "question": question,
        "answer": answer
    })
    _save(data)

def get_history(session_id):
    data = _load()
    return data.get(session_id, [])

def delete_session(session_id):
    data = _load()
    if session_id in data:
        del data[session_id]
        _save(data)