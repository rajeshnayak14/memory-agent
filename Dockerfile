# Backend-only image (the frontend is a separate static-site deploy).
# Works on Fly.io, Google Cloud Run, or any Docker-based host — Render's
# native Python runtime (see render.yaml) doesn't need this at all.
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

ENV PORT=8000
EXPOSE 8000

# Shell form (not exec form) so $PORT actually expands — Cloud Run in
# particular assigns this at runtime rather than a fixed value.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
