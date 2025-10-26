from sklearn.metrics import precision_score, recall_score, f1_score, average_precision_score
import pandas as pd
import numpy as np

def calculate_basic_classification_metrics(df_group):
    """Calculate precision, recall, and F1 for a brightness group."""
    classes = ['healthy', 'damaged']
    
    precision = precision_score(df_group['actual'], df_group['predicted_label'], 
                               average=None, labels=classes, zero_division=0)
    recall = recall_score(df_group['actual'], df_group['predicted_label'], 
                         average=None, labels=classes, zero_division=0)
    f1 = f1_score(df_group['actual'], df_group['predicted_label'], 
                  average=None, labels=classes, zero_division=0)
    
    return {
        'precision_healthy': float(precision[0]) if len(precision) > 0 else 0.0,
        'precision_damaged': float(precision[1]) if len(precision) > 1 else 0.0,
        'recall_healthy': float(recall[0]) if len(recall) > 0 else 0.0,
        'recall_damaged': float(recall[1]) if len(recall) > 1 else 0.0,
        'f1_healthy': float(f1[0]) if len(f1) > 0 else 0.0,
        'f1_damaged': float(f1[1]) if len(f1) > 1 else 0.0
    }

def calculate_map_metrics(df_group):
    """Calculate mAP@0.5 and mAP@0.5:0.95 for a brightness group."""
    ious = np.arange(0.5, 1.0, 0.05)
    aps = []
    
    for iou_thr in ious:
        # AP for healthy class
        y_true_healthy = (df_group['actual'] == 'healthy').astype(int)
        y_score_healthy = (df_group['confidence'] * df_group['score'] * 
                          (df_group['iou'] >= iou_thr).astype(float) * 
                          (df_group['score'] >= 0.5).astype(float))
        
        if y_true_healthy.sum() > 0:
            ap_healthy = average_precision_score(y_true_healthy, y_score_healthy)
        else:
            ap_healthy = 0.0
        
        # AP for damaged class
        y_true_damaged = (df_group['actual'] == 'damaged').astype(int)
        y_score_damaged = (df_group['confidence'] * (1 - df_group['score']) * 
                          (df_group['iou'] >= iou_thr).astype(float) * 
                          (df_group['score'] <= 0.5).astype(float))
        
        if y_true_damaged.sum() > 0:
            ap_damaged = average_precision_score(y_true_damaged, y_score_damaged)
        else:
            ap_damaged = 0.0
        aps.append({'iou': iou_thr, 'AP_healthy': ap_healthy, 'AP_damaged': ap_damaged})
    
    aps_df = pd.DataFrame(aps)
    aps_df['mAP'] = aps_df[['AP_healthy', 'AP_damaged']].mean(axis=1)
    
    map_50 = aps_df[aps_df['iou'] == 0.5]['mAP'].iloc[0] if len(aps_df) > 0 else 0.0
    map_50_95 = aps_df['mAP'].mean()
    
    return {
        'mAP_50': float(map_50),
        'mAP_50_95': float(map_50_95)
    }

def calculate_brightness_statistics(group_data, analysis_property='brightness'):
    """Calculate brightness/property statistics for a group."""
    property_values = group_data['actual_property_values']
    
    return {
        f'min_{analysis_property}': float(np.min(property_values)),
        f'max_{analysis_property}': float(np.max(property_values)),
        f'mean_{analysis_property}': float(np.mean(property_values)),
        f'std_{analysis_property}': float(np.std(property_values)),
        f'target_{analysis_property}': float(group_data['target_property'])
    }

def calculate_metrics_for_group(df_group, group_data, analysis_property='brightness'):
    basic_metrics = calculate_basic_classification_metrics(df_group)
    
    map_metrics = calculate_map_metrics(df_group)
    
    brightness_stats = calculate_brightness_statistics(group_data, analysis_property)
    
    additional_info = {
        'sample_count': len(df_group)
    }

    return {**basic_metrics, **map_metrics, **brightness_stats, **additional_info}

def calculate_metrics_for_group_relative(df_group):
    basic_metrics = calculate_basic_classification_metrics(df_group)
    
    map_metrics = calculate_map_metrics(df_group)
    
    additional_info = {
        'sample_count': len(df_group)
    }

    return {**basic_metrics, **map_metrics, **additional_info}