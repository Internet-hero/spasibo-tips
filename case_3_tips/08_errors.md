# ER-модель — кейс 3 «Онлайн-чаевые»

Исходный файл носит имя `08_errors.md`, но по содержанию является шаблоном ER-модели; ниже заполнены все шесть сущностей.

## 1. Сущности

| Сущность | Что хранит | Зачем |
|-|-|-|
| Merchant | `merchant_id`, `name`, `status`, `description` | Справочник заведений и их статус |
| Employee | `employee_id`, `merchant_id`, `name`, `payment_details` | Сотрудник, привязанный к мерчанту |
| QR | `qr_id`, FK мерчанта/сотрудника, `receipt_id`, `nonce`, `exp`, `signature` | Одноразовая подписанная ссылка на чек |
| Payment | `payment_id`, `qr_id`, `amount`, `tip`, `status`, `timestamp` | Факт операции и её состояние |
| Report | `report_id`, `merchant_id`, `period`, `tips_total` | Агрегированная отчётность |
| AuditEvent | `event_id`, `payment_id`, `action`, переход статусов, `actor`, `at` | Журнал событий для разбора |

## 2. Атрибуты

### 2.1. Merchant

| Поле | Тип | PK/FK | Обяз. | Ограничение |
|-|-|-|-|-|
| `merchant_id` | string | **PK** | да | `m_NNN` |
| `name` | string | — | да | 1–100 |
| `status` | enum | — | да | `ACTIVE/BLOCKED/PENDING` |
| `description` | string | — | нет | 0–200 |

### 2.2. Employee

| Поле | Тип | PK/FK | Обяз. | Ограничение |
|-|-|-|-|-|
| `employee_id` | string | **PK** | да | `e_NNN` |
| `merchant_id` | string | **FK → Merchant** | да | существующий мерчант |
| `name` | string | — | да | 1–100 |
| `payment_details` | string | — | да | только маска `****NNNN` |

### 2.3. QR

| Поле | Тип | PK/FK | Обяз. | Ограничение |
|-|-|-|-|-|
| `qr_id` | string | **PK** | да | `qr_NNN` |
| `merchant_id` | string | **FK → Merchant** | да | активный мерчант |
| `employee_id` | string | **FK → Employee** | да | сотрудник того же мерчанта |
| `receipt_id` | string | — | да | `r_NNNN`, уникален у мерчанта |
| `nonce` | string | — | да | 6 hex, одноразовый |
| `exp` | datetime | — | да | ISO 8601, TTL 24 ч |
| `signature` | string | — | да | HMAC-SHA256, 16 hex |

### 2.4. Payment

| Поле | Тип | PK/FK | Обяз. | Ограничение |
|-|-|-|-|-|
| `payment_id` | string | **PK** | да | `p_NNNN` |
| `qr_id` | string | **FK → QR** | да | существующий QR |
| `amount` | decimal | — | да | `> 0`, `<= 1 000 000` |
| `tip` | decimal | — | да | `>= 0`, `<= amount × 0.5` |
| `status` | enum | — | да | `CREATED/PENDING/SUCCESS/DECLINED/CANCELED` |
| `timestamp` | datetime | — | да | ISO 8601 |

### 2.5. Report

| Поле | Тип | PK/FK | Обяз. | Ограничение |
|-|-|-|-|-|
| `report_id` | string | **PK** | да | `rep_NNNN` |
| `merchant_id` | string | **FK → Merchant** | да | существующий мерчант |
| `period` | string | — | да | `YYYY-MM` |
| `tips_total` | decimal | — | да | `>= 0` |

### 2.6. AuditEvent

| Поле | Тип | PK/FK | Обяз. | Ограничение |
|-|-|-|-|-|
| `event_id` | string | **PK** | да | `evt_NNNN` |
| `payment_id` | string | **FK → Payment** | да | существующий платёж |
| `action` | enum | — | да | created/pending/confirmed/declined/canceled |
| `from_status` | enum/null | — | нет | предыдущий статус |
| `to_status` | enum | — | да | новый статус |
| `actor` | enum | — | да | `system/client/officer` |
| `at` | datetime | — | да | ISO 8601 |

## 3. Связи

| Связь | Тип | Обоснование |
|-|-|-|
| Merchant → Employee | 1:N | У заведения много сотрудников |
| Merchant → QR | 1:N | Заведение выпускает много QR |
| Employee → QR | 1:N | Сотрудник получает чаевые по многим QR |
| QR → Payment | 1:N | Возможны повторные попытки; активный одноразовый сценарий ограничен |
| Merchant → Report | 1:N | Отчёты строятся за разные периоды |
| Payment → AuditEvent | 1:N | Каждый переход статуса — отдельное событие |

## 4. Диаграмма

Исходник: `diagrams/er_model.drawio`. Сущности содержат PK/FK, связи подписаны `1:N`.

## 5. Критерий приёмки

- [x] 6 сущностей описаны.
- [x] Указаны PK/FK, типы и ограничения.
- [x] Связи описаны как 1:N.
- [x] Реквизиты представлены только маской.
- [x] Подпись — HMAC-SHA256.
- [x] Подготовлена диаграмма draw.io.
