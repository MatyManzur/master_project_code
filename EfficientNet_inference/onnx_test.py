from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image
import tensorflow as tf
import numpy as np
import onnxruntime as ort

INPUT_SIZE = (380, 380)

keras_model = load_model('./models/FTcS24D108B32L5e6T7b+.keras')
session = ort.InferenceSession("./models/efficientnet_model.onnx")

input_name = session.get_inputs()[0].name
input_shape = session.get_inputs()[0].shape
input_type = session.get_inputs()[0].type
print(f"Entrada: {input_name}, forma: {input_shape}, tipo: {input_type}")

dummy_input = np.random.rand(1, 380, 380, 3).astype(np.float32) 
outputs = session.run(None, {input_name: dummy_input})
pred_keras = keras_model.predict(dummy_input)
print("Predicción Keras:", pred_keras[0])
print("Predicción ONNX:", outputs[0])
print("Diferencia:", np.abs(pred_keras[0] - outputs[0]).max())
