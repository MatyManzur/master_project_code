import json
import boto3
import os
from datetime import datetime

def lambda_handler(event, context):
    """
    Lambda function that checks SQS queue for messages and triggers Batch jobs if needed.
    """
    
    sqs = boto3.client('sqs')
    batch = boto3.client('batch')
    
    queue_url = os.environ['SQS_QUEUE_URL']
    job_queue = os.environ['BATCH_JOB_QUEUE']
    job_definition = os.environ['BATCH_JOB_DEF']
    
    try:
        queue_attributes = sqs.get_queue_attributes(
            QueueUrl=queue_url,
            AttributeNames=['ApproximateNumberOfMessages']
        )
        
        # Get message count (only available messages, not in-flight)
        messages_available = int(queue_attributes['Attributes'].get('ApproximateNumberOfMessages', 0))
        
        print(f"Queue status - Available messages: {messages_available}")
        
        if messages_available == 0:
            print("No messages in queue, no action needed")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'No messages in queue',
                    'messagesAvailable': messages_available
                })
            }
        
        # Check if there are already running batch jobs
        running_jobs = batch.list_jobs(
            jobQueue=job_queue,
            jobStatus='RUNNING'
        )
        
        submitted_jobs = batch.list_jobs(
            jobQueue=job_queue,
            jobStatus='SUBMITTED'
        )
        
        pending_jobs = batch.list_jobs(
            jobQueue=job_queue,
            jobStatus='PENDING'
        )
        
        total_active_jobs = (len(running_jobs.get('jobList', [])) + 
                           len(submitted_jobs.get('jobList', [])) + 
                           len(pending_jobs.get('jobList', [])))
        
        print(f"Active batch jobs: {total_active_jobs}")
        
        # If there are messages but no active jobs, submit a new batch job
        if total_active_jobs == 0:
            job_name = f"damage-detection-job-{int(datetime.now().timestamp())}"
            
            response = batch.submit_job(
                jobName=job_name,
                jobQueue=job_queue,
                jobDefinition=job_definition
            )
            
            job_id = response['jobId']
            print(f"Submitted new batch job: {job_id}")
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Batch job submitted',
                    'jobId': job_id,
                    'jobName': job_name,
                    'messagesAvailable': messages_available
                })
            }
        else:
            print(f"Batch jobs already running ({total_active_jobs}), no new job needed")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Batch jobs already running',
                    'activeJobs': total_active_jobs,
                    'messagesAvailable': messages_available
                })
            }
            
    except Exception as e:
        print(f"Error monitoring batch jobs: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
