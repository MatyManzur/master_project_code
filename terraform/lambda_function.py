import json
import boto3
import os
from botocore.exceptions import ClientError
import uuid
from datetime import datetime

def lambda_handler(event, context):
    """
    Lambda function to generate presigned URLs for S3 uploads
    """
    
    s3_client = boto3.client('s3')
    
    bucket_name = os.environ.get('BUCKET_NAME')
    
    if not bucket_name:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Bucket name not configured'
            })
        }
    
    try:
        if event.get('body'):
            body = json.loads(event['body'])
        else:
            body = {}
        
        content_type = body.get('contentType', 'image/jpeg')
        expires_in = body.get('expiresIn', 3600)  # Default 1 hour
        file_name = f"{str(uuid.uuid4())[:5]}.jpg"

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        s3_key = f"reports/{timestamp}_{file_name}"
        
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': s3_key,
                'ContentType': content_type
            },
            ExpiresIn=expires_in
        )
        
        get_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': s3_key
            },
            ExpiresIn=expires_in
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'getUrl': get_url,
                'key': s3_key,
                'bucket': bucket_name,
                'expiresIn': expires_in,
                'contentType': content_type
            })
        }
        
    except ClientError as e:
        print(f"AWS error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Failed to generate presigned URL',
                'details': str(e)
            })
        }
    
    except json.JSONDecodeError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Invalid JSON in request body',
                'details': str(e)
            })
        }
    
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }
