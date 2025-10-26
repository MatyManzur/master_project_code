from typing import Optional

class BBox:
    def __init__(self, x1: int, y1: int, x2: int, y2: int):
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2

    def __str__(self):
        return f"{self.x1}|{self.y1}|{self.x2}|{self.y2}"
    
    def to_dict(self) -> dict:
        return {
            "x1": self.x1,
            "y1": self.y1,
            "x2": self.x2,
            "y2": self.y2
        }

class APIResponse:
    def __init__(
        self,
        image: str,
        bbox: BBox,
        confidence: str,
        cls_score: float,
        damaged_score: float,
        healthy_score: float
    ):
        self.image = image
        self.bbox = bbox
        self.confidence = confidence
        self.cls_score = cls_score
        self.damaged_score = damaged_score
        self.healthy_score = healthy_score

    @classmethod
    def from_json(cls, data: dict, image: str = None) -> 'APIResponse':
        bbox_data = data['box']
        bbox = BBox(
            x1=bbox_data['x1'],
            y1=bbox_data['y1'],
            x2=bbox_data['x2'],
            y2=bbox_data['y2']
        )
        return APIResponse(
            image=image if image is not None else data.get('image', ''),
            bbox=bbox,
            confidence=data.get('confidence', 0.0),
            cls_score=data.get('cls_score', 0.0),
            damaged_score=data.get('damaged_score', 0.0),
            healthy_score=data.get('healthy_score', 0.0)
        )
    
    def to_dict(self) -> dict:
        return {
            "image": self.image,
            "box": {
                "x1": self.bbox.x1,
                "y1": self.bbox.y1,
                "x2": self.bbox.x2,
                "y2": self.bbox.y2
            },
            "confidence": self.confidence,
            "cls_score": self.cls_score,
            "damaged_score": self.damaged_score,
            "healthy_score": self.healthy_score
        }

class ObjectPrediction:
    def __init__(
        self,
        image: str,
        actual: str,
        predicted_label: str,
        actual_bbox: Optional[BBox] = None,
        predicted_bbox: Optional[BBox] = None,
        score: float = 0.0,
        iou: float = 0.0,
        confidence: float = 0.0
    ):
        self.image = image
        self.actual_bbox = actual_bbox
        self.predicted_bbox = predicted_bbox
        self.predicted_label = predicted_label
        self.actual = actual
        self.score = score
        self.iou = iou
        self.confidence = confidence
    
    def to_dict(self) -> dict:
        return {
            "image": self.image,
            "actual": self.actual,
            "actual_bbox": {
                "x1": self.actual_bbox.x1,
                "y1": self.actual_bbox.y1,
                "x2": self.actual_bbox.x2,
                "y2": self.actual_bbox.y2
            } if self.actual_bbox else None,
            "predicted_bbox": {
                "x1": self.predicted_bbox.x1,
                "y1": self.predicted_bbox.y1,
                "x2": self.predicted_bbox.x2,
                "y2": self.predicted_bbox.y2
            } if self.predicted_bbox else None,
            "predicted_label": self.predicted_label,
            "score": self.score,
            "iou": self.iou,
            "confidence": self.confidence
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'ObjectPrediction':
        actual_bbox_data = data.get('actual_bbox')
        actual_bbox = BBox(
            x1=actual_bbox_data['x1'],
            y1=actual_bbox_data['y1'],
            x2=actual_bbox_data['x2'],
            y2=actual_bbox_data['y2']
        ) if actual_bbox_data else None

        predicted_bbox_data = data.get('predicted_bbox')
        predicted_bbox = BBox(
            x1=predicted_bbox_data['x1'],
            y1=predicted_bbox_data['y1'],
            x2=predicted_bbox_data['x2'],
            y2=predicted_bbox_data['y2']
        ) if predicted_bbox_data else None

        return ObjectPrediction(
            image=data.get('image', ''),
            actual=data.get('actual', ''),
            predicted_label=data.get('predicted_label', ''),
            actual_bbox=actual_bbox,
            predicted_bbox=predicted_bbox,
            score=data.get('score', 0.0),
            iou=data.get('iou', 0.0),
            confidence=data.get('confidence', 0.0)
        )