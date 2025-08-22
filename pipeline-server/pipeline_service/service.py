from classification_utils import preprocess_image
from detection_utils import preprocess, unletterbox
import typing as t
import onnxruntime as ort
from pathlib import Path
from bentoml.validators import ContentType
import bentoml
import asyncio
from PIL import Image
from dataclasses import dataclass

ImageType = t.Annotated[Path, ContentType("image/*")]

@bentoml.service()
class DetectionService:
    def __init__(self):
        model_ref = bentoml.onnx.get("detector:latest")
        self.session = ort.InferenceSession(model_ref.path_of("saved_model.onnx"))

    @bentoml.api(batchable=False)
    def predict(self, input: ImageType) -> list[dict]:
        input_name = self.session.get_inputs()[0].name
        img_array, orig_w, orig_h, r, pad_top, pad_left = preprocess(Image.open(input))
        outputs = self.session.run(None, {input_name: img_array})[0]
        results = []
        for det in outputs[0]:
            x1, y1, x2, y2, conf, cls_id = det
            if conf <= 0.0:
                continue
            x1o, y1o, x2o, y2o = unletterbox(x1, y1, x2, y2, r, pad_top, pad_left, orig_w, orig_h)
            results.append({
                "box": {
                    "x1": float(x1o),
                    "y1": float(y1o),
                    "x2": float(x2o),
                    "y2": float(y2o),
                },
                "confidence": float(conf)
            })
        return results
    
@bentoml.service()
class ClassificationService:
    def __init__(self):
        model_ref = bentoml.onnx.get("classifier:latest")
        self.session = ort.InferenceSession(model_ref.path_of("saved_model.onnx"))

    @bentoml.api(batchable=False)
    def predict(self, input: ImageType, crop=None) -> list[dict]:
        input_name = self.session.get_inputs()[0].name
        image = Image.open(input)
        if crop is not None:
            image = image.crop(crop)
        results = self.session.run(None, {input_name: preprocess_image(image)})
        return [dict(score=float(result[0][0])) for result in results]
    
@dataclass
class BBox:
    x1: float
    y1: float
    x2: float
    y2: float

@dataclass
class DetectionObject:
    box: BBox
    confidence: float

@dataclass
class DetectionResult:
    objects: list[DetectionObject]

def to_detection_result(results) -> DetectionResult:
    objects = [
        DetectionObject(
            box=BBox(
                x1=obj['box']['x1'],
                y1=obj['box']['y1'],
                x2=obj['box']['x2'],
                y2=obj['box']['y2']
            ),
            confidence=obj['confidence']
        )
        for obj in results
    ]
    return DetectionResult(objects=objects)

image = bentoml.images.Image(python_version='3.11', lock_python_packages=False) \
    .requirements_file('requirements.txt')
    
@bentoml.service(image=image)
class PipelineService:
    detection_service = bentoml.depends(DetectionService)
    classification_service = bentoml.depends(ClassificationService)

    async def classify_object(self, image: ImageType, object: DetectionObject) -> dict:
        classification_result = (await self.classification_service.to_async.predict(image, crop=(
            int(object.box.x1), int(object.box.y1), int(object.box.x2), int(object.box.y2)
        )))[0]
        confidence = object.confidence
        score = classification_result['score']
        return {
            "box": {
                "x1": int(object.box.x1),
                "y1": int(object.box.y1),
                "x2": int(object.box.x2),
                "y2": int(object.box.y2),
            },
            "confidence": float(confidence),
            "cls_score": float(score),
            "damaged_score": float(confidence * (1 - score)),
            "healthy_score": float(confidence * score)
        }

    @bentoml.api
    async def predict(self, image: ImageType) -> list[dict]:
        detection_results = to_detection_result((await self.detection_service.to_async.predict(image)))
        classification_results = await asyncio.gather(
            *[self.classify_object(image, obj) for obj in detection_results.objects]
        )
        return classification_results