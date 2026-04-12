from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import io
import json

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/scan")
async def scan_attendance(
    file: UploadFile = File(...),
    students: str = Form(...) # JSON string of student names
):
    try:
        import cv2
        import numpy as np
        from processor import AttendanceProcessor
        from ml_logic import AttendanceML
        
        processor = AttendanceProcessor()
        ml_logic = AttendanceML()
    except ImportError:
        return {"results": [], "error": "Backend libraries are still installing. Please wait 1-2 minutes."}

    # 1. Load image
    # 1. Load image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 2. Preprocess & Deskew
    img = processor.deskew(img)
    
    # 3. Detect Table & Cells
    boxes = processor.detect_table(img)
    rows = processor.segment_rows(img, boxes)
    
    student_list = json.loads(students)
    results = []
    
    for row in rows:
        if len(row) < 2:
            continue
            
        # Assume Column 1: Name, Column 2: Status
        # Get bounding boxes
        name_box = row[0]
        status_box = row[1]
        
        # Crop images
        name_img = img[name_box[1]:name_box[1]+name_box[3], name_box[0]:name_box[0]+name_box[2]]
        status_img = img[status_box[1]:status_box[1]+status_box[3], status_box[0]:status_box[0]+status_box[2]]
        
        # Process Name
        detected_name = ml_logic.recognize_name(name_img)
        matched_name, name_score = ml_logic.fuzzy_match(detected_name, student_list)
        
        # Process Status
        symbol, symbol_confidence = ml_logic.predict_symbol(status_img)
        
        # Attendance Logic
        status_map = {
            'Tick': 'Present',
            'P': 'Present',
            'Cross': 'Absent',
            'A': 'Absent',
            'Blank': 'Absent',
            'Detected': 'Present' # Fallback
        }
        
        results.append({
            "originalName": detected_name,
            "matchedName": matched_name,
            "status": status_map.get(symbol, 'Absent'),
            "confidence": (name_score / 100.0 * 0.5) + (symbol_confidence * 0.5),
            "symbol": symbol
        })
        
    return {"results": results}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
