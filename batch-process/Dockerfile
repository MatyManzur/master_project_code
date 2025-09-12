FROM bentoml-pipeline:latest

USER root
# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN python -m ensurepip --upgrade
RUN python -m pip install --no-cache-dir -r requirements.txt

RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY main.py .
#COPY .env .
COPY --chmod=755 entrypoint.sh .

USER bentoml

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Run the application
CMD ["bash", "./entrypoint.sh"]
#CMD ["bash"]