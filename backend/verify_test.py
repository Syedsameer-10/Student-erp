import requests
import json

def test_backend():
    url = "http://localhost:8000/scan"
    img_path = "C:/Users/Vijayakumar/.gemini/antigravity/brain/c1437df0-75d7-4ee5-81b0-8b83933e259d/uploaded_image_1_1775889195914.jpg"
    
    # Mock student list as provided by frontend
    students = ["101 ARJUN", "102 PRIYA", "103 RAHUL", "104 SNEHA", "105 KARTHIK"]
    
    try:
        with open(img_path, 'rb') as f:
            files = {'file': f}
            data = {'students': json.dumps(students)}
            print(f"Sending request to {url}...")
            response = requests.post(url, files=files, data=data)
            
        if response.status_code == 200:
            result = response.json()
            print("\n--- SCAN RESULTS ---")
            print(f"Total Entities Found: {len(result['results'])}")
            for i, res in enumerate(result['results']):
                print(f"Row {i+1}: Name={res['matchedName']}, Status={res['status']}, Conf={res['confidence']:.2f}, Symbol={res['symbol']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Test Failed: {e}")

if __name__ == "__main__":
    test_backend()
