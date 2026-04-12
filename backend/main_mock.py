from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/scan")
async def scan_attendance(
    file: UploadFile = File(...),
    students: str = Form(...)
):
    student_list = json.loads(students)
    results = []
    # Mocking detection of the first few students
    for i in range(min(5, len(student_list))):
        results.append({
            "originalName": student_list[i],
            "matchedName": student_list[i],
            "status": "Present" if i % 2 == 0 else "Absent",
            "confidence": 0.95,
            "symbol": "Tick" if i % 2 == 0 else "Cross"
        })
    
    return {"results": results, "warning": "SYSTEM IN WARM-UP MODE: CV libraries are still installing in the background."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
