from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from ultralytics import YOLO
import uuid
import shutil
import os, time
from typing import List
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cargar modelo YOLOv8
model = YOLO("../../models/yolov8/11S_best.pt")

# Almacenamiento temporal de predicciones
PREDICTIONS = {}  # id: {"status": "pending"|"done", "result": [...]}
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class BBox(BaseModel):
    class_name: str
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float

@app.post("/prediction")
async def create_prediction(file: UploadFile = File(None), background_tasks: BackgroundTasks = None):
    if file is None:
        return JSONResponse(status_code=200, content={"error": "No image file provided."})

    # Generar ID único
    prediction_id = str(uuid.uuid4())
    PREDICTIONS[prediction_id] = {"status": "pending", "result": None}

    # Guardar archivo
    file_path = os.path.join(UPLOAD_DIR, f"{prediction_id}.jpg")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Lanzar tarea en segundo plano
    background_tasks.add_task(run_inference, prediction_id, file_path)

    return {"prediction_id": prediction_id}

def run_inference(prediction_id: str, file_path: str):
    results = model(file_path)[0]
    bboxes = []
    for box in results.boxes:
        x1, y1, x2, y2 = map(float, box.xyxy[0])
        conf = float(box.conf[0])
        cls = int(box.cls[0])
        class_name = model.names[cls]
        bboxes.append(BBox(
            class_name=class_name,
            confidence=conf,
            x1=x1, y1=y1, x2=x2, y2=y2
        ).model_dump())
    PREDICTIONS[prediction_id] = {"status": "done", "result": bboxes}

@app.get("/prediction/{prediction_id}")
async def get_prediction(prediction_id: str):
    prediction = PREDICTIONS.get(prediction_id)
    if not prediction:
        return JSONResponse(status_code=404, content={"error": "Prediction ID not found."})
    if prediction["status"] == "pending":
        return {"status": "pending"}
    return {"status": "done", "bboxes": prediction["result"]}
