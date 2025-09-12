from __future__ import annotations

import json
import os
import typing as t
from pathlib import Path

import bentoml
from bentoml.validators import ContentType

YOLO_MODEL = '../../models/detector.pt'

Image = t.Annotated[Path, ContentType("image/*")]

image = bentoml.images.Image(python_version='3.11', lock_python_packages=False) \
    .system_packages('libglib2.0-0', 'libsm6', 'libxext6', 'libxrender1', 'libgl1-mesa-glx') \
    .requirements_file('requirements.txt')

@bentoml.service(image=image)
class DetectionService:
    def __init__(self):
        from ultralytics import YOLO

        self.model = YOLO(YOLO_MODEL)

    @bentoml.api(batchable=True)
    def predict(self, images: list[Image]) -> list[list[dict]]:
        results = self.model.predict(source=images)
        return [json.loads(result.to_json()) for result in results]

    @bentoml.api
    def render(self, image: Image) -> Image:
        result = self.model.predict(image)[0]
        output = image.parent.joinpath(f"{image.stem}_result{image.suffix}")
        result.save(str(output))
        return output