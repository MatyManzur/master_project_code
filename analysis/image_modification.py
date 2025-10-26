import cv2
import numpy as np
from PIL import Image, ImageEnhance
import os
from tqdm import tqdm

def measure_image_properties(image_path: str) -> dict[str, float]:
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    
    brightness = np.mean(gray) / 255.0
    contrast = np.std(gray) / 255.0
    saturation = np.mean(hsv[:, :, 1]) / 255.0
    
    return {
        'brightness': float(brightness),
        'contrast': float(contrast),
        'saturation': float(saturation),
    }

def modify_image_property_absolute(
    image_path: str,
    property: str,
    target_value: float
) -> tuple[Image.Image, dict[str, float]]:
    """
    Modify image properties to reach target values.
    Returns the modified image and actual achieved properties.
    """
    image = Image.open(image_path)
    
    current_props = measure_image_properties(image_path)
    
    if property == 'brightness':
        current_brightness = current_props['brightness']
        if current_brightness > 0:
            brightness_factor = target_value / current_brightness
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(brightness_factor)
    
    if property == 'saturation':
        current_saturation = current_props['saturation']
        if current_saturation > 0:
            saturation_factor = target_value / current_saturation
            enhancer = ImageEnhance.Color(image)
            image = enhancer.enhance(saturation_factor)
    
    if property == 'contrast':
        current_contrast = current_props['contrast']
        if current_contrast > 0:
            contrast_factor = target_value / current_contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(contrast_factor)
    
    return image, current_props

def create_property_groups(base_output_dir, orig_image_paths: list[str], property: str, property_levels: list[float]) -> dict:
    base_dir = os.path.join(base_output_dir, f"{property}_analysis")
    os.makedirs(base_dir, exist_ok=True)

    property_groups = {}

    for target_property in property_levels:
        group_name = f"{property}_{target_property:.2f}"
        group_dir = os.path.join(base_dir, group_name)
        os.makedirs(group_dir, exist_ok=True)

        property_groups[group_name] = {
            'target_property': target_property,
            'images': [],
            'actual_property_values': []
        }

        print(f"Creating {property} group {group_name} (target: {target_property})")

        for original_path in tqdm(orig_image_paths, desc=f"Processing {group_name}"):
            modified_image, original_props = modify_image_property_absolute(
                original_path, property, target_property
            )
            
            filename = os.path.basename(original_path)
            modified_path = os.path.join(group_dir, filename)
            modified_image.save(modified_path)
            
            actual_props = measure_image_properties(modified_path)
            actual_value = actual_props[property]

            property_groups[group_name]['images'].append({
                'original_path': original_path,
                'modified_path': modified_path,
                'original_properties': original_props,
                'actual_properties': actual_props,
                'actual_value': actual_value
            })
            property_groups[group_name]['actual_property_values'].append(actual_value)

    return property_groups

def modify_image_property_relative(
    image_path: str,
    property_name: str,
    relative_change: float
) -> tuple[Image.Image, dict[str, float]]:
    """
    Modify image properties by a relative percentage change.
    
    Args:
        image_path: Path to the image
        property_name: Property to modify ('brightness', 'saturation', 'contrast', 'blur')
        relative_change: Relative change as decimal (e.g., 0.2 = +20%, -0.1 = -10%)
    
    Returns:
        Modified image and original properties
    """
    image = Image.open(image_path)
    
    original_props = measure_image_properties(image_path)
    
    if relative_change == 0:
        return image, original_props
    
    enhancement_factor = 1.0 + relative_change
    
    if property_name == 'brightness':
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(enhancement_factor)
    
    elif property_name == 'saturation':
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(enhancement_factor)
    
    elif property_name == 'contrast':
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(enhancement_factor)
    
    elif property_name == 'blur':
        # For blur, only allow positive changes (adding blur)
        # Negative values don't make sense as we can't reduce blur below the original level
        if relative_change > 0:
            # Add blur using Gaussian filter
            cv_image = cv2.imread(image_path)
            # Scale kernel size based on relative change (more change = more blur)
            kernel_size = max(1, int(15 * relative_change))
            if kernel_size % 2 == 0:
                kernel_size += 1  # Ensure odd kernel size
            blurred = cv2.GaussianBlur(cv_image, (kernel_size, kernel_size), 0)
            image = Image.fromarray(cv2.cvtColor(blurred, cv2.COLOR_BGR2RGB))
        elif relative_change < 0:
            print(f"Warning: Negative blur change ({relative_change}) ignored. Cannot reduce blur below original level.")
    
    return image, original_props

def create_property_groups_relative(base_output_dir, orig_image_paths: list[str], property: str, property_levels: list[float]) -> dict:
    base_dir = os.path.join(base_output_dir, f"{property}_relative_analysis")
    os.makedirs(base_dir, exist_ok=True)

    property_groups = {}

    for relative_change in property_levels:
        group_name = f"{property}_rel_{relative_change:+.2f}"
        group_dir = os.path.join(base_dir, group_name)
        os.makedirs(group_dir, exist_ok=True)

        property_groups[group_name] = {
            'relative_change': relative_change,
            'images': [],
            'actual_property_values': []
        }

        print(f"Creating {property} relative group {group_name} (change: {relative_change:+.2f})")

        for original_path in tqdm(orig_image_paths, desc=f"Processing {group_name}"):
            
            modified_image, original_props = modify_image_property_relative(
                original_path, property, relative_change
            )

            
            filename = os.path.basename(original_path)
            modified_path = os.path.join(group_dir, filename)
            modified_image.save(modified_path)

            
            actual_props = measure_image_properties(modified_path)
            actual_value = actual_props[property]

            property_groups[group_name]['images'].append({
                'original_path': original_path,
                'modified_path': modified_path,
                'original_properties': original_props,
                'actual_properties': actual_props,
                'actual_value': actual_value
            })
            property_groups[group_name]['actual_property_values'].append(actual_value)

    return property_groups