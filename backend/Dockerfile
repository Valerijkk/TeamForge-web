# ===== Backend (Flask/Socket.IO) =====
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN if [ -f requirements.txt ]; then \
      pip install --no-cache-dir -r requirements.txt ; \
    fi

RUN pip install --no-cache-dir gunicorn eventlet flask-cors || true

COPY . ./backend

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV APP_MODULE='backend.app:create_app()'
ENV PORT=5000

EXPOSE 5000

CMD ["sh", "-c", "gunicorn -k eventlet -w 1 ${APP_MODULE} -b 0.0.0.0:${PORT} --timeout 120"]
