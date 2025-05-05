## 8. README\_DOCKER.md  (памятка)

````markdown
# Быстрый старт

```bash
docker compose up --build -d
````

* **Frontend** — [http://localhost:3000](http://localhost:3000)
* **Backend**  — [http://localhost:5000](http://localhost:5000)

## Полезные команды

| Что сделать              | Команда                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| Пересобрать только фронт | `docker compose build frontend && docker compose up -d frontend` |
| Логи бэка                | `docker compose logs -f backend`                                 |
| Остановить всё           | `docker compose down`                                            |

## Перенос образов вручную

```bash
# экспорт
docker save backend:latest | gzip > backend.tar.gz
# импорт
gunzip -c backend.tar.gz | docker load
```

## Пуш в Registry

```bash
docker tag backend ghcr.io/<user>/backend:1.0
docker push ghcr.io/<user>/backend:1.0
```
---

### Как всё это работает шаг за шагом

1. **`docker compose build`**  
   *Читает оба Dockerfile, строит два образа.*  
   Слои `COPY requirements.txt → RUN pip install` кешируются; изменение кода не заставит каждый раз ставить зависимости.

2. **`docker compose up`**  
   Запускает контейнеры, подключая их к одной внутренней сети.  
   Фронт видит API по `http://backend:5000`.

3. **Тома (volumes)**  
   Приложенные/загруженные файлы из `backend/uploads` не исчезнут при пересоздании контейнера.

4. **Health-checks**  
   Фронт не стартует, пока `/healthz` бэка не вернёт 200 → меньше «белых экранов».

5. **Перенос**  
   *Образ* (`docker save/load` или `docker push/pull`) ≠ *контейнер*.  
   Образ — это база; контейнер — запущенный экземпляр с изменяющимся FS.  
   Нужно сохранить данные? — используйте тома или `docker export/import`.

