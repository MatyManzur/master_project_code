# Activate the virtual environment
& .\.venv\Scripts\Activate.ps1

# Run uvicorn with the specified app
uvicorn main:app --host 0.0.0.0 --port 8000

deactivate