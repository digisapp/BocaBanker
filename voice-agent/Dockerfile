FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Run as a non-root user
RUN useradd --create-home --uid 10001 appuser
WORKDIR /home/appuser/app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=appuser:appuser agent.py leads.py prompt.py ./
USER appuser

# Pre-download model files (noise cancellation, VAD) so calls start fast
RUN python agent.py download-files

CMD ["python", "agent.py", "start"]
