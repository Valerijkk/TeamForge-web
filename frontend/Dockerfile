# ===== Stage 1: build React =====
FROM node:20-alpine AS builder
WORKDIR /app

# CRA читает переменные вида REACT_APP_* на этапе сборки
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== Stage 2: serve with nginx =====
FROM nginx:alpine

# SPA-fallback, gzip и т.п.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
