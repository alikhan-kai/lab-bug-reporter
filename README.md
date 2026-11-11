# lab-bug-reporter

Self-hosted сервис баг-репортов для сайтов лаборатории. Сайт подключает небольшой скрипт, и у вошедших пользователей
появляется кнопка «Get help». В ней можно описать проблему, снять скриншот или записать экран с голосом. Скрипт сам
прикладывает последние записи console, сетевые запросы и данные об окружении. Все данные остаются на нашей инфраструктуре.

| Документ | О чём |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Как устроена система, данные, API, настройки, структура папок |
| [docs/roadmap.md](docs/roadmap.md) | Что готово и что осталось |
| [AGENTS.md](AGENTS.md) | Правила для AI-агентов и соглашения по коду |

## Запуск одной командой

Нужен только Docker. Из корня репозитория:

```bash
cp .env.example .env     # заполните значения; ключи S3 должны совпадать с infra/seaweedfs/s3.json
docker compose up -d --build
```

Первая сборка образа занимает несколько минут. Когда `docker compose ps` покажет `server` как `healthy`, откройте:

| Адрес | Что там |
|---|---|
| `http://localhost:8080` | Dashboard, вход через Keycloak |
| `http://localhost:5500/demo/` | Демо-сайт с подключённым SDK |
| `http://localhost:8080/sdk.js` | Скрипт SDK, который подключают сайты |
| `http://localhost:8081` | Keycloak |
| `http://localhost:8080/swagger-ui/index.html` | Описание API (OpenAPI) |

Сервис `server` собирается из `Dockerfile`: один образ отдаёт API, `sdk.js` и dashboard на порту 8080. Рядом
поднимаются Postgres (5432), SeaweedFS S3 (8333), Keycloak (8081) и демо-сайт на nginx (5500). При первом старте
Keycloak импортирует dev-realm из `infra/keycloak/`. Если Keycloak уже запускался без него, выполните
`docker compose restart keycloak`.

После изменений в коде пересоберите сервис: `docker compose up -d --build server`.

## Запуск для разработки

Нужны Docker, JDK 21 и Maven (или IntelliJ IDEA), Node.js и npm. Так код меняется без пересборки образа.

**1. Инфраструктура.** Из корня репозитория:

```bash
docker compose up -d postgres seaweedfs keycloak
```

**2. Сервер.** Запустите `ServerApplication` в IDEA или выполните:

```bash
cd server
mvn spring-boot:run
```

Сервер работает на порту 8080, сам читает `.env`, применяет миграции и создаёт бакет.

**3. SDK.**

```bash
cd sdk
npm install
npm run build
```

**4. Демо-сайт.** Остановите контейнер `demo`, если он запущен (`docker compose stop demo`), и из корня
репозитория выполните:

```bash
npx serve -l 5500 .
```

Откройте `http://localhost:5500/demo/`. Через `file://` отправка не работает: разрешены только адреса из
`server/src/main/resources/projects-dev.yaml`.

**5. Dashboard.**

```bash
cd dashboard
npm install
npm run dev
```

Откроется `http://localhost:3000` и перенаправит на вход в Keycloak. Запросы к `/api` dev-сервер передаёт на сервер
`localhost:8080`, поэтому сервер должен быть запущен. По умолчанию список показывает новые отчёты, сначала свежие.

Пользователи dev-realm, пароли только для разработки:

| Логин и пароль | Роль | Видит проекты |
|---|---|---|
| `admin` / `admin` | admin | все |
| `triager` / `triager` | triager | `demo` |
| `viewer` / `viewer` | viewer | `demo` |

## Как проверить

Нажмите вход на демо-сайте, понажимайте кнопки сбоев (ошибка JS, ответ 500, зависший запрос, запрос с
`Authorization`), затем кнопку помощи, и отправьте отчёт. Он появится в dashboard. Записи в базе, подставьте значения
из `.env`:

```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "select id, title, status from reports"
```

## Деплой на сервер

```bash
cp .env.example .env                                     # пароли, ключи S3 и два адреса ниже
cp server/src/main/resources/projects-dev.yaml projects.yaml   # добавьте origin демо-сайта и своих сайтов
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d --build
```

В `.env` задайте `KEYCLOAK_PUBLIC_URL` и `PUBLIC_BASE_URL`, это адреса Keycloak и сервиса, которые видит браузер.
Сервис, Keycloak и демо-сайт слушают только `127.0.0.1:8080`, `:8081` и `:5500`; nginx хоста принимает HTTPS и
передаёт запросы им. Подробности в [docs/architecture.md](docs/architecture.md#на-сервере).

## Как добавить сайт

1. Добавьте проект в файл проектов (формат описан в [docs/architecture.md](docs/architecture.md)) и перезапустите сервер.
2. Подключите SDK как можно раньше в `<head>` сайта:

```html
<script src="https://reports.lab.example/sdk.js"></script>
<script>
  LabReporter.init({
    projectKey: "pk_datasets_3f9a",
    apiUrl: "https://reports.lab.example",
    appVersion: "2.14.1"
  });
  // Вызовите после входа пользователя: кнопка появится только после этого
  LabReporter.identify({ id: "u-1842", email: "alice@lab.example" });
</script>
```

В `projects-dev.yaml` разрешены адреса `localhost:3000` и `localhost:5500`. Файл проектов монтируется в контейнер
(`/app/config/projects.yaml`), поэтому для нового сайта достаточно поправить файл и выполнить `docker compose restart server`.

## Тесты

```bash
cd server
mvn test
```

Для тестов нужны запущенные Postgres и SeaweedFS.
