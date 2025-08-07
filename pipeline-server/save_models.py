import onnx
import bentoml

class_model = onnx.load('./models/classifier.onnx')
bentoml.onnx.save_model(
    name="classifier",
    model=class_model,
)

det_model = onnx.load('./models/detector.onnx')
bentoml.onnx.save_model(
    name="detector",
    model=det_model,
)
