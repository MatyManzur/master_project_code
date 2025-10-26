import random
import cv2, os
import numpy as np
import matplotlib.pyplot as plt

def show_random_images_with_bboxes(image_paths, label_dir, class_names=["damaged", "healthy"], N=9, cols=None):
    sample_paths = random.sample(image_paths, min(N, len(image_paths)))
    images = []
    bboxes = []
    labels = []

    for img_path in sample_paths:
        img = cv2.cvtColor(cv2.imread(img_path), cv2.COLOR_BGR2RGB)
        bbox_list = []
        label_list = []
        label_path = os.path.join(label_dir, os.path.basename(img_path).replace('.jpg', '.txt'))
        if os.path.exists(label_path):
            h_img, w_img = img.shape[:2]
            with open(label_path, "r") as f:
                for line in f:
                    class_id, cx, cy, w, h = map(float, line.strip().split())
                    x_center = cx * w_img
                    y_center = cy * h_img
                    width = w * w_img
                    height = h * h_img
                    x1 = int(x_center - width / 2)
                    y1 = int(y_center - height / 2)
                    x2 = int(x_center + width / 2)
                    y2 = int(y_center + height / 2)
                    bbox_list.append((x1, y1, x2, y2))
                    label_list.append(class_names[int(class_id)])
        images.append(img)
        bboxes.append(bbox_list)
        labels.append(label_list)

    cols = int(np.ceil(np.sqrt(N)) if cols is None else cols)
    rows = int(np.ceil(N / cols))

    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4))
    axes = axes.flatten()

    for i, (img, bbox_list, label_list) in enumerate(zip(images, bboxes, labels)):
        img_draw = img.copy()
        h_img, w_img = img.shape[:2]
        thickness = max(2, int(round(0.005 * (h_img + w_img) / 2)))
        font_scale = max(0.5, 0.002 * (h_img + w_img) / 2)
        for bbox, label in zip(bbox_list, label_list):
            x1, y1, x2, y2 = bbox
            color = (0, 255, 0) if label == "healthy" else (255, 0, 0)
            cv2.rectangle(img_draw, (x1, y1), (x2, y2), color, thickness)
            cv2.putText(img_draw, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness)
        axes[i].imshow(img_draw)
        axes[i].axis('off')
    for j in range(i+1, len(axes)):
        axes[j].axis('off')
    plt.tight_layout()
    plt.show()

