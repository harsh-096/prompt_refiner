import os
import io
import time
import re
import uvicorn
import google.generativeai as genai
from groq import Groq
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from PIL import Image
from pypdf import PdfReader
from docx import Document
from dotenv import load_dotenv # <--- NEW IMPORT

# --- CONFIGURATION ---
# Load environment variables from the .env file
load_dotenv()

# Get keys from environment (Secure Way)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Safety Check: Stop server if keys are missing
if not GOOGLE_API_KEY or not GROQ_API_KEY:
    raise ValueError("❌ API Keys missing! Please create a .env file with GOOGLE_API_KEY and GROQ_API_KEY.")

genai.configure(api_key=GOOGLE_API_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. MODEL FINDER ---
def get_high_limit_model():
    try:
        models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        for m in models:
            if "gemini-1.5-flash" in m and "8b" not in m: return m
        for m in models:
            if "flash" in m.lower(): return m
        return models[0]
    except:
        return "models/gemini-1.5-flash"

ACTIVE_GEMINI_NAME = get_high_limit_model()
print(f"--- 🚀 LOCKED ON MODEL: {ACTIVE_GEMINI_NAME} ---")

def extract_text_from_pdf(file_bytes):
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or "" + "\n"
        return text
    except:
        return ""

def extract_text_from_docx(file_bytes):
    try:
        doc_file = io.BytesIO(file_bytes)
        doc = Document(doc_file)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except:
        return ""

# --- 2. CLEANER ---
def clean_ai_response(text):
    text = re.sub(r"^```.*?\n", "", text, flags=re.MULTILINE)
    text = re.sub(r"```$", "", text, flags=re.MULTILINE)
    match = re.search(r"^(#|\*\*|Project Title:|Role:)", text, re.MULTILINE)
    if match:
        return text[match.start():].strip()
    return text.strip()

# --- 3. GENERATE ---
def generate_with_retry(model, inputs, retries=3):
    for attempt in range(retries):
        try:
            return model.generate_content(inputs)
        except Exception as e:
            if "429" in str(e) or "Quota" in str(e):
                print(f"⚠️ Quota Hit! Waiting 30s... ({attempt+1}/{retries})")
                time.sleep(30)
                continue
            raise e
    raise Exception("Max retries exceeded.")

@app.post("/refine-prompt")
async def refine_prompt(
    user_prompt: str = Form(...),
    files: List[UploadFile] = File(None)
):
    print("--- ⚔️  STARTING STRICT PIPELINE ---")
    
    gemini_model = genai.GenerativeModel(ACTIVE_GEMINI_NAME)
    context_inputs = []
    text_context = "" 
    
    if files:
        print(f"📁 Processing {len(files)} file(s)...")
        for file in files:
            content = await file.read()
            filename = file.filename.lower()
            
            if filename.endswith(".pdf"):
                pdf_text = extract_text_from_pdf(content)
                text_context += f"\n[PDF: {file.filename}]\n{pdf_text[:8000]}"
                context_inputs.append(f"\n[PDF Content]\n{pdf_text[:8000]}")
            
            elif filename.endswith(".docx") or filename.endswith(".doc"):
                doc_text = extract_text_from_docx(content)
                text_context += f"\n[Word Doc: {file.filename}]\n{doc_text[:8000]}"
                context_inputs.append(f"\n[Doc Content]\n{doc_text[:8000]}")
            
            elif file.content_type.startswith("image/"):
                image = Image.open(io.BytesIO(content))
                context_inputs.append(image)
                text_context += f"\n[Image: {file.filename}]"

    print(f"🤖 Gemini ({ACTIVE_GEMINI_NAME}): Drafting...")
    
    gemini_prompt = f"""
    You are a backend process. 
    Analyze the User Request and Context.
    Draft a comprehensive prompt.
    User Request: {user_prompt}
    """
    
    try:
        inputs = [gemini_prompt] + context_inputs
        gemini_response = generate_with_retry(gemini_model, inputs)
        draft_prompt = gemini_response.text
        print("✅ Gemini Draft Complete.")
    except Exception as e:
        return {"error": f"Gemini Error: {str(e)}"}

    print("🦙 Llama 3: Optimizing (Strict Mode)...")
    
    llama_system = """
    You are a Technical Specification Architect.
    Your goal is to refine the user's input into a standardized Technical Prompt.
    
    STRICT OUTPUT FORMAT (Do not deviate):
    
    # 1. Core Product Intent
    [One sentence summary of what the user wants to build]
    
    # 2. Key Functional Requirements
    [Bulleted list of features and user actions]
    
    # 3. Technical Constraints
    [Tech stack, platform limits, or performance needs]
    
    # 4. Expected Deliverables
    [What exactly should be produced? Code, text, diagrams?]
    
    # 5. Refined LLM Prompt
    [The final, polished prompt to copy-paste]
    
    Start immediately with "# 1. Core Product Intent".
    """
    
    llama_user = f"""
    Refine this.
    User Intent: {user_prompt}
    Gemini Draft: {draft_prompt}
    Context: {text_context[:2000]} 
    """

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": llama_system},
                {"role": "user", "content": llama_user}
            ],
            model="llama3-8b-8192",
            temperature=0.1, 
        )
        final_result = chat_completion.choices[0].message.content
        clean_result = clean_ai_response(final_result)
        
        print("🏆 Llama 3 Optimization Complete.")
        return {"refined_prompt": clean_result}

    except Exception as e:
        print(f"Groq Error: {e}")
        return {"refined_prompt": clean_ai_response(draft_prompt)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)