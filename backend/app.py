import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from rag_pipeline import retrieve, generate_answer

load_dotenv(override=True)

app = FastAPI(title="Swiggy Annual Report AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

class Source(BaseModel):
    page: int
    content: str
    score: float

class AnswerResponse(BaseModel):
    answer: str
    sources: list[Source]

# Threshold for SentenceTransformers L2 Distance (lower is better, typically 0 to 2)
# Distance > 1.5 usually implies low semantic similarity.
SIMILARITY_THRESHOLD = 1.5

@app.post("/ask", response_model=AnswerResponse)
def ask_question(req: QuestionRequest):
    try:
        index_path = os.path.join(os.path.dirname(__file__), "faiss_index.index")
        meta_path = os.path.join(os.path.dirname(__file__), "metadata.pkl")
        
        chunks = retrieve(req.question, top_k=5, index_path=index_path, meta_path=meta_path)
        
        if not chunks or chunks[0]['score'] > SIMILARITY_THRESHOLD:
            return AnswerResponse(
                answer="Insufficient information found in the Swiggy Annual Report.",
                sources=[]
            )
            
        answer = generate_answer(req.question, chunks)
        
        sources = [
            Source(page=c['page'], content=c['content'], score=c['score']) 
            for c in chunks
        ]
        
        return AnswerResponse(
            answer=answer,
            sources=sources
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rebuild-index")
def rebuild_index():
    from ingest import process_pdf
    from rag_pipeline import build_index
    try:
        pdf_path = os.path.join(os.path.dirname(__file__), "data", "swiggy_annual_report.pdf")
        index_path = os.path.join(os.path.dirname(__file__), "faiss_index.index")
        meta_path = os.path.join(os.path.dirname(__file__), "metadata.pkl")
        
        chunks = process_pdf(pdf_path)
        if not chunks:
            raise HTTPException(status_code=404, detail="PDF file not found in data directory.")
            
        build_index(chunks, index_path, meta_path)
        return {"status": "success", "message": f"Successfully built index with {len(chunks)} chunks."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
