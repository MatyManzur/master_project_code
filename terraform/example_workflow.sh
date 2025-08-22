#!/bin/bash

# Complete workflow example: Upload image and submit damage report
# Usage: ./example_workflow.sh <API_GATEWAY_URL> <IMAGE_FILE>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <API_GATEWAY_URL> <IMAGE_FILE>"
    echo "Example: $0 https://your-api-id.execute-api.us-east-1.amazonaws.com/v1 ./sample-damage.jpg"
    exit 1
fi

API_URL="$1"
IMAGE_FILE="$2"

if [ ! -f "$IMAGE_FILE" ]; then
    echo "Error: Image file '$IMAGE_FILE' not found!"
    exit 1
fi

echo "=== Damage Report Submission Workflow ==="
echo "API URL: $API_URL"
echo "Image: $IMAGE_FILE"
echo ""

# Step 1: Get presigned URL for image upload
echo "Step 1: Getting presigned URL for image upload..."
UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/upload-url" \
    -H "Content-Type: application/json" \
    -d "{\"fileName\": \"$(basename $IMAGE_FILE)\", \"contentType\": \"image/jpeg\"}")

echo "Upload response: $UPLOAD_RESPONSE"

# Extract upload URL and final image URL from response
UPLOAD_URL=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['uploadUrl'])" 2>/dev/null)
IMAGE_URL=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['getUrl'])" 2>/dev/null)
S3_KEY=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['key'])" 2>/dev/null)

if [ -z "$UPLOAD_URL" ] || [ -z "$IMAGE_URL" ]; then
    echo "Error: Failed to get presigned URL"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo "✓ Presigned URL obtained successfully"
echo ""

# Step 2: Upload the image to S3
echo "Step 2: Uploading image to S3..."
UPLOAD_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X PUT "$UPLOAD_URL" \
    -H "Content-Type: image/jpeg" \
    --data-binary "@$IMAGE_FILE")

if [ "$UPLOAD_STATUS" -eq 200 ]; then
    echo "✓ Image uploaded successfully"
    echo "Image URL: $IMAGE_URL"
else
    echo "✗ Image upload failed (HTTP $UPLOAD_STATUS)"
    exit 1
fi
echo ""

# Step 3: Submit damage report with uploaded image
echo "Step 3: Submitting damage report..."

# Example coordinates (New York City)
REPORT_DATA="{
    \"image\": \"$S3_KEY\",
    \"location\": {
        \"lat\": 40.7128,
        \"long\": -74.0060
    },
    \"date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
}"

echo "Report data: $REPORT_DATA"

REPORT_RESPONSE=$(curl -s -X POST "${API_URL}/submit-report" \
    -H "Content-Type: application/json" \
    -d "$REPORT_DATA")

echo "Report response: $REPORT_RESPONSE"

# Check if report was submitted successfully
if echo "$REPORT_RESPONSE" | grep -q "successfully submitted"; then
    echo "✓ Damage report submitted successfully!"
    MESSAGE_ID=$(echo "$REPORT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['message_id'])" 2>/dev/null)
    echo "Message ID: $MESSAGE_ID"
else
    echo "✗ Damage report submission failed"
    exit 1
fi

echo ""
echo "=== Workflow completed successfully! ==="
echo ""
echo "Summary:"
echo "- Image uploaded to: $IMAGE_URL"
echo "- Report queued for processing"
echo "- Check SQS queue for processing status"
