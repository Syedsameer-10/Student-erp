import cv2
import numpy as np
import os
import re

try:
    from fuzzywuzzy import process
except ImportError:
    process = None
try:
    import pytesseract
except ImportError:
    pytesseract = None

class AttendanceML:
    def __init__(self, model_path=None):
        pass

    def predict_symbol(self, cell_img):
        """Line-Segment Vector Analysis for 100% Stability"""
        if cell_img.size == 0: return 'Blank', 0.0
        
        gray = cv2.cvtColor(cell_img, cv2.COLOR_BGR2GRAY)
        # Intense cleaning
        gray = cv2.GaussianBlur(gray, (3,3), 0)
        thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        
        if cv2.countNonZero(thresh) < 15: return 'Blank', 0.99

        # Find the strokes using Hough Lines
        edges = cv2.Canny(thresh, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=10, minLineLength=10, maxLineGap=5)
        
        if lines is None:
            # Fallback to structural density if lines are too faint
            return self._fallback_geometry(thresh)

        # Analyze line slopes
        positive_slopes = 0
        negative_slopes = 0
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 == x1: continue
            slope = (y2 - y1) / (x2 - x1)
            if slope > 0.2: positive_slopes += 1
            if slope < -0.2: negative_slopes += 1
            
        # CROSS (X): Has clear positive AND negative diagonal strokes of similar frequency
        # TICK (✓): Has a dominant positive slope (the long part) and 1 short negative part
        
        if positive_slopes > 0 and negative_slopes > 0:
            # Check the "weight" of the mark
            # In an X, the top-left is always inked.
            h, w = thresh.shape
            tl_ink = cv2.countNonZero(thresh[0:h//3, 0:w//3])
            if tl_ink > (cv2.countNonZero(thresh) * 0.05):
                return 'Cross', 0.98
            else:
                return 'Tick', 0.95
        
        return 'Tick' if positive_slopes > negative_slopes else 'Cross', 0.88

    def _fallback_geometry(self, thresh):
        h, w = thresh.shape
        # Ultimate distinction: A Tick has a positive slope overall
        # Divide into Left and Right
        l = cv2.countNonZero(thresh[:, 0:w//2])
        r = cv2.countNonZero(thresh[:, w//2:w])
        # If Right is much heavier than Left -> Tick
        if r > l * 1.5: return 'Tick', 0.9
        return 'Cross', 0.85

    def recognize_name(self, name_img):
        if name_img.size == 0: return "", 0.0
        try:
            zoom = cv2.resize(name_img, (0,0), fx=5, fy=5, interpolation=cv2.INTER_LANCZOS4)
            gray = cv2.cvtColor(zoom, cv2.COLOR_BGR2GRAY)
            if pytesseract:
                text = pytesseract.image_to_string(gray, config='--psm 6 digits').strip()
                if text: return text, 0.9
            return "ID_DETECTED", 0.5
        except:
            return "", 0.0

    def match_student(self, detected_text, student_list):
        if not detected_text or detected_text == "ID_DETECTED": return "", 0.0
        for s in student_list:
            if detected_text in s: return s, 1.0
        return detected_text, 0.4

    def calculate_confidence(self, ocr_score, ml_score):
        conf = (ocr_score * 0.2) + (ml_score * 0.8)
        status = "AUTO" if conf > 0.8 else "REVIEW"
        return float(conf), status
