terraform output ecr_repository_url
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ecr_repository_url>
docker tag batch_process:latest <ecr_repository_url>:latest
docker push <ecr_repository_url>:latest

aws batch submit-job \
  --job-name "damage-detection-test-$(date +%s)" \
  --job-queue "damage-detection-job-queue" \
  --job-definition "damage-detection-job-definition"

# deploy webapp to s3
set VITE_HOST and VITE_API_GATEWAY_URL in ../webapp/.env
run ./deploy_webapp.sh