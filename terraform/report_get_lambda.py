import json
import os
import urllib.request
import urllib.parse
import boto3
from botocore.exceptions import ClientError
from typing import List, Dict, Any, Optional

SUPABASE_RPC_ENDPOINT = "/rest/v1/rpc/get_report_details"
DEFAULT_SCORE_THRESHOLD = 0.38

def lambda_handler(event, context):
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_KEY')
    bucket_name = os.environ.get('BUCKET_NAME')
    score_threshold = float(os.environ.get('SCORE_THRESHOLD', DEFAULT_SCORE_THRESHOLD))
    
    if not supabase_url or not supabase_key or not bucket_name:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Missing Supabase or S3 configuration'
            })
        }
    
    try:
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS'
                },
                'body': ''
            }
        
        report_uuids = extract_report_uuids(event)
        
        if not report_uuids:
            return {
                'statusCode': 204,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS'
                },
                'body': ''
            }
        
        reports = []
        s3_client = boto3.client('s3')
        
        for uuid in report_uuids:
            report_data = get_report_from_supabase(supabase_url, supabase_key, uuid)
            if report_data:
                # Generate presigned URL for the image
                image_name = report_data.get('image_name')
                if image_name and image_name.strip():
                    presigned_url = generate_presigned_url(s3_client, bucket_name, image_name)
                    if presigned_url:
                        report_data['image_url'] = presigned_url
                    if 'image_name' in report_data:
                        del report_data['image_name']
                else:
                    if 'image_name' in report_data:
                        del report_data['image_name']
                
                processed_objects = process_objects(report_data.get('objects', []), score_threshold)
                report_data['objects'] = processed_objects
                reports.append(report_data)
        
        if not reports:
            return {
                'statusCode': 204,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS'
                },
                'body': ''
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'reports': reports
            })
        }
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }


def extract_report_uuids(event: Dict[str, Any]) -> List[str]:
    query_params = event.get('queryStringParameters', {})
    if not query_params:
        return []
    
    uuids = []
    multiValueQueryStringParameters = event.get('multiValueQueryStringParameters', {})
    
    if multiValueQueryStringParameters and 'uuid' in multiValueQueryStringParameters:
        uuid_list = multiValueQueryStringParameters['uuid']
        if isinstance(uuid_list, list):
            uuids.extend(uuid_list)
        else:
            uuids.append(uuid_list)
    elif query_params and 'uuid' in query_params:
        uuid_value = query_params['uuid']
        uuids.append(uuid_value)
    
    return list(set([uuid.strip() for uuid in uuids if uuid and uuid.strip()]))


def get_report_from_supabase(supabase_url: str, supabase_key: str, report_uuid: str) -> Optional[Dict[str, Any]]:
    try:
        rpc_url = f"{supabase_url}{SUPABASE_RPC_ENDPOINT}"
        payload = {"report_uuid_param": report_uuid}
        data = json.dumps(payload).encode('utf-8')
        
        request = urllib.request.Request(
            rpc_url,
            data=data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {supabase_key}',
                'apikey': supabase_key
            },
            method='POST'
        )
        
        response = urllib.request.urlopen(request)
        
        if response.status == 200:
            response_data = json.loads(response.read().decode('utf-8'))
            return response_data if response_data else None
        else:
            print(f"Supabase RPC call failed with status {response.status}")
            return None
            
    except Exception as e:
        print(f"Error calling Supabase RPC for UUID {report_uuid}: {str(e)}")
        return None


def process_objects(objects: List[Dict[str, Any]], threshold: float) -> List[Dict[str, Any]]:
    processed_objects = []
    
    for obj in objects:
        healthy_score = obj.get('healthy_score', 0)
        damaged_score = obj.get('damaged_score', 0)
        
        tag = None
        if healthy_score >= threshold and damaged_score >= threshold:
            tag = 'HEALTHY' if healthy_score > damaged_score else 'DAMAGED'
        elif healthy_score >= threshold:
            tag = 'HEALTHY'
        elif damaged_score >= threshold:
            tag = 'DAMAGED'
        
        if tag:
            processed_objects.append({
                'x1': obj.get('x1'),
                'x2': obj.get('x2'),
                'y1': obj.get('y1'),
                'y2': obj.get('y2'),
                'tag': tag
            })
    
    return processed_objects


def generate_presigned_url(s3_client, bucket_name: str, image_name: str, expires_in: int = 3600) -> Optional[str]:
    """
    Generate a presigned URL for viewing an image in S3
    
    Args:
        s3_client: boto3 S3 client
        bucket_name: Name of the S3 bucket
        image_name: Key/name of the image in S3
        expires_in: URL expiration time in seconds (default 1 hour)
    
    Returns:
        Presigned URL string or None if generation fails
    """
    try:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': bucket_name,
                'Key': image_name
            },
            ExpiresIn=expires_in
        )
        return presigned_url
    except ClientError as e:
        print(f"Error generating presigned URL for {image_name}: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error generating presigned URL for {image_name}: {str(e)}")
        return None
