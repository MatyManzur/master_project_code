import requests
import io
import os
import json
import tqdm
from models import APIResponse

def send_image_for_prediction(image_path) -> list[APIResponse]:
    with open(image_path, "rb") as f:
        image_data = f.read()
        files = {
            'image': ('image.jpg', io.BytesIO(image_data), 'image/jpeg')
        }
        prediction_url = os.environ.get('PREDICTION_URL', 'http://localhost:3000/predict')
        response = requests.post(
            prediction_url,
            files=files,
            timeout=30
        )
        if response.status_code != 200:
            raise Exception(f"Error: {response.status_code}, {response.text}")
        return [APIResponse.from_json(r, image=image_path) for r in response.json()]

def save_predictions_to_file(image_paths, output_path):
    all_results = []
    for image_path in tqdm.tqdm(image_paths):
        response = send_image_for_prediction(image_path)
        all_results.extend([r.to_dict() for r in response])
    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=4)
