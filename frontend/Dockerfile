# Используем официальный образ Node.js
FROM node:16

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json (и package-lock.json, если есть)
COPY package.json ./
# Если используется package-lock.json, раскомментируйте следующую строку:
# COPY package-lock.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Открываем порт 3000
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
