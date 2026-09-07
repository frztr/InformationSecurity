# InformationSecurity

Веб-приложение на ASP.NET Core, которое фоновым воркером непрерывно генерирует **16384-битные** вероятностно простые числа (тест Миллера–Рабина) и публикует их в **Kafka** или в **консоль** по мере нахождения. Несколько потоков ищут независимо и не отменяют друг друга. Нагрузка на процессор ограничена, чтобы не мешать другим сервисам. Настройки читаются из YAML.

## Архитектура

Код разделён по слоям в стиле DDD:

| Проект | Назначение |
| --- | --- |
| `PrimeNumberGenerator.Domain` | Модель предметной области: длина в битах, простое число, генерация кандидатов, пробное деление, тест Миллера–Рабина |
| `PrimeNumberGenerator.Application` | Сценарий «сгенерировать и опубликовать», настройки, порты публикации |
| `PrimeNumberGenerator.Infrastructure` | Kafka, консоль, чтение опций, регистрация зависимостей |
| `PrimeNumberGenerator.Api` | Хост процесса: фоновый воркер и проверка живости `/health` |

## Требования

- .NET 8 SDK
- Docker и Docker Compose — для локальных Kafka, Kafka UI и запуска приложения в контейнере

## Локальный запуск

Полный стек (приложение + Kafka + Kafka UI):

```bash
docker compose up --build
```

Только Kafka и Kafka UI, если приложение запускаете с хоста:

```bash
docker compose up -d kafka kafka-ui
dotnet run --project src/PrimeNumberGenerator.Api
```

После старта:

- Проверка живости: http://localhost:5080/health
- [Kafka UI](http://localhost:8081): http://localhost:8081
- Kafka для приложения с хоста: `localhost:9094`
- Kafka из Docker-сети: `kafka:9092`

Остановка: `docker compose down`.

В `Development` приложение читает `appsettings.Development.yml`: битовая длина **64** (чтобы не ждать генерацию 16384-битного числа) и публикация в **Kafka**.

Чтобы включить требование задания (16384 бита), задайте в YAML:

```yaml
PrimeNumberGeneration:
  BitLength: 16384
  ParallelSearchWorkerCount: 0
```

`ParallelSearchWorkerCount: 0` означает автоматический подбор числа **независимых** потоков: каждый сам ищет и сразу публикует найденное число, соседей не останавливает. По умолчанию одно ядро остаётся свободным для ОС и других сервисов.

Можно запустить несколько экземпляров приложения на один топик Kafka: брокер сам соберёт сообщения с разных `ClientId`.

Генерация 16384-битного числа всё ещё дороже, чем для коротких ключей, но пробное деление идёт через инкрементные остатки, поэтому поиск обычно занимает секунды или несколько минут, а не десятки минут.

## Как не забить процессор

Свободное ядро оставляем **в приложении**, а не вторым лимитом Docker.

```yaml
PrimeNumberGeneration:
  ParallelSearchWorkerCount: 0   # 0 = число независимых поисков: логические CPU минус ReservedIdleProcessorCount
  ReservedIdleProcessorCount: 1  # одно ядро не трогаем
  MaxProcessorUtilizationPercent: 100  # без пауз на занятых ядрах
  WorkerThreadPriority: BelowNormal
```

На i7-7700 (4 ядра / 8 потоков) это **7 воркеров** и одно свободное логическое ядро.

`deploy.resources.limits.cpus` и `DOTNET_PROCESSOR_COUNT` вместе использовать не нужно:

| Механизм | Что делает |
| --- | --- |
| `ReservedIdleProcessorCount` | Сколько воркеров запустить. Видит реальные CPU хоста (или контейнера). |
| `limits.cpus` | Жёсткая квота cgroup: ядро режет CPU контейнера, но `.NET` всё равно может видеть 8 ядер и плодить лишние потоки. |
| `DOTNET_PROCESSOR_COUNT` | Вручную подменяет `Environment.ProcessorCount`. Имеет смысл только если cgroup уже урезал CPU и вы хотите, чтобы .NET видел столько же ядер. |

Если задать `cpus: 2` и `DOTNET_PROCESSOR_COUNT=2` при `ReservedIdleProcessorCount: 1`, получится один воркер — как в прошлом запуске.

На VPS с **одним CPU**: резолвер никогда не опускает число воркеров ниже 1 (`max(1, 1 − 1) = 1`). Резерв ядра фактически не срабатывает — иначе процесс остановился бы. Один поток будет грузить единственное ядро; `BelowNormal` всё ещё позволяет системе вытеснять его.

В `docker-compose` CPU-квоты нет, только лимит памяти.

## Куда отправлять числа

В `src/PrimeNumberGenerator.Api/appsettings.yml` или `appsettings.Development.yml`:

```yaml
Publishing:
  Destination: Console   # или Kafka
```

- `Console` — число пишется в лог приложения
- `Kafka` — JSON-сообщение в топик `prime-numbers`; его можно смотреть в Kafka UI

YAML подключается пакетом `NetEscapades.Configuration.Yaml`.

## Docker-образ

Сборка локально:

```bash
docker build -t prime-number-generator:local .
docker run --rm -p 5080:8080 --memory=1g prime-number-generator:local
```

## CI/CD

GitHub Actions workflow: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

На каждый push и pull request запускаются тесты. После успешного прогона на push образ собирается и публикуется в Docker Hub:

`<DOCKERHUB_USERNAME>/prime-number-generator`

Нужные secrets репозитория:

| Secret | Назначение |
| --- | --- |
| `DOCKERHUB_USERNAME` | Имя пользователя Docker Hub |
| `DOCKERHUB_TOKEN` | Access Token Docker Hub с правом push |

Теги образа: `latest` (только default-ветка), `sha-<commit>`, имя ветки.

## Тесты

```bash
dotnet test
```

Тесты генерации используют короткие числа (8 и 16 бит), а не 16384 бита. Независимые поиски проверяются на уровне прикладного сервиса.

## Полезные настройки

| Ключ | Смысл |
| --- | --- |
| `PrimeNumberGeneration:BitLength` | Длина генерируемого числа в битах |
| `PrimeNumberGeneration:MillerRabinWitnessRoundCount` | Число раундов Миллера–Рабина |
| `PrimeNumberGeneration:TrialDivisionPrimeCount` | Сколько малых простых использовать для пробного деления |
| `PrimeNumberGeneration:PauseBetweenGenerations` | Пауза в потоке после своей публикации; `00:00:00` — сразу следующий поиск |
| `PrimeNumberGeneration:ParallelSearchWorkerCount` | Число независимых потоков поиска; `0` — подобрать автоматически |
| `PrimeNumberGeneration:ReservedIdleProcessorCount` | Сколько ядер оставить свободными при автоматическом подборе |
| `PrimeNumberGeneration:MaxProcessorUtilizationPercent` | Целевая загрузка каждого потока поиска (1–100) |
| `PrimeNumberGeneration:WorkerThreadPriority` | `Lowest`, `BelowNormal` или `Normal` |
| `Publishing:Destination` | `Console` или `Kafka` |
| `Kafka:BootstrapServers` | Адрес брокера (`localhost:9094` с хоста, `kafka:9092` из Docker) |
| `Kafka:Topic` | Топик для публикации |
