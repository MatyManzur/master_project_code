import json, os
import cv2
import tqdm
from models import BBox, APIResponse, ObjectPrediction

IOU_THRESHOLD = 0.5
CONFIDENCE_THRESHOLD = 0.4

def compute_iou(boxA: BBox, boxB: BBox) -> float:
    xA = max(boxA.x1, boxB.x1)
    yA = max(boxA.y1, boxB.y1)
    xB = min(boxA.x2, boxB.x2)
    yB = min(boxA.y2, boxB.y2)

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (boxA.x2 - boxA.x1) * (boxA.y2 - boxA.y1)
    boxBArea = (boxB.x2 - boxB.x1) * (boxB.y2 - boxB.y1)

    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou

def load_gt_bboxes(label_path: str, image_shape: tuple, class_names=["damaged", "healthy"]) -> list[tuple[str, BBox]]:
    gt_bboxes = []
    with open(label_path, "r") as f:
        for line in f:
            class_id, cx, cy, w, h = map(float, line.strip().split())
            h_img, w_img = image_shape
            x_center = cx * w_img
            y_center = cy * h_img
            width = w * w_img
            height = h * h_img
            x1 = int(x_center - width / 2)
            y1 = int(y_center - height / 2)
            x2 = int(x_center + width / 2)
            y2 = int(y_center + height / 2)
            gt_bboxes.append((
                class_names[int(class_id)],
                BBox(x1, y1, x2, y2)
            ))
    return gt_bboxes

def process_predictions_of_image(image_path: str, predictions: list[APIResponse], gt_bboxes: list[tuple[str, BBox]]) -> list[ObjectPrediction]:
    predictions = sorted(predictions, key=lambda p: p.confidence, reverse=True)
    gt_bboxes_predicted = [False for _ in gt_bboxes]
    results: list[ObjectPrediction] = []
    for p in predictions:
        class_id = p.cls_score

        # Find the closest ground truth bbox for label
        best_iou = 0
        actual_label = "background"

        if p.healthy_score < CONFIDENCE_THRESHOLD and p.damaged_score < CONFIDENCE_THRESHOLD:
            predicted_label = "background"
        elif p.healthy_score > p.damaged_score:
            predicted_label = "healthy"
        else:
            predicted_label = "damaged"

        gt_idx = None
        for i, gt in enumerate(gt_bboxes):
            if gt_bboxes_predicted[i]: # dont repeat a gt_bbox
                continue
            iou = compute_iou(p.bbox, gt[1])
            if iou >= IOU_THRESHOLD and iou > best_iou:
                best_iou = iou
                actual_label = gt[0]
                gt_idx = i
        if gt_idx is not None:
            gt_bboxes_predicted[gt_idx] = True

        results.append(ObjectPrediction(
            image=p.image,
            actual=actual_label,
            actual_bbox=gt_bboxes[gt_idx][1] if gt_idx is not None else None,
            predicted_bbox=p.bbox,
            predicted_label=predicted_label,
            score=class_id,
            iou=best_iou,
            confidence=p.confidence
        ))
        
    for i, predicted in enumerate(gt_bboxes_predicted):
        if not predicted:
            results.append(ObjectPrediction(
                image=image_path,
                actual=gt_bboxes[i][0],
                actual_bbox=gt_bboxes[i][1],
                predicted_bbox=None,
                predicted_label="background",
                score=0,
                iou=0,
                confidence=0
            ))
    return results

def load_api_predictions_from_file(predictions_file: str) -> dict[str, list[APIResponse]]:
    with open(predictions_file, "r") as f:
        data = json.load(f)
        predictions_dict: dict[str, list[APIResponse]] = {}
        for item in data:
            image = item.get("image", "")
            if image not in predictions_dict:
                predictions_dict[image] = []
            predictions_dict[image].append(APIResponse.from_json(item))
        return predictions_dict
    
def save_processed_results_to_file(results: list[ObjectPrediction], output_path: str):
    with open(output_path, "w") as f:
        json.dump([r.to_dict() for r in results], f, indent=4)

def process_all_predictions(image_paths: list[str], predictions_file: str, labels_dir: str, output_path: str):
    api_predictions = load_api_predictions_from_file(predictions_file)
    all_results: list[ObjectPrediction] = []

    for image_path in tqdm.tqdm(image_paths):
        predictions = api_predictions.get(image_path, [])
        file_name = os.path.basename(image_path).replace(".jpg", ".txt")
        label_path = os.path.join(labels_dir, file_name)
        if not os.path.exists(label_path):
            print(f"Label file not found for {image_path}, skipping.")
            continue
        image = cv2.imread(image_path)
        
        gt_bboxes = load_gt_bboxes(label_path, image.shape[:2])
        results = process_predictions_of_image(image_path, predictions, gt_bboxes)
        all_results.extend(results)
    save_processed_results_to_file(all_results, output_path)
