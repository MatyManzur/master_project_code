WEBAPP_BUCKET=$(terraform output -raw webapp_bucket_name)

aws s3 sync ../webapp/dist/ s3://$WEBAPP_BUCKET/ --delete

aws s3 cp s3://$WEBAPP_BUCKET/ s3://$WEBAPP_BUCKET/ --recursive --exclude "*" --include "*.html" --content-type "text/html"
aws s3 cp s3://$WEBAPP_BUCKET/ s3://$WEBAPP_BUCKET/ --recursive --exclude "*" --include "*.css" --content-type "text/css"
aws s3 cp s3://$WEBAPP_BUCKET/ s3://$WEBAPP_BUCKET/ --recursive --exclude "*" --include "*.js" --content-type "application/javascript"

CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*"

terraform output webapp_url