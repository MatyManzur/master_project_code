# pipeline-server/pipeline_service/detection_utils.py
import numpy as np
from PIL import Image
import cv2

def letterbox(im: np.ndarray, new_shape=(640, 640), color=(114,114,114)):
    """Format image to YOLOv11 letterboxed input size."""
    h0, w0 = im.shape[:2]
    nh, nw = new_shape
    r = min(nh / h0, nw / w0)
    new_unpad = (int(round(w0 * r)), int(round(h0 * r)))
    resized = cv2.resize(im, new_unpad, interpolation=cv2.INTER_LINEAR)
    pad_w = nw - new_unpad[0]
    pad_h = nh - new_unpad[1]
    pad_left = pad_w // 2
    pad_top = pad_h // 2
    out = np.full((nh, nw, 3), color, dtype=im.dtype)
    out[pad_top:pad_top+new_unpad[1], pad_left:pad_left+new_unpad[0]] = resized
    return out, r, pad_top, pad_left

def preprocess(img: Image.Image, size=640):
    """Preprocess the image for YOLOv11."""
    img = img.convert("RGB")
    orig_w, orig_h = img.size
    im = np.asarray(img)
    letterboxed_image, r, pad_top, pad_left = letterbox(im, new_shape=(size, size))
    arr = letterboxed_image.astype(np.float32) / 255.0 # Normalize to [0, 1]
    arr = arr.transpose(2,0,1)[None, ...]  # convert HxWxC to 1xCxHxW
    return arr, orig_w, orig_h, r, pad_top, pad_left

def unletterbox(x1, y1, x2, y2, r, pad_top, pad_left, orig_w, orig_h):
    """Convert box coordinates from letterboxed image to original image size."""
    x1p = (x1 - pad_left) / r
    y1p = (y1 - pad_top) / r
    x2p = (x2 - pad_left) / r
    y2p = (y2 - pad_top) / r

    x1o = max(min(x1p, orig_w), 0)
    y1o = max(min(y1p, orig_h), 0)
    x2o = max(min(x2p, orig_w), 0)
    y2o = max(min(y2p, orig_h), 0)
    return x1o, y1o, x2o, y2o