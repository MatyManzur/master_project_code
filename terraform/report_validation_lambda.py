import json
import uuid
import boto3
import os
import re
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

REPORT_UUID_LENGTH = 8

def lambda_handler(event, context):
    """
    Lambda function to validate and process new damage reports
    Expected format:
    {
        "image": "s3://bucket-name/path/to/image",
        "location": {
            "lat": float,
            "long": float
        },
        "date": "2024-01-01T12:00:00Z" (ISO 8601 timestamp)
    }
    """
    
    s3_client = boto3.client('s3')
    sqs_client = boto3.client('sqs')
    
    bucket_name = os.environ.get('BUCKET_NAME')
    queue_url = os.environ.get('SQS_QUEUE_URL')
    
    if not bucket_name or not queue_url:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Missing environment configuration'
            })
        }
    
    try:
        if not event.get('body'):
            return create_error_response(400, 'Missing request body')
        
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return create_error_response(400, 'Invalid JSON format')
        
        validation_error = validate_report_structure(body, bucket_name, s3_client)
        if validation_error:
            return create_error_response(400, validation_error)
        
        report_data = {
            'image': body['image'],
            'location': body['location'],
            'date': body['date'],
            'received_at': datetime.utcnow().isoformat() + 'Z',
            'status': 'pending',
            'report_uuid': str(uuid.uuid4())[:REPORT_UUID_LENGTH]
        }
        
        try:
            response = sqs_client.send_message(
                QueueUrl=queue_url,
                MessageBody=json.dumps(report_data),
                MessageAttributes={
                    'MessageType': {
                        'StringValue': 'damage_report',
                        'DataType': 'String'
                    },
                    'Priority': {
                        'StringValue': 'normal',
                        'DataType': 'String'
                    }
                }
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Report successfully submitted',
                    'report_uuid': report_data['report_uuid'],
                    'status': 'accepted'
                })
            }
            
        except ClientError as e:
            print(f"SQS error: {str(e)}")
            return create_error_response(500, 'Failed to queue report for processing')
    
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return create_error_response(500, 'Internal server error')

def validate_report_structure(body, bucket_name, s3_client):
    """
    Validate the structure and content of the damage report
    Returns None if valid, error message string if invalid
    """
    
    # Check required fields
    required_fields = ['image', 'location', 'date']
    for field in required_fields:
        if field not in body:
            return f'Missing required field: {field}'
    
    # Validate image S3 key
    image_key = body['image']
    if not isinstance(image_key, str):
        return 'Image field must be a string'

    # Validate file extension
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    if not any(image_key.lower().endswith(ext) for ext in valid_extensions):
        return 'Image must be a valid image file (jpg, jpeg, png, gif, bmp, webp)'

    # Check if object exists in S3
    try:
        s3_client.head_object(Bucket=bucket_name, Key=image_key)
    except ClientError as e:
        if e.response['Error']['Code'] == '404':
            return 'Image does not exist in S3 bucket'
        else:
            return 'Error validating image in S3'
    except Exception as e:
        return f'Unexpected error checking image in S3: {str(e)}'
    
    # Validate location
    location = body['location']
    if not isinstance(location, dict):
        return 'Location must be an object'
    
    if 'lat' not in location or 'long' not in location:
        return 'Location must contain lat and long fields'
    
    try:
        lat = float(location['lat'])
        long = float(location['long'])
        
        # Basic latitude/longitude range validation
        if not (-90 <= lat <= 90):
            return 'Latitude must be between -90 and 90'
        if not (-180 <= long <= 180):
            return 'Longitude must be between -180 and 180'
            
    except (ValueError, TypeError):
        return 'Latitude and longitude must be numeric values'
    
    # Validate date
    date_str = body['date']
    if not isinstance(date_str, str):
        return 'Date must be a string'
    
    # Validate ISO 8601 format
    try:
        # Try parsing with different ISO formats
        date_formats = [
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%dT%H:%M:%S.%f%z'
        ]
        
        parsed_date = None
        for date_format in date_formats:
            try:
                parsed_date = datetime.strptime(date_str, date_format)
                break
            except ValueError:
                continue
        
        if parsed_date is None:
            return 'Date must be in ISO 8601 format (e.g., 2024-01-01T12:00:00Z)'
        
        
        now = datetime.now()
        max_future = now + timedelta(days=1)

        if parsed_date >= max_future:
            return 'Date cannot be in the future'
            
    except Exception as e:
        return f'Invalid date format: {str(e)}'
    
    return None  # No validation errors

def create_error_response(status_code, message):
    """Create a standardized error response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        'body': json.dumps({
            'error': message,
            'status': 'error'
        })
    }
