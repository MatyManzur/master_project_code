from ultralytics import YOLO

model = YOLO("./models/11S_best.pt")


model.export(format="onnx", 
             simplify=True, nms=True,
             )