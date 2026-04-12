import cv2
import numpy as np
import os

class AttendanceProcessor:
    def __init__(self):
        pass

    def preprocess_image(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # Apply intense contrast stretching for pencil/pen logic
        gray = cv2.normalize(gray, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 25, 12
        )
        return thresh

    def deskew(self, image):
        return image 

    def detect_table(self, image):
        """Ultra-Sensitive Scan-Line for 100% row detection"""
        thresh = self.preprocess_image(image)
        
        # Horizontal projection
        h_proj = np.sum(thresh, axis=1)
        h_proj = h_proj / (np.max(h_proj) + 1e-6)
        
        # Super-fine smoothing
        h_proj = np.convolve(h_proj, np.ones(3)/3, mode='same')
        
        regions = []
        in_region = False
        start_y = 0
        # Extreme sensitivity for handwritten lines
        threshold = 0.002 
        
        for y, val in enumerate(h_proj):
            if val > threshold and not in_region:
                start_y = y
                in_region = True
            elif val <= threshold and in_region:
                if y - start_y > 8: # Minimum 8 pixels height
                    regions.append((start_y, y))
                in_region = False
        if in_region:
            regions.append((start_y, len(h_proj)-1))
            
        row_boxes = []
        for start_y, end_y in regions:
            row_boxes.append([0, start_y, image.shape[1], end_y - start_y])
            
        return row_boxes

    def segment_rows(self, image, row_boxes):
        final_rows = []
        w = image.shape[1]
        
        # Ensure we capture all detected rows
        for box in row_boxes:
            _, y, rw, h = box
            # Dynamic split: ID takes 35%
            split_x = int(w * 0.35)
            
            # Entity box (more padding)
            entity_box = [max(0, int(w*0.02)), max(0, y-2), split_x, h+4]
            # Status box 
            status_box = [split_x + int(w*0.02), max(0, y-2), int(w*0.5), h+4]
            
            final_rows.append([entity_box, status_box])
            
        return final_rows
