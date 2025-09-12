// Brightness analysis configuration constants
const BRIGHTNESS_CONFIG = {
  // Analysis performance settings
  MAX_SAMPLE_SIZE: 320, // Maximum width/height for analysis (reduces computation)
  
  // Brightness thresholds
  DARK_THRESHOLD: 60,     // Mean brightness below this is considered too dark
  BRIGHT_THRESHOLD: 200,  // Mean brightness above this is considered too bright
  LOW_STD_THRESHOLD: 30,  // Low standard deviation indicates lack of detail (over/under exposed)
  DARK_EDGE_MEAN: 80,     // Secondary dark threshold when combined with low std
  BRIGHT_EDGE_MEAN: 180,  // Secondary bright threshold when combined with low std
  
  // Monitoring settings
  DEFAULT_INTERVAL_MS: 500,  // Default analysis interval in milliseconds
  STARTUP_DELAY_MS: 1000,    // Delay before starting analysis to ensure video is ready
};

export interface BrightnessAnalysis {
  status: 'too-dark' | 'ok' | 'too-bright';
  mean: number;
  std: number;
  histogram: number[];
}

/**
 * Analyzes the brightness of an image using histogram analysis
 * @param imageSource - Can be HTMLVideoElement, HTMLImageElement, or HTMLCanvasElement
 * @returns BrightnessAnalysis object with status and statistical data
 */
export function analyzeBrightness(imageSource: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): BrightnessAnalysis {
  // Create a temporary canvas to analyze the image
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Set canvas size based on source type
  let width: number, height: number;
  
  if (imageSource instanceof HTMLVideoElement) {
    width = imageSource.videoWidth;
    height = imageSource.videoHeight;
  } else {
    width = imageSource.width;
    height = imageSource.height;
  }

  // Use a smaller sample size for performance (max 320x240)
  const maxSampleSize = BRIGHTNESS_CONFIG.MAX_SAMPLE_SIZE;
  const aspectRatio = width / height;
  
  if (width > maxSampleSize || height > maxSampleSize) {
    if (width > height) {
      canvas.width = maxSampleSize;
      canvas.height = Math.round(maxSampleSize / aspectRatio);
    } else {
      canvas.height = maxSampleSize;
      canvas.width = Math.round(maxSampleSize * aspectRatio);
    }
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const histogram = new Array(256).fill(0);
  const brightnessValues: number[] = [];
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    histogram[brightness]++;
    brightnessValues.push(brightness);
  }
  
  const mean = brightnessValues.reduce((sum, val) => sum + val, 0) / brightnessValues.length;
  
  const variance = brightnessValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / brightnessValues.length;
  const std = Math.sqrt(variance);
  
  let status: 'too-dark' | 'ok' | 'too-bright';
  
  const DARK_THRESHOLD = BRIGHTNESS_CONFIG.DARK_THRESHOLD;
  const BRIGHT_THRESHOLD = BRIGHTNESS_CONFIG.BRIGHT_THRESHOLD;
  const LOW_STD_THRESHOLD = BRIGHTNESS_CONFIG.LOW_STD_THRESHOLD;
  
  if (mean < DARK_THRESHOLD || (mean < BRIGHTNESS_CONFIG.DARK_EDGE_MEAN && std < LOW_STD_THRESHOLD)) {
    status = 'too-dark';
  } else if (mean > BRIGHT_THRESHOLD || (mean > BRIGHTNESS_CONFIG.BRIGHT_EDGE_MEAN && std < LOW_STD_THRESHOLD)) {
    status = 'too-bright';
  } else {
    status = 'ok';
  }
  
  return {
    status,
    mean: Math.round(mean),
    std: Math.round(std * 100) / 100, // Round to 2 decimal places
    histogram
  };
}

/**
 * Analyzes brightness from a video element continuously
 * @param videoElement - The video element to analyze
 * @param callback - Function called with analysis results
 * @param intervalMs - How often to analyze (default: 500ms)
 * @returns Function to stop the analysis
 */
export function startBrightnessMonitoring(
  videoElement: HTMLVideoElement,
  callback: (analysis: BrightnessAnalysis) => void,
  intervalMs: number = BRIGHTNESS_CONFIG.DEFAULT_INTERVAL_MS
): () => void {
  let isRunning = true;
  
  const analyze = () => {
    if (!isRunning || !videoElement.videoWidth || !videoElement.videoHeight) {
      return;
    }
    
    try {
      const analysis = analyzeBrightness(videoElement);
      callback(analysis);
    } catch (error) {
      console.warn('Error analyzing brightness:', error);
    }
    
    if (isRunning) {
      setTimeout(analyze, intervalMs);
    }
  };
  
  setTimeout(analyze, BRIGHTNESS_CONFIG.STARTUP_DELAY_MS);
  
  return () => {
    isRunning = false;
  };
}
