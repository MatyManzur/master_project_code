from __future__ import annotations
import typing as t
from pathlib import Path
from bentoml.validators import ContentType
import os
os.environ["KERAS_BACKEND"] = "jax"
from keras.preprocessing import image as keras_preprocessing_image
from keras.applications import efficientnet

import numpy as np
from PIL import Image

INPUT_SIZE = (380, 380)

ImageType = t.Annotated[Path, ContentType("image/*")]

def pre_preprocess_image(img):
    """Format the image to a square to the EfficientNet input size."""
    original_size = img.size
    max_side = max(original_size)
    new_img = Image.new("RGB", (max_side, max_side), (0, 0, 0))
    paste_position = (
        (max_side - original_size[0]) // 2,
        (max_side - original_size[1]) // 2
    )
    new_img.paste(img, paste_position)
    new_img = new_img.resize(INPUT_SIZE, Image.LANCZOS)
    return new_img

def preprocess_image(img):
    """Preprocess the image for EfficientNet."""
    new_img = pre_preprocess_image(img)
    img_array = keras_preprocessing_image.img_to_array(new_img)
    img_array = efficientnet.preprocess_input(img_array)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

