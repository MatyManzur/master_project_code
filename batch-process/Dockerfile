FROM bentoml-pipeline:latest

USER root
COPY requirements.txt .
RUN python -m ensurepip --upgrade
RUN python -m pip install --no-cache-dir -r requirements.txt

RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY main.py .
#COPY .env .
COPY --chmod=755 entrypoint.sh .

USER bentoml

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

CMD ["bash", "./entrypoint.sh"]