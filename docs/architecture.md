# Архитектура

Описано текущее состояние кода. Что ещё не сделано, смотрите в [roadmap.md](roadmap.md).

## Общая схема

Проект состоит из SDK внутри каждого сайта и одного сервиса, который делает всё остальное. Внутри сервиса модули
одного процесса, а не микросервисы.

```mermaid
flowchart LR
    site["Сайт лаборатории<br/>SDK и виджет"] -->|Submit, multipart| ingest
    team["Dashboard<br/>в браузере команды"] -->|Bearer-токен| api
    team -->|вход, OIDC + PKCE| kc[Keycloak]
    api -->|ключи подписи| kc

    subgraph service[Сервис на Spring Boot]
        ingest[Ingest API]
        api[Dashboard API]
        registry[ProjectRegistry]
    end

    file[(Файл проектов YAML)] -->|при старте| registry
    ingest --> registry
    ingest --> db[(PostgreSQL<br/>отчёты и сведения о файлах)]
    ingest --> s3[(SeaweedFS S3<br/>видео, скриншоты, контекст)]
    api --> registry
    api --> db
    api --> s3
```

## Где какие данные

| Данные | Хранилище | Класс или объект |
|---|---|---|
| Заголовок, тип, статус, URL, пользователь, окружение, метаданные сайта, счётчики ошибок console и упавших запросов | Postgres, `reports` | `Report` |
| Тип файла, размер, длительность, время старта записи, путь в S3 | Postgres, `attachments` | `Attachment` |
| Скриншоты, видео | S3, `<project>/<report-id>/<attachment-id>` | `ObjectStorage` |
| Console, network, действия пользователя | S3, `<project>/<report-id>/context.json.gz` | `ObjectStorage` |
| Проекты | YAML-файл, при старте копируются в память | `ProjectRegistry` |

Проекты намеренно не в базе (ТЗ, разделы 6 и 12): чтобы добавить сайт, правят файл и перезапускают сервис.

Личность пользователя присылает сайт, сервер хранит её как есть и считает непроверенной.

Счётчики `console_error_count` и `failed_request_count` сервер считает из контекста при приёме (`ContextCounts`):
список отчётов показывает их бейджами и не читает для этого S3. Упавший запрос это статус 4xx/5xx или запрос без
статуса, который не помечен `pending`.

## Вход в dashboard и роли

Dashboard входит через Keycloak (realm `lab-bug-reporter`, публичный клиент `lab-dashboard`, Authorization Code + PKCE)
и шлёт access-токен в заголовке `Authorization: Bearer`. Сервер проверяет подпись, срок, issuer и audience
(`lab-bug-reporter-api`, его добавляет mapper клиента). Сессий и cookie нет, поэтому CSRF выключен.

`TokenUserConverter` читает роли realm из `realm_access.roles` и превращает токен в `CurrentUser`:

| Роль dashboard | Роли Keycloak по умолчанию | Что может |
|---|---|---|
| `admin` | `admin` | Видит все проекты, меняет статус, удаляет отчёты |
| `triager` | `triager` | Видит свои проекты, меняет статус |
| `viewer` | `viewer` | Только читает свои проекты |

Какой проект виден пользователю, решает `ProjectAccessService`: admin видит все, остальные только те, в поле `access`
которых есть одна из их ролей Keycloak. Проект без `access` виден только admin.

Правила в `SecurityConfig`:

| Запрос | Кому разрешён |
|---|---|
| `/api/v1/ingest/**` | всем, защищён ключом проекта и `Origin` |
| `PATCH /api/v1/reports/**` | triager, admin |
| `DELETE /api/v1/reports/**` | admin |
| остальное под `/api/**` | любая роль dashboard |
| всё вне `/api` | всем: `sdk.js` и статика dashboard |

Без токена или с плохим токеном ответ 401, без нужной роли 403, оба в общем JSON-формате ошибок
(`JsonSecurityErrorHandler`). Отчёт из невидимого проекта отдаёт 404: это проверяет `ReportService`, роль проверяется
раньше, поэтому viewer получает 403 на `PATCH` даже для чужого отчёта.

## Как проходит отправка отчёта

1. `IngestCorsFilter` берёт ключ проекта из URL. Для разрешённого `Origin` добавляет CORS-заголовок и сам отвечает
   на preflight.
2. `IngestController` принимает multipart и через `@Valid` проверяет `ReportPayload`.
3. `IngestService` выполняет основную работу:

| Шаг | Ошибка |
|---|---|
| Найти проект по ключу | 404 |
| Проверить `Origin` | 403 |
| Проверить количество, размер и тип файлов (`IngestLimitsValidator`) | 413 или 400 |
| Проверить, что контекст это JSON, и сжать его в gzip | 400, либо 413 при превышении лимита |
| Сгенерировать `UUID` отчёта, он нужен для путей в S3 | |
| Загрузить контекст и файлы в S3 | 503 |
| Сохранить `Report` вместе с `Attachment` | 500 |
| Вернуть `{ "reportId": "..." }` со статусом 201 | |

Сначала выполняется запись в S3, затем в базу, поэтому отчёта без файлов в базе не будет. Если шаг падает,
уже загруженные объекты удаляются.

`Report` реализует `Persistable`, потому что id задаётся вручную. Запись считается новой, пока `createdAt` пуст:
это поле заполняет JPA Auditing при сохранении.

## API

Полное описание генерируется из кода (springdoc): `GET /v3/api-docs` в формате OpenAPI 3 и Swagger UI на
`/swagger-ui/index.html`. Оба доступны без токена, отключаются через `API_DOCS_ENABLED=false`. Ниже главное.

### Отправка отчёта

`POST /api/v1/ingest/{projectKey}/reports`, тип `multipart/form-data`. Заголовок `Origin` обязателен.

| Часть | Обязательна | Содержимое |
|---|---|---|
| `report` | да | JSON, см. ниже |
| `context` | да | JSON-файл: `{ console, network, breadcrumbs }` |
| `screenshots` | нет | Изображения, до 5 штук |
| `video` | нет | Видео |

```json
{
  "type": "bug",
  "title": "Кнопка загрузки не работает",
  "description": "Выбираю файл, ничего не происходит",
  "pageUrl": "http://localhost:5500/demo/",
  "reporter": { "id": "u-1842", "email": "alice@lab.example" },
  "environment": { "browser": "Chrome 141" },
  "hostMetadata": { "app_version": "2.14.1" },
  "videoDurationMs": 5524,
  "recordingStartTime": 1730801640120
}
```

`type` принимает `bug`, `feature` или `question`. В `reporter` нужен `id` или `email`, иначе ответ 400.

### Ошибки

У всех ошибок один формат:

```json
{ "status": 413, "error": "Content Too Large", "message": "A video can be at most 200 MB" }
```

| Код | Когда |
|---|---|
| 400 | Некорректные данные или нет пользователя |
| 403 | `Origin` не разрешён для проекта |
| 404 | Неизвестный ключ проекта, или отчёт не найден либо не виден пользователю |
| 413 | Превышен лимит |
| 416 | `Range` вне файла |
| 503 | S3 недоступен |

### Текущий пользователь

`GET /api/v1/me`, нужен Bearer-токен с ролью dashboard.

```json
{
  "id": "5b0c…",
  "username": "triager",
  "email": "triager@lab.example",
  "roles": ["triager"],
  "projects": [{ "slug": "demo", "name": "Demo website" }]
}
```

Роли идут от сильной к слабой. Ключи проектов в ответ не попадают.

| Код | Когда |
|---|---|
| 401 | Нет токена, токен просрочен или не прошёл проверку |
| 403 | В токене нет ни одной роли dashboard |

### Отчёты для dashboard

Все запросы с Bearer-токеном. Отчёт или файл из проекта, который пользователю не виден, отдаёт 404.

| Запрос | Кто | Ответ |
|---|---|---|
| `GET /api/v1/reports` | любая роль | Страница `ReportSummaryResponse` |
| `GET /api/v1/reports/{id}` | любая роль | `ReportDetailResponse` |
| `GET /api/v1/reports/{id}/context` | любая роль | JSON `{ console, network, breadcrumbs }` в том виде, как его прислал SDK |
| `GET /api/v1/reports/{id}/attachments/{attachmentId}` | любая роль | Файл, поддерживает `Range` |
| `PATCH /api/v1/reports/{id}` | triager, admin | `{ "status": "resolved" }`, в ответ `ReportDetailResponse` |
| `DELETE /api/v1/reports/{id}` | admin | 204, удаляет запись, затем файлы и контекст в S3 |

Параметры списка: `project` (slug), `status` (`new`, `in_progress`, `resolved`, `wont_fix`), `type` (`bug`, `feature`,
`question`), `q` (поиск без учёта регистра по заголовку и описанию), `page` (с 0) и `size` (по умолчанию 20, не больше
100). Сортировка всегда от новых к старым. Без `project` ищется во всех видимых проектах.

```json
{
  "content": [{
    "id": "5b0c…", "projectSlug": "demo", "projectName": "Demo website",
    "type": "bug", "title": "Кнопка загрузки не работает", "status": "new",
    "pageUrl": "http://localhost:5500/demo/", "reporter": { "id": "u-1842", "email": "alice@lab.example" },
    "hasVideo": true, "screenshotCount": 1, "consoleErrorCount": 2, "failedRequestCount": 1,
    "createdAt": "2026-11-10T09:00:00Z"
  }],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```

Карточка добавляет `description`, `environment`, `hostMetadata`, `attachments` (`id`, `kind`, `contentType`,
`sizeBytes`, `durationMs`, `recordingStartTime`), `recordingStartTime` видео и `updatedAt`.

Файл отдаётся целиком или по одному диапазону из `Range` (206 с `Content-Range`). Диапазон вне файла отдаёт 416.
Файлы присылают пользователи сайтов, поэтому ответ идёт с `Content-Security-Policy: sandbox`: загруженный SVG не
выполнит скрипт на origin dashboard. `<img>` и `<video>` не умеют слать токен, поэтому dashboard скачивает файл через
API-клиент и показывает его по blob-URL.

## Лимиты

| Что | Значение | Настройка |
|---|---|---|
| Длительность видео | 300 с (плюс запас 5 с) | `MAX_VIDEO_SECONDS` |
| Размер видео | 200 МБ | `MAX_VIDEO_MB` |
| Скриншот | 10 МБ, до 5 штук | `app.ingest` в `application.yaml` |
| Контекст после сжатия | 5 МБ | `MAX_CONTEXT_MB` |

`spring.servlet.multipart.max-file-size` тоже равен 200 МБ. Если поднимаете `MAX_VIDEO_MB`, меняйте и его.

## Настройки сервера

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `PORT` | `8080` | Порт сервиса |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/${POSTGRES_DB}` | JDBC-адрес базы |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | нет | Имя базы, логин и пароль |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY` | нет | Доступ к S3 |
| `S3_ENDPOINT` | `http://localhost:8333` | Адрес S3 |
| `S3_BUCKET` | `reports` | Бакет, создаётся при старте |
| `S3_REGION` | `us-east-1` | Регион |
| `S3_FORCE_PATH_STYLE` | `true` | Нужен для SeaweedFS |
| `PROJECTS_FILE` | `classpath:projects-dev.yaml` | Файл проектов. Путь на диске указывается с префиксом `file:` |
| `OIDC_ISSUER` | `http://localhost:8081/realms/lab-bug-reporter` | Issuer токенов, должен совпадать с `iss` |
| `OIDC_JWK_SET_URI` | `${OIDC_ISSUER}/protocol/openid-connect/certs` | Откуда брать ключи подписи. Отдельно, чтобы в Docker ходить к Keycloak по внутреннему адресу |
| `OIDC_AUDIENCE` | `lab-bug-reporter-api` | Обязательное значение в `aud` |
| `OIDC_CLIENT_ID` | `lab-dashboard` | Клиент Keycloak, через который входит dashboard |
| `API_DOCS_ENABLED` | `true` | Отдавать `/v3/api-docs` и Swagger UI |
| `ADMIN_ROLES`, `TRIAGER_ROLES`, `VIEWER_ROLES` | `admin`, `triager`, `viewer` | Роли Keycloak для каждой роли dashboard, через запятую |

Адрес Keycloak dashboard не зашивает при сборке. Перед входом он запрашивает публичный
`GET /api/v1/dashboard-config` и получает `{ keycloakUrl, keycloakRealm, keycloakClientId }`: сервер берёт их из
`OIDC_ISSUER` и `OIDC_CLIENT_ID`. Поэтому один образ работает на любом адресе, а адрес задаётся в одном месте.
Самому серверу публичный адрес не нужен: dashboard, API и `sdk.js` отдаются с одного origin по относительным путям.
`PUBLIC_BASE_URL` из ТЗ задаётся в `.env` для Compose: из него берутся redirect URI клиента Keycloak и адрес, на который
демо-сайт отправляет отчёты.

В dev-режиме Vite проксирует `/api` на `API_PROXY_TARGET` (`http://localhost:8080`), поэтому dashboard и API работают
с одного origin, как в контейнере. `VITE_API_BASE_URL` (`/api/v1`) меняет базовый путь API.

### Docker Compose

| Сервис | Порт | Что делает |
|---|---|---|
| `server` | 8080 | Образ из `Dockerfile`: собирает SDK, dashboard и сервер, отдаёт всё на одном порту |
| `postgres` | 5432 | База отчётов |
| `seaweedfs` | 8333 | S3 для файлов и контекста, сервер ждёт его `/healthz` |
| `keycloak` | 8081 | Вход команды, dev-realm из `infra/keycloak/` |
| `demo` | 5500 | nginx с `demo/`, `sdk.js` берёт у `server`, плюс тестовые адреса сайта (`infra/demo/`) |

Внутри сети Compose сервер ходит к базе, S3 и ключам Keycloak по именам сервисов. Issuer токенов остаётся публичным
адресом Keycloak: его задают `KEYCLOAK_PUBLIC_URL` в `.env` (по умолчанию `http://localhost:8081`), из него же
собирается `OIDC_ISSUER`. Порты Postgres и SeaweedFS открыты наружу для `mvn test` и запуска сервера из IDE.

У демо-сайта свой маленький бэкенд в nginx, его адреса ломаются нарочно (ТЗ, раздел 13):

| Адрес | Что делает |
|---|---|
| `/demo-api/server-error` | Отвечает 500 |
| `/demo-api/hang` | Не отвечает 10 минут (njs), запрос попадает в отчёт как зависший |
| `/demo-api/profile` | Отвечает 200, страница зовёт его с `Authorization`, чтобы показать маскировку |
| `/demo/config.js` | Адрес сервиса из `PUBLIC_BASE_URL`, на него страница отправляет отчёты |

### На сервере

`docker-compose.prod.yaml` накладывается поверх основного файла:

```bash
docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d --build
```

| Что меняет | Зачем |
|---|---|
| У Postgres и SeaweedFS нет портов на хосте | Снаружи до них не достучаться |
| `server`, `keycloak` и `demo` слушают только `127.0.0.1` | TLS снимает nginx хоста перед ними |
| Keycloak в режиме `start`, данные в базе `keycloak` того же Postgres | Realm, пользователи и сессии переживают перезапуск |
| `KC_PROXY_HEADERS=xforwarded`, локальный кэш | За nginx и на одном узле |
| Ограничения памяти: Keycloak 1 ГБ, сервер 768 МБ, Postgres и SeaweedFS по 256 МБ, demo 64 МБ | Весь стек укладывается примерно в 2,5 ГБ |
| Файл проектов `./projects.yaml` | Свой файл сервера с настоящими origin, не в git |

В `.env` на сервере обязательны `KEYCLOAK_PUBLIC_URL` и `PUBLIC_BASE_URL`, без них Compose не запустится. Базу
`keycloak` создаёт `infra/postgres/init/` только при первом создании тома Postgres. Realm импортируется один раз, когда
его ещё нет в базе, поэтому после смены `PUBLIC_BASE_URL` redirect URI правятся в консоли Keycloak. Нужен Docker
Compose 2.24 или новее (теги `!reset` и `!override`). Пользователи dev-realm с простыми паролями годятся только для
демо.

Запись в файле проектов:

```yaml
projects:
  - slug: datasets
    name: Datasets portal
    key: pk_datasets_3f9a                                # публичный, вставляется в HTML сайта
    allowed_origins: ["https://datasets.lab.example"]
    access: [team-datasets]                              # роли Keycloak, которым виден проект
```

## Структура репозитория

```text
server/src/main/java/com/alimberdi/server/
  ingest/      приём отчётов: контроллер, сервис, CORS-фильтр, лимиты
  report/      сущности Report и Attachment, DTO, репозиторий, API отчётов для dashboard
  project/     Project, ProjectRegistry и доступ к проектам
  security/    проверка токенов Keycloak, роли, CurrentUser
  user/        GET /api/v1/me
  dashboard/   GET /api/v1/dashboard-config, настройки входа для dashboard
  storage/     клиент S3 и ObjectStorage
  exception/   исключения и единый формат ошибок
  config/      JPA Auditing, разбор status/type в параметрах запроса, OpenAPI
server/src/main/resources/
  application.yaml      настройки
  projects-dev.yaml     проекты для разработки, ключи не для продакшена
  db/migration/         миграции Flyway

sdk/src/
  index.ts              публичный API: init, identify, submitReport и другие
  core/                 буферы, перехват console и network, окружение, маскировка
  core/capture/         скриншот и запись экрана
  widget/               кнопка и боковая панель в Shadow DOM

dashboard/src/
  auth/                 вход через Keycloak и текущий пользователь
  api/                  единый API-клиент и типы ответов сервера
  hooks/                загрузка списка, отчёта и файлов
  components/           список и карточка отчёта, skeleton-заглушки
demo/                   демо-сайт index.html и галерея компонентов gallery.html
infra/seaweedfs/        ключи S3 для разработки
infra/keycloak/         dev-realm, импортируется при первом старте Keycloak
infra/demo/             nginx демо-сайта: конфиг, шаблон с тестовыми адресами, njs
infra/postgres/init/    создание базы Keycloak для docker-compose.prod.yaml
Dockerfile              образ сервиса: SDK, dashboard и сервер
docker-compose.yaml     весь стенд для разработки
docker-compose.prod.yaml  поправки для сервера поверх основного файла
docs/                   документация
```
