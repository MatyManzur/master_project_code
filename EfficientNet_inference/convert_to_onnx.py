import tensorflow as tf
from tensorflow.keras.models import load_model, Model
from tensorflow.keras.layers import Input
import tf2onnx

MODEL_PATH = './models/FTcS24D108B32L5e6T7b+.keras'
ONNX_OUTPUT_PATH = 'efficientnet_model.onnx'

model = load_model(MODEL_PATH, safe_mode=False)
print(model.summary())
for layer in model.layers:
    print(layer.name)
model.output_names = ['fc_out']
input_signature = [tf.TensorSpec(model.inputs[0].shape, model.inputs[0].dtype, name='digit')]
onnx_model, _ = tf2onnx.convert.from_keras(model, input_signature, opset=13, output_path=ONNX_OUTPUT_PATH)
