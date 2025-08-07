from __future__ import annotations
import typing as t
from pathlib import Path
import bentoml
from bentoml.validators import ContentType

from tensorflow.keras.preprocessing import image as keras_preprocessing_image
import onnxruntime as ort
import tensorflow as tf
import numpy as np
from PIL import Image

YOLO_MODEL = './models/classifier.onnx'
INPUT_SIZE = (380, 380)

ImageType = t.Annotated[Path, ContentType("image/*")]

keras_image = bentoml.images.Image(python_version='3.11', lock_python_packages=False) \
    .requirements_file('requirements.txt')

def pre_preprocess_image(img):
    original_size = img.size
    max_side = max(original_size)
    new_img = Image.new("RGB", (max_side, max_side), (0, 0, 0))  # black edges
    paste_position = (
        (max_side - original_size[0]) // 2,
        (max_side - original_size[1]) // 2
    )
    new_img.paste(img, paste_position)
    new_img = new_img.resize(INPUT_SIZE, Image.LANCZOS)
    return new_img

def preprocess_image(img):
    new_img = pre_preprocess_image(img)
    img_array = keras_preprocessing_image.img_to_array(new_img)
    img_array = tf.keras.applications.efficientnet.preprocess_input(img_array)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@bentoml.service(image=keras_image)
class ClassificationService:
    def __init__(self):
        self.session = ort.InferenceSession(YOLO_MODEL)

    @bentoml.api(batchable=False)
    def predict(self, input: ImageType) -> list[dict]:
        input_name = self.session.get_inputs()[0].name
        results = self.session.run(None, {input_name: preprocess_image(Image.open(input))})
        return [dict(score=result[0][0]) for result in results]