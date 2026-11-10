# lab-bug-reporter

Self-hosted сервис баг-репортов для сайтов лаборатории. Сайт подключает небольшой скрипт, и у вошедших пользователей
появляется кнопка «Get help». В ней можно описать проблему, снять скриншот или записать экран с голосом. Скрипт сам
прикладывает последние записи console, сетевые запросы и данные об окружении. Все данные остаются на нашей инфраструктуре.

| Документ | О чём |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Как устроена система, данные, API, настройки, структура папок |
| [docs/roadmap.md](docs/roadmap.md) | Что готово и что осталось |
| [AGENTS.md](AGENTS.md) | Правила для AI-агентов и соглашения по коду |

## Что нужно

- Docker
- JDK 21 и Maven (или IntelliJ IDEA)
- Node.js и npm

## Запуск локально

**1. Настройки и инфраструктура.** Из корня репозитория:

```bash
cp .env.example .env     # заполните значения; ключи S3 должны совпадать с infra/seaweedfs/s3.json
docker compose up -d
```

Поднимутся Postgres (5432), SeaweedFS S3 (8333) и Keycloak (8081). При первом старте Keycloak импортирует dev-realm
из `infra/keycloak/`. Если Keycloak уже запускался без него, выполните `docker compose restart keycloak`.

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

**4. Демо-сайт.** Из корня репозитория:

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
`localhost:8080`, поэтому сервер должен быть запущен. Список отчётов пока на моковых данных.

Пользователи dev-realm, пароли только для разработки:

| Логин и пароль | Роль | Видит проекты |
|---|---|---|
| `admin` / `admin` | admin | все |
| `triager` / `triager` | triager | `demo` |
| `viewer` / `viewer` | viewer | `demo` |

## Как проверить

Нажмите вход на демо-сайте, затем кнопку помощи, и отправьте отчёт. Подставьте значения из `.env`:

```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "select id, title, status from reports"
```

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

Раздача `sdk.js` с сервера пока не сделана, см. [docs/roadmap.md](docs/roadmap.md).

## Тесты

```bash
cd server
mvn test
```

Для тестов нужны запущенные Postgres и SeaweedFS.
