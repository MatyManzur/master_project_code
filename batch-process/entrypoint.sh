#!/bin/bash
bentoml serve . --host 0.0.0.0 --port 3000 &
until curl -sf http://localhost:3000/readyz > /dev/null; do
    sleep 1
done
python main.py