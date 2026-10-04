# InformationSecurity Webapp

MVP системы защиты на Next.js (DDD, TypeScript): RSA-32768, «Кузнечик», Стрибог-512, 3FA, PDF с ЭЦП.

## Что внутри

| Средство | Где смотреть |
| --- | --- |
| RSA-32768 | `src/domain/cryptography/rsa` — модуль собирается из двух **16384-битных простых**, которые публикует образ `frztr/prime-number-generator` в Kafka (`prime-numbers`). Веб-приложение **не** ищет 32768-битные простые само. |
| Кузнечик | `src/domain/cryptography/gost/KuznyechikCipher.ts` (RFC 7801) |
| Стрибог-512 | `Streebog512Hasher.ts`, HMAC — `HmacStreebog512.ts` (RFC 2104 поверх ГОСТ Р 34.11-2012) |
| ЭЦП PDF | Стрибог-512 + RSA PKCS#1, `MessageService.exportMessageAsSignedPdf` |
| 3FA | пароль → OTP на почту → TOTP на HMAC-Стрибог-512 или код восстановления |
| Хэш паролей | Стрибог-512 (ГОСТ Р 34.11-2012), соль + пароль |
| Секреты | `config/secrets.yml` (отдельно от `config/appsettings.yml`) |

Роли: гость (только обзор), пользователь (шифрование, история, PDF), администратор (методы, все сообщения, создание пользователей).

## Запуск через Docker

В `docker-compose.yml` поднимаются PostgreSQL, **Mailu** (SMTP/IMAP, регистрация ящиков и веб-почта SnappyMail), **Kafka (KRaft)**, **Kafka UI**, **генератор простых** и веб-приложение.

```bash
docker compose up --build
```

- Приложение: http://localhost:3000
- Регистрация почтового ящика (Mailu Signup, отдельно от приложения): http://localhost:8025/admin/user/signup/information-security.org
- Веб-почта (SnappyMail): http://localhost:8025/webmail
- Админка Mailu: http://localhost:8025/admin
- PostgreSQL: localhost:5433
- Kafka (с хоста): localhost:9094
- Kafka UI: http://localhost:8081
- Генератор простых (health): http://localhost:5080

Учётная запись администратора приложения (`config/secrets.yml`):

- логин `admin`
- пароль `Admin#12345`

Секрет TOTP и коды восстановления администратора при каждом старте контейнера пишутся в лог `is-webapp-web` и приходят письмом на `admin@information-security.org` (веб-почта: http://localhost:8025/webmail). Коды восстановления при перезапуске выпускаются заново.

Почтовый ящик администратора создаёт сам Mailu: `admin@information-security.org`, пароль `Admin#12345`. Веб-почта: http://localhost:8025/webmail (полный адрес).

Порядок регистрации пользователя:

1. http://localhost:8025/admin/user/signup/information-security.org — ящик `имя@information-security.org` **в Mailu**, не в этом приложении
2. http://localhost:3000/register — учётка системы на этот адрес
3. Письма 3FA: http://localhost:8025/webmail (вход Mailu, затем SnappyMail). После Signup Mailu один раз просит сменить пароль ящика.

Генератор ищет **16384-битные** простые (Миллер–Рабин в C#-воркере) и пишет их в топик `prime-numbers`. Веб-приложение копит их в PostgreSQL. Новый ключ шифрования RSA и новая подпись PDF забирают из пула два простых и собирают свою пару. Если двух простых ещё нет, запрос RSA завершается ошибкой. «Кузнечик» от пула не зависит. HTTP-поток Node при этом не блокируется.

## Локально без полной сборки веб-образа

Нужны PostgreSQL, Mailu, Kafka и генератор:

```bash
docker compose up postgres redis front admin imap smtp antispam webmail mailu-bootstrap kafka kafka-ui kafka-topics prime-number-generator
```

```bash
cp config/secrets.yml.example config/secrets.yml
npm install
npx prisma db push
npm run dev
```

В `Development` брокер Kafka — `localhost:9094` (`config/appsettings.Development.yml`). SMTP с хоста — `localhost:1025`. Длина модуля остаётся 32768: ключ приходит из тех же 16384-битных простых.

## 3FA

1. Пароль
2. Шестизначный код из письма (веб-почта http://localhost:8025/webmail)
3. TOTP на HMAC-Стрибог-512 (не Google Authenticator / SHA-1) или одноразовый код восстановления `XXXX-XXXX-XXXX`

Если устройство TOTP потеряно: коды восстановления или сброс пароля через почту.

## Слои DDD

```
src/domain          сущности, алгоритмы, интерфейсы репозиториев
src/application     сервисы (координация и бизнес-логика)
src/infrastructure  реализации репозиториев (Prisma), SMTP, YAML, PDF, Kafka
src/app             тонкие HTTP-эндпоинты и страницы — только вызывают сервисы
```

Страницы при загрузке и API-роуты ходят в одни и те же сервисы через `getReadyServices()`:

| Сервис | За что отвечает |
| --- | --- |
| `authentication` | вход 3FA, сессия, выход |
| `registration` | регистрация пользователя |
| `passwordReset` | запрос и подтверждение сброса пароля |
| `messages` | шифрование, расшифрование, журнал, подписанный PDF |
| `administration` | пользователи, методы шифрования, bootstrap администратора |

Обращения к БД — только через репозитории: интерфейс в `src/domain`, Prisma-реализация в `src/infrastructure/persistence/prisma`.
