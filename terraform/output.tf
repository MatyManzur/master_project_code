output "vpc_id" {
  value       = aws_vpc.main_vpc.id
  description = "ID of the VPC"
}

output "vpc_cidr_block" {
  value       = aws_vpc.main_vpc.cidr_block
  description = "CIDR block of the VPC"
}

output "public_subnet_id" {
  value       = aws_subnet.public_subnet.id
  description = "ID of the public subnet"
}

output "public_subnet_cidr" {
  value       = aws_subnet.public_subnet.cidr_block
  description = "CIDR block of the public subnet"
}

output "internet_gateway_id" {
  value       = aws_internet_gateway.main_igw.id
  description = "ID of the Internet Gateway"
}

output "security_group_id" {
  value       = aws_security_group.main_sg.id
  description = "ID of the batch fargate security group"
}

output "security_group_name" {
  value       = aws_security_group.main_sg.name
  description = "Name of the batch fargate security group"
}

output "bucket_name" {
  value = aws_s3_bucket.images_bucket.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.images_bucket.arn
}

output "presigned_url_lambda_function_name" {
  value       = aws_lambda_function.presigned_url_lambda.function_name
  description = "Name of the Lambda function for generating presigned URLs"
}

output "presigned_url_lambda_function_arn" {
  value       = aws_lambda_function.presigned_url_lambda.arn
  description = "ARN of the Lambda function for generating presigned URLs"
}

output "report_validation_lambda_function_name" {
  value       = aws_lambda_function.report_validation_lambda.function_name
  description = "Name of the Lambda function for validating damage reports"
}

output "report_validation_lambda_function_arn" {
  value       = aws_lambda_function.report_validation_lambda.arn
  description = "ARN of the Lambda function for validating damage reports"
}

output "api_gateway_url" {
  value       = "https://${aws_apigatewayv2_api.api_gateway.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.api_gateway_stage.name}"
  description = "Base HTTP API Gateway URL"
}

output "presigned_url_endpoint" {
  value       = "https://${aws_apigatewayv2_api.api_gateway.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.api_gateway_stage.name}/upload-url"
  description = "HTTP API Gateway URL for generating presigned URLs"
}

output "submit_report_endpoint" {
  value       = "https://${aws_apigatewayv2_api.api_gateway.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.api_gateway_stage.name}/submit-report"
  description = "HTTP API Gateway URL for submitting damage reports"
}

output "get_reports_endpoint" {
  value       = "https://${aws_apigatewayv2_api.api_gateway.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.api_gateway_stage.name}/reports"
  description = "HTTP API Gateway URL for getting damage reports by UUID"
}

output "api_gateway_id" {
  value       = aws_apigatewayv2_api.api_gateway.id
  description = "ID of the HTTP API Gateway"
}

output "request_queue_url" {
  value       = aws_sqs_queue.request_queue.url
  description = "URL of the SQS request queue"
}

output "request_queue_arn" {
  value       = aws_sqs_queue.request_queue.arn
  description = "ARN of the SQS request queue"
}

output "deadletter_queue_url" {
  value       = aws_sqs_queue.deadletter_queue.url
  description = "URL of the SQS dead letter queue"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.app_repository.repository_url
  description = "URL of the ECR repository"
}

output "ecr_repository_name" {
  value       = aws_ecr_repository.app_repository.name
  description = "Name of the ECR repository"
}

output "ecr_repository_arn" {
  value       = aws_ecr_repository.app_repository.arn
  description = "ARN of the ECR repository"
}

output "batch_compute_environment_arn" {
  value       = aws_batch_compute_environment.batch_fargate_compute_env.arn
  description = "ARN of the AWS Batch compute environment"
}

output "batch_job_queue_arn" {
  value       = aws_batch_job_queue.batch_job_queue.arn
  description = "ARN of the AWS Batch job queue"
}

output "batch_job_definition_arn" {
  value       = aws_batch_job_definition.batch_job_definition.arn
  description = "ARN of the AWS Batch job definition"
}

output "batch_job_definition_name" {
  value       = aws_batch_job_definition.batch_job_definition.name
  description = "Name of the AWS Batch job definition"
}

output "batch_job_queue_name" {
  value       = aws_batch_job_queue.batch_job_queue.name
  description = "Name of the AWS Batch job queue"
}

output "vpc_endpoint_ecr_api_id" {
  value       = aws_vpc_endpoint.ecr_api.id
  description = "ID of the ECR API VPC endpoint"
}

output "vpc_endpoint_ecr_dkr_id" {
  value       = aws_vpc_endpoint.ecr_dkr.id
  description = "ID of the ECR Docker VPC endpoint"
}

output "vpc_endpoint_s3_id" {
  value       = aws_vpc_endpoint.s3.id
  description = "ID of the S3 VPC endpoint"
}

output "vpc_endpoint_logs_id" {
  value       = aws_vpc_endpoint.logs.id
  description = "ID of the CloudWatch Logs VPC endpoint"
}

output "vpc_endpoint_sqs_id" {
  value       = aws_vpc_endpoint.sqs.id
  description = "ID of the SQS VPC endpoint"
}

# CloudFront and Webapp outputs
output "webapp_bucket_name" {
  value       = aws_s3_bucket.webapp_bucket.bucket
  description = "Name of the S3 bucket for the webapp"
}

output "webapp_bucket_arn" {
  value       = aws_s3_bucket.webapp_bucket.arn
  description = "ARN of the S3 bucket for the webapp"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.webapp_distribution.id
  description = "ID of the CloudFront distribution"
}

output "cloudfront_distribution_arn" {
  value       = aws_cloudfront_distribution.webapp_distribution.arn
  description = "ARN of the CloudFront distribution"
}

output "webapp_url" {
  value       = "https://${aws_cloudfront_distribution.webapp_distribution.domain_name}"
  description = "URL of the webapp via CloudFront distribution"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.webapp_distribution.domain_name
  description = "Domain name of the CloudFront distribution"
}