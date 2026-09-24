# Build from the repo root:  docker build -f backend/Dockerfile -t scalesaathi .
# Docker (not Render's plain Python runtime) because WeasyPrint needs Pango.
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libffi-dev shared-mime-info fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY . .
# P4's dependencies (jinja2, weasyprint, docxtpl, qrcode...) if they provide them
RUN if [ -f reports/requirements.txt ]; then pip install --no-cache-dir -r reports/requirements.txt; fi
ENV PYTHONUNBUFFERED=1
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
