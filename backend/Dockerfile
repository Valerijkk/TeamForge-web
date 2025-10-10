# ===== Backend (Flask/Socket.IO) =====
FROM python:3.11-slim

# системные утилиты: build-essential для сборки некоторых колёс, curl для healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ожидаем requirements.txt в корне контекста ./backend
COPY requirements.txt ./requirements.txt

# ставим зависимости (если файла нет — не падаем, но ниже всё равно дотащим базовые пакеты)
RUN if [ -f requirements.txt ]; then \
      pip install --no-cache-dir -r requirements.txt ; \
    fi

# гарантируем рантайм-зависимости под сокеты/прод-сервер
RUN pip install --no-cache-dir gunicorn eventlet flask-cors || true

# кладём исходники внутрь /app/backend
COPY . ./backend

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
# по умолчанию считаем точкой входа backend/app.py с переменной app
ENV APP_MODULE=backend.app:app
ENV PORT=5000

EXPOSE 5000

# eventlet — чтобы Socket.IO/WebSocket работали корректно за gunicorn
CMD ["sh", "-c", "gunicorn -k eventlet -w 1 ${APP_MODULE} -b 0.0.0.0:${PORT} --timeout 120"]
