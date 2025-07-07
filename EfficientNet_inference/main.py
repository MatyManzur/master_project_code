from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image
import numpy as np
import uuid
import shutil
import os
import time

INPUT_SIZE = (380, 380) # EfficientNet B4 input size
#INPUT_SIZE = (224, 224)  # EfficientNet B0 input size

# Initialize FastAPI app
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the TensorFlow model
model = load_model('../../models/efficient_net/FTcS24D108B32L5e6T7b+.keras')
#model = load_model('../../models/efficient_net/FTB32L1e5T7a+.keras')

def get_label(prediction):
    return "OK" if prediction > 0.5 else "Not OK" 

# Setup storage
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
PREDICTIONS = {}  # prediction_id -> {status, result}

# Prediction output schema
class PredictionResult(BaseModel):
    prediction: float
    label: str

def prepreprocess_image(img):
    original_size = img.size
    max_side = max(original_size)
    new_img = Image.new("RGB", (max_side, max_side), (0, 0, 0))  # black edges
    paste_position = (
        (max_side - original_size[0]) // 2,
        (max_side - original_size[1]) // 2
    )
    new_img.paste(img, paste_position)
    new_img = new_img.resize(INPUT_SIZE, Image.LANCZOS)
    new_img.save("debug_padded_image.jpg")
    return new_img

# Preprocess image for EfficientNet
def preprocess_image(img_path):
    img = image.load_img(img_path)
    new_img = prepreprocess_image(img)
    #new_img = img.resize(INPUT_SIZE, Image.LANCZOS)
    img_array = image.img_to_array(new_img)
    img_array = tf.keras.applications.efficientnet.preprocess_input(img_array)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@app.post("/prediction")
async def create_prediction(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    prediction_id = str(uuid.uuid4())
    PREDICTIONS[prediction_id] = {"status": "pending", "result": None}

    file_path = os.path.join(UPLOAD_DIR, f"{prediction_id}.jpg")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    background_tasks.add_task(run_inference, prediction_id, file_path)

    return {"prediction_id": prediction_id}

def run_inference(prediction_id: str, file_path: str):
    try:
        img = preprocess_image(file_path)
        prediction = model.predict(img)
        PREDICTIONS[prediction_id] = {
            "status": "done",
            "result": PredictionResult(prediction=prediction, label=get_label(prediction)).model_dump()
        }
    except Exception as e:
        PREDICTIONS[prediction_id] = {"status": "error", "result": str(e)}

@app.get("/prediction/{prediction_id}")
async def get_prediction(prediction_id: str):
    prediction = PREDICTIONS.get(prediction_id)
    if not prediction:
        return JSONResponse(status_code=404, content={"error": "Prediction ID not found."})
    return prediction
