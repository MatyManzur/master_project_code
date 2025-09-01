variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "S3 bucket name"
  type        = string
}

variable "ecr_repository_name" {
  description = "ECR repository name"
  type        = string
  default     = "damage-detection-app"
}

variable "container_image_tag" {
  description = "Container image tag to use in AWS Batch"
  type        = string
  default     = "latest"
}

variable "batch_vcpu" {
  description = "vCPUs for AWS Batch job"
  type        = number
  default     = 1
}

variable "batch_memory" {
  description = "Memory for AWS Batch job in MiB"
  type        = number
  default     = 2048
}

variable "batch_environment_variables" {
  description = "Additional environment variables for AWS Batch jobs"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "supabase_url" {
  description = "Supabase URL"
  type        = string
  default     = ""
}

variable "supabase_key" {
  description = "Supabase API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "prediction_url" {
  description = "Prediction service URL"
  type        = string
  default     = "http://localhost:3000/predict"
}

variable "score_threshold" {
  description = "Score threshold for object classification"
  type        = number
  default     = 0.38
}
