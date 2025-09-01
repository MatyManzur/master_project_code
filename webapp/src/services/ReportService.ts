import { config } from '../config/environment';

export const PROGRESS_STEPS = [33, 67, 100];

export interface ReportData {
  image: string;
  location: {
    lat: number;
    long: number;
  };
  date: string;
  description?: string;
  address?: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  getUrl: string;
  key: string;
}

interface SubmitReportResponse {
  message: string;
  report_uuid: string;
  status: string;
}

async function getPresignedUrl(fileName: string, contentType: string): Promise<UploadUrlResponse> {
  const response = await fetch(`${config.API_GATEWAY_URL}/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName,
      contentType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get presigned URL: ${response.status}`);
  }

  return response.json();
}

async function uploadImageToS3(uploadUrl: string, imageFile: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': imageFile.type,
    },
    body: imageFile,
  });

  if (!response.ok) {
    throw new Error(`Image upload failed: ${response.status}`);
  }
}

async function submitReportData(reportData: ReportData): Promise<SubmitReportResponse> {
  const response = await fetch(`${config.API_GATEWAY_URL}/submit-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    throw new Error(`Report submission failed: ${response.status}`);
  }

  return response.json();
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type });
}

export async function submitReport(
  imageDataUrl: string,
  location: { lat: number; lng: number },
  description?: string,
  address?: string,
  onProgress?: (progress: number) => void
): Promise<SubmitReportResponse> {
  const imageFile = await dataUrlToFile(imageDataUrl, `damage-report-${Date.now()}.jpg`);
  
  const { uploadUrl, key } = await getPresignedUrl(imageFile.name, imageFile.type);
  onProgress?.(PROGRESS_STEPS[0]);
  
  await uploadImageToS3(uploadUrl, imageFile);
  onProgress?.(PROGRESS_STEPS[1]);

  const reportData: ReportData = {
    image: key,
    location: {
      lat: location.lat,
      long: location.lng,
    },
    date: new Date().toISOString(),
    description,
    address,
  };

  const result = await submitReportData(reportData);
  onProgress?.(PROGRESS_STEPS[2]);
  
  return result;
}