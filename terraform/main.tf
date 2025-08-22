# VPC
resource "aws_vpc" "main_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "main-vpc"
    Environment = "Dev"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main_igw" {
  vpc_id = aws_vpc.main_vpc.id

  tags = {
    Name        = "main-igw"
    Environment = "Dev"
  }
}

# Public Subnet
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true

  tags = {
    Name        = "public-subnet"
    Environment = "Dev"
    Type        = "Public"
  }
}

# Route Table for Public Subnet
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main_igw.id
  }

  tags = {
    Name        = "public-route-table"
    Environment = "Dev"
  }
}

# Associate Route Table with Public Subnet
resource "aws_route_table_association" "public_rt_association" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

# Security Group
resource "aws_security_group" "main_sg" {
  name        = "batch-fargate-security-group"
  description = "Security group for AWS Batch Fargate tasks - outbound only"
  vpc_id      = aws_vpc.main_vpc.id

  # No inbound rules - AWS Batch Fargate tasks don't need incoming connections
  
  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name        = "batch-fargate-security-group"
    Environment = "Dev"
  }
}

# VPC Endpoints for AWS services (required for Fargate to access ECR, S3, etc.)
# ECR API VPC Endpoint
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main_vpc.id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.public_subnet.id]
  security_group_ids  = [aws_security_group.vpc_endpoint_sg.id]
  private_dns_enabled = true

  tags = {
    Name        = "ecr-api-endpoint"
    Environment = "Dev"
  }
}

# ECR Docker VPC Endpoint
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main_vpc.id
  service_name        = "com.amazonaws.${var.region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.public_subnet.id]
  security_group_ids  = [aws_security_group.vpc_endpoint_sg.id]
  private_dns_enabled = true

  tags = {
    Name        = "ecr-dkr-endpoint"
    Environment = "Dev"
  }
}

# S3 VPC Endpoint
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main_vpc.id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [aws_route_table.public_rt.id]

  tags = {
    Name        = "s3-endpoint"
    Environment = "Dev"
  }
}

# CloudWatch Logs VPC Endpoint
resource "aws_vpc_endpoint" "logs" {
  vpc_id              = aws_vpc.main_vpc.id
  service_name        = "com.amazonaws.${var.region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.public_subnet.id]
  security_group_ids  = [aws_security_group.vpc_endpoint_sg.id]
  private_dns_enabled = true

  tags = {
    Name        = "logs-endpoint"
    Environment = "Dev"
  }
}

# SQS VPC Endpoint
resource "aws_vpc_endpoint" "sqs" {
  vpc_id              = aws_vpc.main_vpc.id
  service_name        = "com.amazonaws.${var.region}.sqs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = [aws_subnet.public_subnet.id]
  security_group_ids  = [aws_security_group.vpc_endpoint_sg.id]
  private_dns_enabled = true

  tags = {
    Name        = "sqs-endpoint"
    Environment = "Dev"
  }
}

# Security Group for VPC Endpoints
resource "aws_security_group" "vpc_endpoint_sg" {
  name        = "vpc-endpoints-security-group"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main_vpc.id

  # Allow HTTPS inbound from VPC CIDR
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main_vpc.cidr_block]
    description = "HTTPS from VPC"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name        = "vpc-endpoints-security-group"
    Environment = "Dev"
  }
}

# S3 Bucket for all uploaded images
resource "aws_s3_bucket" "images_bucket" {
  bucket = var.bucket_name
}

# CORS Configuration for S3 Bucket
resource "aws_s3_bucket_cors_configuration" "images_bucket_cors" {
  bucket = aws_s3_bucket.images_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ECR Repository for Docker images
resource "aws_ecr_repository" "app_repository" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "AppRepository"
    Environment = "Dev"
  }
}

# ECR Repository Policy for cross-account access (optional)
resource "aws_ecr_repository_policy" "app_repository_policy" {
  repository = aws_ecr_repository.app_repository.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPushPull"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:GetRepositoryPolicy",
          "ecr:ListImages",
          "ecr:DeleteRepository",
          "ecr:BatchDeleteImage",
          "ecr:SetRepositoryPolicy",
          "ecr:DeleteRepositoryPolicy"
        ]
      }
    ]
  })
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# ECR Lifecycle Policy to manage image retention
resource "aws_ecr_lifecycle_policy" "app_repository_lifecycle" {
  repository = aws_ecr_repository.app_repository.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 2 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 2
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# IAM Role for presigned URL Lambda function
resource "aws_iam_role" "lambda_presigned_url_role" {
  name = "lambda-presigned-url-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for presigned URL Lambda function
resource "aws_iam_policy" "lambda_presigned_url_policy" {
  name        = "lambda-presigned-url-policy"
  description = "Policy for Lambda to create S3 presigned URLs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.images_bucket.arn}/*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "lambda_presigned_url_policy_attachment" {
  role       = aws_iam_role.lambda_presigned_url_role.name
  policy_arn = aws_iam_policy.lambda_presigned_url_policy.arn
}

# Create a zip file for the presigned URL Lambda function
data "archive_file" "lambda_presigned_url_zip" {
  type        = "zip"
  output_path = "presigned_url_lambda.zip"
  source {
    content = templatefile("${path.module}/lambda_function.py", {
      bucket_name = var.bucket_name
    })
    filename = "lambda_function.py"
  }
}

# Lambda function for generating presigned URLs
resource "aws_lambda_function" "presigned_url_lambda" {
  filename      = data.archive_file.lambda_presigned_url_zip.output_path
  function_name = "s3-presigned-url-generator"
  role          = aws_iam_role.lambda_presigned_url_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30

  source_code_hash = data.archive_file.lambda_presigned_url_zip.output_base64sha256

  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.images_bucket.bucket
    }
  }

  tags = {
    Name        = "PresignedURLGenerator"
    Environment = "Dev"
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "api_gateway" {
  name          = "presigned-url-api"
  description   = "HTTP API Gateway"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["content-type", "authorization"]
    allow_methods = ["POST", "OPTIONS"]
    allow_origins = ["*"]
  }
}

# API Gateway Integration with presigned URL Lambda function
resource "aws_apigatewayv2_integration" "presigned_url_integration" {
  api_id = aws_apigatewayv2_api.api_gateway.id

  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.presigned_url_lambda.invoke_arn
}

# Presigned URL API Gateway Route
resource "aws_apigatewayv2_route" "presigned_url_route" {
  api_id    = aws_apigatewayv2_api.api_gateway.id
  route_key = "POST /upload-url"
  target    = "integrations/${aws_apigatewayv2_integration.presigned_url_integration.id}"
}

# Lambda Permission for API Gateway to invoke the Lambda function
resource "aws_lambda_permission" "presigned_url_lambda_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.presigned_url_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api_gateway.execution_arn}/*/*"
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "api_gateway_stage" {
  api_id      = aws_apigatewayv2_api.api_gateway.id
  name        = "v1"
  auto_deploy = true
}

# Dead letter queue
resource "aws_sqs_queue" "deadletter_queue" {
  name = "deadletter-queue"
}

# Request sqs queue
resource "aws_sqs_queue" "request_queue" {
  name                       = "request-queue"
  message_retention_seconds  = 1209600 # 14 days (max)
  visibility_timeout_seconds = 180     # 3 minutes

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.deadletter_queue.arn
    maxReceiveCount     = 4
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "request_queue_redrive_allow_policy" {
  queue_url = aws_sqs_queue.deadletter_queue.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue",
    sourceQueueArns   = [aws_sqs_queue.request_queue.arn]
  })
}

# IAM Role for report validation Lambda function
resource "aws_iam_role" "lambda_report_validation_role" {
  name = "lambda-report-validation-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for report validation Lambda function
resource "aws_iam_policy" "lambda_report_validation_policy" {
  name        = "lambda-report-validation-policy"
  description = "Policy for Lambda to validate reports and send to SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:HeadObject"
        ]
        Resource = "${aws_s3_bucket.images_bucket.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.request_queue.arn
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "lambda_report_validation_policy_attachment" {
  role       = aws_iam_role.lambda_report_validation_role.name
  policy_arn = aws_iam_policy.lambda_report_validation_policy.arn
}

# Create a zip file for the report validation Lambda function
data "archive_file" "lambda_report_validation_zip" {
  type        = "zip"
  output_path = "report_validation_lambda.zip"
  source {
    content  = file("${path.module}/report_validation_lambda.py")
    filename = "lambda_function.py"
  }
}

# Lambda function for validating damage reports
resource "aws_lambda_function" "report_validation_lambda" {
  filename      = data.archive_file.lambda_report_validation_zip.output_path
  function_name = "damage-report-validator"
  role          = aws_iam_role.lambda_report_validation_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.9"
  timeout       = 30

  source_code_hash = data.archive_file.lambda_report_validation_zip.output_base64sha256

  environment {
    variables = {
      BUCKET_NAME   = aws_s3_bucket.images_bucket.bucket
      SQS_QUEUE_URL = aws_sqs_queue.request_queue.url
    }
  }

  tags = {
    Name        = "DamageReportValidator"
    Environment = "Dev"
  }
}

# API Gateway Integration with report validation Lambda function
resource "aws_apigatewayv2_integration" "report_validation_integration" {
  api_id = aws_apigatewayv2_api.api_gateway.id

  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.report_validation_lambda.invoke_arn
}

# Report validation API Gateway Route
resource "aws_apigatewayv2_route" "report_validation_route" {
  api_id    = aws_apigatewayv2_api.api_gateway.id
  route_key = "POST /submit-report"
  target    = "integrations/${aws_apigatewayv2_integration.report_validation_integration.id}"
}

# Lambda Permission for API Gateway to invoke the report validation Lambda function
resource "aws_lambda_permission" "report_validation_lambda_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.report_validation_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api_gateway.execution_arn}/*/*"
}

# IAM Role for AWS Batch Service
resource "aws_iam_role" "aws_batch_service_role" {
  name = "aws-batch-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "batch.amazonaws.com"
        }
      }
    ]
  })
}

# Attach AWS Batch Service Role Policy
resource "aws_iam_role_policy_attachment" "aws_batch_service_role" {
  role       = aws_iam_role.aws_batch_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole"
}

# IAM Role for AWS Batch Execution (Fargate tasks)
resource "aws_iam_role" "aws_batch_execution_role" {
  name = "aws-batch-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Attach ECS Task Execution Role Policy
resource "aws_iam_role_policy_attachment" "aws_batch_execution_role" {
  role       = aws_iam_role.aws_batch_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for AWS Batch Task (application permissions)
resource "aws_iam_role" "aws_batch_task_role" {
  name = "aws-batch-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for Batch Task Role (S3 and SQS access)
resource "aws_iam_policy" "aws_batch_task_policy" {
  name        = "aws-batch-task-policy"
  description = "Policy for AWS Batch tasks to access S3 and SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.images_bucket.arn,
          "${aws_s3_bucket.images_bucket.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:SendMessage"
        ]
        Resource = [
          aws_sqs_queue.request_queue.arn,
          aws_sqs_queue.deadletter_queue.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Attach policy to task role
resource "aws_iam_role_policy_attachment" "aws_batch_task_policy_attachment" {
  role       = aws_iam_role.aws_batch_task_role.name
  policy_arn = aws_iam_policy.aws_batch_task_policy.arn
}

resource "aws_batch_compute_environment" "batch_fargate_compute_env" {
  name = "batch-fargate-compute-env"

  compute_resources {
    max_vcpus = 3

    security_group_ids = [
      aws_security_group.main_sg.id
    ]

    subnets = [
      aws_subnet.public_subnet.id
    ]

    type = "FARGATE"
  }

  service_role = aws_iam_role.aws_batch_service_role.arn
  type         = "MANAGED"
  depends_on   = [aws_iam_role_policy_attachment.aws_batch_service_role]
}

# AWS Batch Job Queue
resource "aws_batch_job_queue" "batch_job_queue" {
  name     = "damage-detection-job-queue"
  state    = "ENABLED"
  priority = 1

  compute_environment_order {
    order               = 1
    compute_environment = aws_batch_compute_environment.batch_fargate_compute_env.arn
  }

  tags = {
    Name        = "DamageDetectionJobQueue"
    Environment = "Dev"
  }
}

# AWS Batch Job Definition
resource "aws_batch_job_definition" "batch_job_definition" {
  name = "damage-detection-job-definition"
  type = "container"

  platform_capabilities = ["FARGATE"]

  container_properties = jsonencode({
    image = "${aws_ecr_repository.app_repository.repository_url}:${var.container_image_tag}"

    fargatePlatformConfiguration = {
      platformVersion = "LATEST"
    }

    networkConfiguration = {
      assignPublicIp = "ENABLED"
    }

    resourceRequirements = [
      {
        type  = "VCPU"
        value = tostring(var.batch_vcpu)
      },
      {
        type  = "MEMORY"
        value = tostring(var.batch_memory)
      }
    ]

    executionRoleArn = aws_iam_role.aws_batch_execution_role.arn
    jobRoleArn       = aws_iam_role.aws_batch_task_role.arn

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/aws/batch/damage-detection"
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    environment = concat(
      [
        {
          name  = "AWS_REGION"
          value = var.region
        },
        {
          name  = "BUCKET_NAME"
          value = aws_s3_bucket.images_bucket.bucket
        },
        {
          name  = "SQS_QUEUE_URL"
          value = aws_sqs_queue.request_queue.url
        },
        {
          name  = "SUPABASE_URL"
          value = var.supabase_url
        },
        {
          name  = "SUPABASE_KEY"
          value = var.supabase_key
        }
      ],
      var.batch_environment_variables
    )
  })

  retry_strategy {
    attempts = 3
  }

  timeout {
    attempt_duration_seconds = 3600
  }

  tags = {
    Name        = "DamageDetectionJobDefinition"
    Environment = "Dev"
  }
}

# CloudWatch Log Group for Batch Jobs
resource "aws_cloudwatch_log_group" "batch_log_group" {
  name              = "/aws/batch/damage-detection"
  retention_in_days = 14

  tags = {
    Name        = "BatchLogGroup"
    Environment = "Dev"
  }
}

# IAM Role for batch monitor Lambda function
resource "aws_iam_role" "lambda_batch_monitor_role" {
  name = "lambda-batch-monitor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for batch monitor Lambda function
resource "aws_iam_policy" "lambda_batch_monitor_policy" {
  name        = "lambda-batch-monitor-policy"
  description = "Policy for Lambda to monitor SQS and trigger Batch jobs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:GetQueueAttributes",
          "sqs:ReceiveMessage"
        ]
        Resource = aws_sqs_queue.request_queue.arn
      },
      {
        Effect = "Allow"
        Action = [
          "batch:SubmitJob"
        ]
        Resource = [
          aws_batch_job_queue.batch_job_queue.arn,
          aws_batch_job_definition.batch_job_definition.arn,
          replace(aws_batch_job_definition.batch_job_definition.arn, ":[0-9]+$", ":*")
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "batch:DescribeJobs",
          "batch:ListJobs",
          "batch:SubmitJob"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "lambda_batch_monitor_policy_attachment" {
  role       = aws_iam_role.lambda_batch_monitor_role.name
  policy_arn = aws_iam_policy.lambda_batch_monitor_policy.arn
}

# Create a zip file for the batch monitor Lambda function
data "archive_file" "lambda_batch_monitor_zip" {
  type        = "zip"
  output_path = "batch_monitor_lambda.zip"
  source {
    content  = file("${path.module}/batch_monitor.py")
    filename = "lambda_function.py"
  }
}

# Lambda function for monitoring SQS and triggering Batch jobs
resource "aws_lambda_function" "batch_monitor_lambda" {
  filename      = data.archive_file.lambda_batch_monitor_zip.output_path
  function_name = "batch-monitor"
  role          = aws_iam_role.lambda_batch_monitor_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 60

  source_code_hash = data.archive_file.lambda_batch_monitor_zip.output_base64sha256

  environment {
    variables = {
      SQS_QUEUE_URL      = aws_sqs_queue.request_queue.url
      BATCH_JOB_QUEUE    = aws_batch_job_queue.batch_job_queue.name
      BATCH_JOB_DEF      = aws_batch_job_definition.batch_job_definition.name
    }
  }

  tags = {
    Name        = "BatchMonitor"
    Environment = "Dev"
  }
}

# CloudWatch Event Rule to trigger Lambda every 10 minutes
resource "aws_cloudwatch_event_rule" "batch_monitor_schedule" {
  name                = "batch-monitor-schedule"
  description         = "Trigger batch monitor Lambda every 30 minutes"
  schedule_expression = "rate(30 minutes)"

  tags = {
    Name        = "BatchMonitorSchedule"
    Environment = "Dev"
  }
}

# CloudWatch Event Target to invoke Lambda function
resource "aws_cloudwatch_event_target" "batch_monitor_target" {
  rule      = aws_cloudwatch_event_rule.batch_monitor_schedule.name
  target_id = "BatchMonitorTarget"
  arn       = aws_lambda_function.batch_monitor_lambda.arn
}

# Lambda Permission for CloudWatch Events to invoke the Lambda function
resource "aws_lambda_permission" "batch_monitor_lambda_permission" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.batch_monitor_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.batch_monitor_schedule.arn
}

