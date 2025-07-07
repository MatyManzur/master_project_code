# Check if .venv exists, if not, create it
if (-not (Test-Path ".venv")) {
    python -m venv .venv
}

# Activate the virtual environment
& .\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Deactivate the virtual environment
deactivate