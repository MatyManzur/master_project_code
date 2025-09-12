from __future__ import annotations

import typing as t
from pathlib import Path
import onnxruntime as ort
import bentoml
from bentoml.validators import ContentType
import numpy as np
from PIL import Image
import cv2


YOLO_MODEL = '../../models/detector.onnx'

ImageType = t.Annotated[Path, ContentType("image/*")]

image = bentoml.images.Image(python_version='3.11', lock_python_packages=False) \
    .system_packages('libglib2.0-0', 'libsm6', 'libxext6', 'libxrender1', 'libgl1-mesa-glx') \
    .requirements_file('requirements.txt')

def letterbox(im: np.ndarray, new_shape=(640, 640), color=(114,114,114)):
    h0, w0 = im.shape[:2]
    nh, nw = new_shape
    r = min(nh / h0, nw / w0)
    new_unpad = (int(round(w0 * r)), int(round(h0 * r)))
    resized = cv2.resize(im, new_unpad, interpolation=cv2.INTER_LINEAR)
    # compute padding
    pad_w = nw - new_unpad[0]
    pad_h = nh - new_unpad[1]
    pad_left = pad_w // 2
    pad_top = pad_h // 2
    # make padded image
    out = np.full((nh, nw, 3), color, dtype=im.dtype)
    out[pad_top:pad_top+new_unpad[1], pad_left:pad_left+new_unpad[0]] = resized
    return out, r, pad_top, pad_left

def preprocess(img: Image.Image, size=640):
    img = img.convert("RGB")
    orig_w, orig_h = img.size
    im = np.asarray(img)  # HxWx3 RGB
    im_lb, r, pad_top, pad_left = letterbox(im, new_shape=(size, size))
    arr = im_lb.astype(np.float32) / 255.0
    arr = arr.transpose(2,0,1)[None, ...]  # 1x3xHxW
    return arr, orig_w, orig_h, r, pad_top, pad_left

def transform_coordinates(x1, y1, x2, y2, r, pad_top, pad_left, orig_w, orig_h):
    x1p = (x1 - pad_left) / r
    y1p = (y1 - pad_top) / r
    x2p = (x2 - pad_left) / r
    y2p = (y2 - pad_top) / r

    x1o = max(min(x1p, orig_w), 0)
    y1o = max(min(y1p, orig_h), 0)
    x2o = max(min(x2p, orig_w), 0)
    y2o = max(min(y2p, orig_h), 0)
    return x1o, y1o, x2o, y2o

@bentoml.service(image=image)
class DetectionService:
    def __init__(self):
        self.session = ort.InferenceSession(YOLO_MODEL)

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
            
            x1o, y1o, x2o, y2o = transform_coordinates(x1, y1, x2, y2, r, pad_top, pad_left, orig_w, orig_h)
            
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