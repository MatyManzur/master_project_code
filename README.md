# Master's Thesis Project Code Repository
Matías Manzur - FHTW 2025 - Software Engineering

This repository contains the code used across different phases of the construction of both the ML pipeline and the application for the Master's Thesis Project.

### Folder Structure
`pipeline-server/` contains the code for the containerized pipeline with BentoML
`terraform/` contains the IaC code to deploy the backend architecture to AWS
`batch-process/` contains the code of the batch process that is executed in AWS periodically to process the queued reports
`webapp/` contains the code for the app protoype
`supabase/` contains the schema definitions for the postgresql database
`analysis/` contains the code employed to perform the analysis of the pipeline's performance using the containerized pipeline with the test dataset

### Datasets
**Traffic Sign Detection Dataset**: https://universe.roboflow.com/matyworkspace/just-traffic-signs-45axx
**Damaged/Healthy Classification Dataset**: https://universe.roboflow.com/matyworkspace/traffic-signs-cl-damaged-train
**Pipeline Test Dataset**: https://universe.roboflow.com/matyworkspace/damagedhealthytrafficsigns

