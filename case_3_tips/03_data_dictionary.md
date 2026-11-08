# Data dictionary — кейс 3

Используются четыре CSV: `merchants` (4 колонки), `employees` (4), `payments` (7), `qr_links` (7). Примеры взяты из исходных файлов комплекта.

## merchants.csv

| Поле | Тип | Обяз. | Ограничение | Пример | Код ошибки |
|-|-|-|-|-|-|
| `merchant_id` | string | да | `m_NNN`, уникальный | `m_001` | — |
| `name` | string | да | 1–100 символов | Вкус-Сервис Тверская | — |
| `status` | enum | да | `ACTIVE/BLOCKED/PENDING` | `ACTIVE` | `MERCHANT_BLOCKED` |
| `description` | string | нет | 0–200 символов | Ресторан сети, Тверская | — |

## employees.csv

| Поле | Тип | Обяз. | Ограничение | Пример | Код ошибки |
|-|-|-|-|-|-|
| `employee_id` | string | да | `e_NNN`, уникальный | `e_001` | — |
| `merchant_id` | string, FK | да | существующий `merchants.merchant_id` | `m_001` | `INVALID_QR` |
| `name` | string | да | 1–100 символов | Иванов И. | — |
| `payment_details` | string | да | только маска `****NNNN` | `****1001` | — |

## payments.csv

| Поле | Тип | Обяз. | Ограничение | Пример | Код ошибки |
|-|-|-|-|-|-|
| `payment_id` | string | да | `p_NNNN`, уникальный | `p_0001` | — |
| `merchant_id` | string, FK | да | существующий мерчант | `m_001` | `INVALID_QR` |
| `employee_id` | string, FK | да | сотрудник того же мерчанта | `e_001` | `INVALID_QR` |
| `amount` | decimal | да | `> 0`, `<= 1 000 000` | `637.00` | `AMOUNT_OUT_OF_RANGE` |
| `tip` | decimal | да | `>= 0`, `<= amount × 0.5` | `31.85` | `TIP_OUT_OF_RANGE` |
| `status` | enum | да | `CREATED/PENDING/SUCCESS/DECLINED/CANCELED` | `SUCCESS` | — |
| `timestamp` | datetime | да | ISO 8601 UTC | `2025-11-01T18:00:00Z` | — |

## qr_links.csv

| Поле | Тип | Обяз. | Ограничение | Пример | Код ошибки |
|-|-|-|-|-|-|
| `qr_id` | string | да | `qr_NNN`, уникальный | `qr_001` | `INVALID_QR` |
| `merchant_id` | string, FK | да | существующий активный мерчант | `m_001` | `MERCHANT_BLOCKED` |
| `employee_id` | string, FK | да | сотрудник того же мерчанта | `e_001` | `INVALID_QR` |
| `receipt_id` | string | да | `r_NNNN`, уникален у мерчанта | `r_1001` | `RECEIPT_MISMATCH` |
| `nonce` | string | да | 6 hex, одноразовый | `c82561` | `QR_USED` |
| `exp` | datetime | да | ISO 8601; обычно создание + 24 ч | `2025-11-01T23:59:00Z` | `QR_EXPIRED` |
| `signature` | string | да | HMAC-SHA256, первые 16 hex | `68d0f361ac38c12b` | `INVALID_QR` |

Подписывается строка `merchant_id|employee_id|receipt_id|nonce|exp`. Полные PAN/CVV клиентов и немаскированные реквизиты сотрудников не хранятся.

## Критерий приёмки

- [x] Все 4 файла описаны (22 колонки).
- [x] Для каждого поля указаны тип и ограничение.
- [x] Для валидируемых полей указаны коды ошибок.
- [x] Примеры взяты из реальных CSV.
- [x] `payment_details` представлен только маской.
