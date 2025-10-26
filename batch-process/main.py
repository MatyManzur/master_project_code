#!/usr/bin/env python3
"""
Batch processing script for damage reports.
Reads messages from SQS queue, downloads images from S3, processes them,
and publishes results to Supabase.
"""

import json
import os
import time
import logging
import boto3
import requests
import io
from datetime import datetime
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError, NoCredentialsError
from supabase import create_client, Client
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

class BatchProcessor:
    def __init__(self):
        self.sqs_client = None
        self.s3_client = None
        self.supabase_client = None
        self.queue_url = None
        self.bucket_name = None
        
        self._initialize_aws_clients()
        self._initialize_supabase_client()
    
    def _initialize_aws_clients(self):
        try:
            # Check if explicit credentials are provided
            aws_access_key_id = os.environ.get('AWS_ACCESS_KEY_ID')
            aws_secret_access_key = os.environ.get('AWS_SECRET_ACCESS_KEY')
            aws_region = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
            
            if aws_access_key_id and aws_secret_access_key:
                logger.info("Using explicit AWS credentials for local testing")
                self.sqs_client = boto3.client(
                    'sqs',
                    aws_access_key_id=aws_access_key_id,
                    aws_secret_access_key=aws_secret_access_key,
                    region_name=aws_region
                )
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=aws_access_key_id,
                    aws_secret_access_key=aws_secret_access_key,
                    region_name=aws_region
                )
            else:
                logger.info("Using IAM role credentials for AWS Batch")
                self.sqs_client = boto3.client('sqs', region_name=aws_region)
                self.s3_client = boto3.client('s3', region_name=aws_region)
            
            self.queue_url = os.environ.get('SQS_QUEUE_URL')
            self.bucket_name = os.environ.get('BUCKET_NAME')
            
            if not self.queue_url:
                raise ValueError("SQS_QUEUE_URL environment variable must be set")
            if not self.bucket_name:
                raise ValueError("BUCKET_NAME environment variable must be set")
                
            logger.info("AWS clients initialized successfully")
            
        except NoCredentialsError:
            logger.error("AWS credentials not found. Please configure your credentials.")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize AWS clients: {str(e)}")
            raise
    
    def _initialize_supabase_client(self):
        try:
            supabase_url = os.environ.get('SUPABASE_URL')
            supabase_key = os.environ.get('SUPABASE_KEY')
            
            if not supabase_url or not supabase_key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")
            
            self.supabase_client: Client = create_client(supabase_url, supabase_key)
            logger.info("Supabase client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {str(e)}")
            raise
    
    def receive_messages(self, max_messages: int = 10, wait_time: int = 20) -> list:
        """
        Receive messages from SQS queue.
        
        Args:
            max_messages: Maximum number of messages to receive (1-10)
            wait_time: Long polling wait time in seconds
            
        Returns:
            List of messages received from the queue
        """
        try:
            response = self.sqs_client.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=max_messages,
                WaitTimeSeconds=wait_time,
                MessageAttributeNames=['All'],
                AttributeNames=['All'],
                VisibilityTimeout=30
            )
            
            messages = response.get('Messages', [])
            logger.info(f"Received {len(messages)} messages from SQS queue")
            return messages
            
        except ClientError as e:
            logger.error(f"Failed to receive messages from SQS: {str(e)}")
            return []
    
    def delete_message(self, receipt_handle: str) -> bool:
        """
        Delete a processed message from the SQS queue.
        
        Args:
            receipt_handle: Receipt handle of the message to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            self.sqs_client.delete_message(
                QueueUrl=self.queue_url,
                ReceiptHandle=receipt_handle
            )
            logger.debug("Message deleted successfully from SQS queue")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete message from SQS: {str(e)}")
            return False
    
    def download_image_from_s3(self, s3_key: str) -> Optional[bytes]:
        """
        Download image from S3 using the provided URL.
        
        Args:
            s3_key: S3 key of the image to download
            
        Returns:
            Image data as bytes, or None if download failed
        """
        try:
            logger.info(f"Downloading image from S3: {s3_key}")
            
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            image_data = response['Body'].read()
            
            logger.info(f"Successfully downloaded image: {len(image_data)} bytes")
            return image_data
            
        except ClientError as e:
            logger.error(f"Failed to download image from S3: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error downloading image: {str(e)}")
            return None
    
    def process_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        Process the image data by sending it to the prediction service.
        
        Args:
            image_data: Raw image data
            
        Returns:
            Processing results dictionary
        """
        logger.info("Starting image processing...")
        
        start_time = time.perf_counter()
        
        try:
            files = {
                'image': ('image.jpg', io.BytesIO(image_data), 'image/jpeg')
            }
            
            prediction_url = os.environ.get('PREDICTION_URL', 'http://localhost:3000/predict')
            logger.info(f"Sending request to: {prediction_url}")
            
            response = requests.post(
                prediction_url,
                files=files,
                timeout=30
            )
            
            if response.status_code == 200:
                prediction_results = response.json()
                logger.info(f"Prediction successful: received {len(prediction_results)} objects")
                
                end_time = time.perf_counter()
                processing_time = end_time - start_time
                
                objects = []
                for obj in prediction_results:
                    box = obj.get('box', {})
                    objects.append({
                        'x1': int(box.get('x1', 0)),
                        'y1': int(box.get('y1', 0)),
                        'x2': int(box.get('x2', 0)),
                        'y2': int(box.get('y2', 0)),
                        'healthy_score': float(obj.get('healthy_score', 0.0)),
                        'damaged_score': float(obj.get('damaged_score', 0.0)),
                    })
                
                processing_results = {
                    'processed_at': datetime.now().isoformat() + 'Z',
                    'processing_time': str(processing_time),
                    'image_size': len(image_data),
                    'objects': objects
                }
                
                logger.info(f"Image processing completed: found {len(objects)} objects")
                return processing_results
                
            else:
                logger.error(f"Prediction service returned error: {response.status_code} - {response.text}")
                raise Exception(f"Prediction service failed with status {response.status_code}")
                
        except requests.exceptions.Timeout:
            logger.error("Request to prediction service timed out")
            raise Exception("Prediction service timeout")
        except requests.exceptions.ConnectionError:
            logger.error("Failed to connect to prediction service")
            raise Exception("Cannot connect to prediction service")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request to prediction service failed: {str(e)}")
            raise Exception(f"Prediction service request failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during image processing: {str(e)}")
            raise
    
    def publish_to_supabase(self, report_data: Dict[str, Any], processing_results: Dict[str, Any]) -> bool:
        """
        Publish the processed report to Supabase using RPC function.
        
        Args:
            report_data: Original report data
            processing_results: Results from image processing
            
        Returns:
            True if publication was successful, False otherwise
        """
        try:
            location = report_data.get('location', {})
            lat = location.get('lat')
            lon = location.get('long')
            
            if lat is None or lon is None:
                logger.error("Missing latitude or longitude in report data")
                return False
            
            s3_key = report_data.get('image')            

            processing_time = processing_results.get('processing_time', None)
            image_size = processing_results.get('image_size', None)
            objects = [{
                'image_name': s3_key,
                'x1': obj.get('x1'),
                'y1': obj.get('y1'),
                'x2': obj.get('x2'),
                'y2': obj.get('y2'),
                'healthy_score': obj.get('healthy_score'),
                'damaged_score': obj.get('damaged_score'),
            } for obj in processing_results.get('objects', [])]

            response = self.supabase_client.rpc('process_report', {
                'image_name': s3_key,
                'processing_time': processing_time,
                'image_size': image_size
            }).execute()
            if response.data:
                logger.info(f"Successfully published processing results to DB: {response.data}")

            for obj in objects:
                response = self.supabase_client.rpc('insert_object_by_image_name', obj).execute()
                if response.data:
                    logger.info(f"Successfully published object to DB: {response.data}")
                else:
                    logger.error(f"Failed to publish object: {obj}")
            return True
        
        except Exception as e:
            logger.error(f"Failed to publish to Supabase: {str(e)}")
            return False
    
    def process_message(self, message: Dict[str, Any]) -> bool:
        """
        Process a single SQS message.
        
        Args:
            message: SQS message dictionary
            
        Returns:
            True if processing was successful, False otherwise
        """
        try:
            message_body = json.loads(message['Body'])
            logger.info(f"Processing message: {message.get('MessageId')}")
            
            required_fields = ['image', 'location', 'date', 'report_uuid']
            for field in required_fields:
                if field not in message_body:
                    logger.error(f"Missing required field in message: {field}")
                    return False
            
            image_data = self.download_image_from_s3(message_body['image'])
            if image_data is None:
                logger.error("Failed to download image, skipping message")
                return False
            
            try:
                processing_results = self.process_image(image_data)
            except Exception as e:
                logger.error(f"Image processing failed: {str(e)}")
                return False
            
            success = self.publish_to_supabase(message_body, processing_results)
            
            if success:
                logger.info("Message processed successfully")
                return True
            else:
                logger.error("Failed to publish results to Supabase")
                return False
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse message body JSON: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error processing message: {str(e)}")
            return False

    def run(self):
        """
        Main processing loop.
        """
        logger.info("Starting batch processor...")
        
        while True:
            try:
                messages = self.receive_messages()
                
                if not messages:
                    logger.info("No messages received")
                    break
                
                for message in messages:
                    success = self.process_message(message)
                    
                    # Delete message if processing was successful
                    if success:
                        receipt_handle = message.get('ReceiptHandle')
                        if receipt_handle:
                            self.delete_message(receipt_handle)
                            logger.info(f"Deleted message from queue: {message.get('MessageId')}")
                        else:
                            logger.warning("No receipt handle found for message")
                    else:
                        logger.warning("Message processing failed, leaving in queue for retry")
                    
            except Exception as e:
                logger.error(f"Unexpected error in main loop: {str(e)}")
                break

def main():
    """Main entry point."""
    try:
        processor = BatchProcessor()
        processor.run()
        
    except Exception as e:
        logger.error(f"Failed to start batch processor: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main()
