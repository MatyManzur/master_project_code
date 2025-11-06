# Terraform Infrastructure

## ECR and Batch Setup

```bash
terraform output ecr_repository_url
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ecr_repository_url>
docker tag batch_process:latest <ecr_repository_url>:latest
docker push <ecr_repository_url>:latest
```

## Testing Batch Jobs

```bash
aws batch submit-job \
  --job-name "damage-detection-test-$(date +%s)" \
  --job-queue "damage-detection-job-queue" \
  --job-definition "damage-detection-job-definition"
```

## Deploy Webapp

Set VITE_HOST and VITE_API_GATEWAY_URL in ../webapp/.env, build webapp and run:
```bash
./deploy_webapp.sh
```

## API Endpoints

After deployment, the following endpoints will be available:

### Generate Presigned URL
```bash
POST /upload-url
```

### Submit Damage Report
```bash
POST /submit-report
```

### Get Reports by UUID
```bash
GET /reports?uuid=<report_uuid>
GET /reports?uuid=<uuid1>&uuid=<uuid2>  # Multiple UUIDs
```

Response format for GET /reports:
```json
{
  "reports": [
    {
      "location": { "lat": 40.7128, "lng": -74.0060 },
      "report_uuid": "abc123",
      "state": "processed",
      "reported_at": "2024-01-01T12:00:00Z",
      "processed_at": "2024-01-01T12:05:00Z",
      "address": "123 Main St",
      "image_url": "https://pepito.com/reports/20240101_120000_xyz.jpg",
      "description": "Damage report description",
      "objects": [
        {
          "x1": 100, "x2": 200, "y1": 150, "y2": 250,
          "tag": "DAMAGED"
        }
      ]
    }
  ]
}
```

Returns 204 No Content if no reports found or no UUIDs provided.

### Environment Variables

The report get lambda uses these environment variables:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service role key
- `SCORE_THRESHOLD`: Minimum score threshold for object classification (default: 0.5)