from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import numpy as np

app = Flask(__name__)
CORS(app)

@app.route('/')
def health():
    return jsonify({"status": "UP", "version": "3.4.0-Enterprise"})

@app.route('/scan', methods=['POST'])
def scan_attendance():
    """Section 3 & 21: Full Pipeline Flow"""
    try:
        from processor import AttendanceProcessor
        from ml_logic import AttendanceML
        import cv2
        
        processor = AttendanceProcessor()
        ml_logic = AttendanceML()

        # 1. Section 4: Image Handling
        file = request.files.get('file')
        students_raw = request.form.get('students', '[]')
        student_list = json.loads(students_raw)
        
        filestr = file.read()
        nparr = np.frombuffer(filestr, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # 2. Section 5: Preprocessing & Deskew
        img = processor.deskew(img)
        
        # 3. Section 6-8: Table & Row/Column Segmentation
        boxes = processor.detect_table(img)
        rows = processor.segment_rows(img, boxes)
        
        results = []
        for i, row in enumerate(rows):
            name_box, status_box = row
            
            # Crop cells
            name_img = img[name_box[1]:name_box[1]+name_box[3], name_box[0]:name_box[0]+name_box[2]]
            status_img = img[status_box[1]:status_box[1]+status_box[3], status_box[0]:status_box[0]+status_box[2]]
            
            # 4. Section 9: OCR Name / Roll
            detected_text, ocr_score = ml_logic.recognize_name(name_img)
            
            # 5. Section 12: Fuzzy Matching
            matched_name, match_score = ml_logic.match_student(detected_text, student_list)
            
            # 6. Section 10/11: Symbol Detection
            symbol, ml_score = ml_logic.predict_symbol(status_img)
            
            # 7. Section 14: Confidence Calculation
            confidence, logic_status = ml_logic.calculate_confidence(ocr_score, ml_score)
            
            # 8. Section 13: Decision Engine Rules
            attendance_status = "Present" if symbol in ['Tick', 'P', 'Detected'] else "Absent"
            
            results.append({
                "rowIndex": i,
                "originalName": detected_text,
                "matchedName": matched_name if matched_name else "Unidentified",
                "status": attendance_status,
                "confidence": confidence,
                "symbol": symbol,
                "mode": logic_status
            })
            
        return jsonify({"results": results})

    except ImportError as e:
        print(f"BOOT ERROR: {e}")
        return jsonify({
            "results": [], 
            "error": "Backend engines are still initializing (CV/ML source build). Please try again in 1 minute."
        })
    except Exception as e:
        print(f"PIPELINE CRASH: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"results": [], "error": str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, threaded=True) # Section 18 Optimization
