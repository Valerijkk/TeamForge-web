# Основные команды Docker

## Информация о Docker
docker version                        # Показать версии клиента и сервера
docker info                           # Системная информация о Docker

## Изображения (Images)
docker images                         # Список локальных образов
docker pull <repository[:tag]>        # Загрузить образ из Registry
docker build -t <name:tag> <path>     # Построить образ из Dockerfile
docker tag <source> <target>          # Переименовать/переметить образ
docker push <repository[:tag]>        # Отправить образ в Registry
docker save -o <file.tar> <image>     # Экспорт образа в файл
docker load -i <file.tar>             # Импорт образа из файла

## Контейнеры (Containers)
docker ps                              # Список запущенных контейнеров
docker ps -a                           # Список всех контейнеров (включая остановленные)
docker run -it --rm <image> <cmd>      # Запустить контейнер и войти в него, удалить после выхода
docker start <container>               # Запустить остановленный контейнер
docker stop <container>                # Остановить запущенный контейнер
docker restart <container>             # Перезапустить контейнер
docker rm <container>                  # Удалить контейнер
docker logs -f <container>             # Смотреть логи контейнера
docker exec -it <container> sh         # Открыть shell внутри запущенного контейнера
docker inspect <container>             # Подробная информация о контейнере
docker stats <container>               # Ресурсы контейнера в режиме реального времени

## Сетевые настройки (Network)
docker network ls                     # Список сетей
docker network inspect <network>      # Информация о сети
docker network rm <network>           # Удалить сеть

## Томa (Volumes)
docker volume ls                      # Список томов
docker volume inspect <volume>       # Информация о томе
docker volume rm <volume>            # Удалить том

## Очистка ресурсов (Cleanup)
docker system prune                  # Удалить все неиспользуемые данные (контейнеры, образы, сети, тома)
docker container prune               # Удалить все остановленные контейнеры
docker image prune                   # Удалить все неиспользуемые образы
docker volume prune                  # Удалить все неиспользуемые тома
docker network prune                 # Удалить все неиспользуемые сети

## Docker Compose
docker compose version               # Версия Docker Compose
docker compose up --build -d         # Сборка и запуск сервисов в фоновом режиме
docker compose down                  # Остановка и удаление контейнеров, сети, томов (по определению)
docker compose logs -f               # Логи всех сервисов
docker compose ps                    # Список сервисов
docker compose build                 # Сборка образов без запуска
docker compose exec <service> sh     # Открыть shell в контейнере сервиса

