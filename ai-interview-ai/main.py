

import os
import io
import uuid
import json
import shutil
import random
import base64
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydub import AudioSegment
from pypdf import PdfReader

from question_bank import QUESTION_BANK
from evaluator import evaluate_multimodal, sanitize_for_json

app = FastAPI(
    title="AI Interview Evaluation Service",
    version="2.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSIONS_DIR = "saved_sessions"
TEMP_DIR = "temp_eval"

os.makedirs(SESSIONS_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

# -------------------------
# ROOT ROUTE
# -------------------------
@app.get("/")
async def root():
    return {
        "message": "AI Interview Service Running 🚀",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "AI Interview Engine"}

# -------------------------
# Models
# -------------------------
class StartRequest(BaseModel):
    domain: str
    level: Optional[str] = "all"

# -------------------------
# Helpers
# -------------------------
def save_session(session_id, data):
    path = os.path.join(SESSIONS_DIR, f"{session_id}.json")
    with open(path, "w") as f:
        json.dump(sanitize_for_json(data), f, indent=4)

def load_session(session_id):
    path = os.path.join(SESSIONS_DIR, f"{session_id.strip()}.json")
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return None

def check_ffmpeg():
    if not shutil.which("ffmpeg"):
        print("WARNING: FFmpeg not found on server path")

def save_uploaded_audio_as_wav(upload: UploadFile, audio_bytes: bytes) -> str:
    check_ffmpeg()
    wav_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.wav")
    try:
        fmt = "webm"
        if upload.filename.lower().endswith(".wav"): fmt = "wav"
        if upload.filename.lower().endswith(".mp3"): fmt = "mp3"
        
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt)
        audio = audio.set_channels(1).set_frame_rate(16000).set_sample_width(2)
        audio.export(wav_path, format="wav")
    except Exception as e:
        print(f"Audio conversion error: {e}")
        with open(wav_path, "wb") as f: f.write(audio_bytes)
            
    return wav_path

# -------------------------
# Start Interview
# -------------------------
@app.post("/interview/start")
async def start(req: StartRequest):
    session_id = str(uuid.uuid4())
    domain_key = req.domain.lower().replace(" ", "").replace("-", "")

    if domain_key not in QUESTION_BANK:
        domain_key = "backend"

    raw_rounds = QUESTION_BANK[domain_key]
    flattened_questions = []

    if req.level and req.level != "all":
        level_map = {"easy": "round_1_background", "medium": "round_2_domain", "hard": "round_3_project"}
        rk = level_map.get(req.level)
        if rk: flattened_questions = list(raw_rounds[rk])
        else:
            for r in raw_rounds: flattened_questions.extend(raw_rounds[r])
    else:
        for r in raw_rounds: flattened_questions.extend(raw_rounds[r])

    random.shuffle(flattened_questions)
    if req.level == "all": flattened_questions = flattened_questions[:10]

    session_data = {
        "session_id": session_id,
        "domain": domain_key,
        "level": req.level,
        "questions": flattened_questions,
        "scores": [],
        "total_questions": len(flattened_questions)
    }
    save_session(session_id, session_data)

    safe_q = [{"q": q["q"], "category": q.get("category", "technical")} for q in flattened_questions]

    return {
        "session_id": session_id,
        "domain": domain_key,
        "total_questions": len(flattened_questions),
        "questions": safe_q
    }

# -------------------------
# Resume Start
# -------------------------
@app.post("/interview/resume/start")
async def start_resume(file: UploadFile = File(...)):
    session_id = str(uuid.uuid4())
    pdf_path = os.path.join(TEMP_DIR, f"{session_id}.pdf")
    content = await file.read()
    with open(pdf_path, "wb") as f: f.write(content)

    try:
        reader = PdfReader(pdf_path)
        text = "".join([p.extract_text() for p in reader.pages]).lower()
    except: text = ""

    questions = []
    keywords = {
        "react": "frontend", "node": "backend", "python": "datascience", 
        "aws": "devops", "sql": "backend", "docker": "devops"
    }
    found = set()
    for k, v in keywords.items():
        if k in text: found.add(v)
    
    if not found: found.add("fullstack")

    for d in found:
        if d in QUESTION_BANK:
            rounds = QUESTION_BANK[d].get("round_2_domain", [])
            if rounds: questions.extend(random.sample(rounds, min(2, len(rounds))))

    questions.append({
        "q": "Based on your resume, describe a challenging project.",
        "category": "behavioral", "weight": 1.0
    })

    session_data = {
        "session_id": session_id,
        "domain": "resume",
        "level": "custom",
        "questions": questions,
        "scores": [],
        "total_questions": len(questions)
    }
    save_session(session_id, session_data)
    if os.path.exists(pdf_path): os.remove(pdf_path)

    return {"session_id": session_id, "total_questions": len(questions)}

# -------------------------
# Evaluate (UPDATED for TEXT MODE)
# -------------------------
@app.post("/interview/evaluate")
async def evaluate(
    session_id: str = Form(...),
    index: int = Form(...),
    answer_text: str = Form(""),
    image: UploadFile = File(None), # ✅ Optional
    audio: UploadFile = File(None)  # ✅ Optional
):
    session = load_session(session_id)
    if not session: raise HTTPException(404, "Session not found")

    q_data = session["questions"][int(index)]

    # Defaults
    img_path = ""
    audio_path = ""

    # ✅ Handle Image (If provided)
    if image:
        img_bytes = await image.read()
        if len(img_bytes) > 0:
            img_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.jpg")
            with open(img_path, "wb") as f: f.write(img_bytes)

    # ✅ Handle Audio (If provided)
    if audio:
        audio_bytes = await audio.read()
        if len(audio_bytes) > 100:
            audio_path = save_uploaded_audio_as_wav(audio, audio_bytes)

    try:
        # Run AI Evaluation
        eval_res = evaluate_multimodal(
            answer_text=answer_text,
            keywords=q_data.get("keywords", []),
            weight=q_data.get("weight", 1.0),
            image_path=img_path,
            audio_path=audio_path,
            model_answer=q_data.get("model_answer", "")
        )

        result = sanitize_for_json(eval_res)
        session["scores"].append(result)

        is_finished = int(index) >= len(session["questions"]) - 1
        final_summary = None

        if is_finished:
            total = sum(s["overall_marks"] for s in session["scores"])
            final_summary = {
                "total_marks": total,
                "percentage": (total / (len(session["questions"]) * 10)) * 100,
                "grade": "A" if total > 40 else "B"
            }
            session["final_result"] = final_summary

        save_session(session_id, session)

        return {
            "finished": is_finished,
            "current_score": result,
            "final_result": final_summary
        }

    finally:
        if img_path and os.path.exists(img_path): os.remove(img_path)
        if audio_path and os.path.exists(audio_path): os.remove(audio_path)

@app.get("/interview/session/{session_id}")
async def get_session(session_id: str):
    return load_session(session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)