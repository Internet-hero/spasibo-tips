# Отчётность — кейс 3

В расчёты отчётов входят только платежи со статусом `SUCCESS`. Примеры ниже рассчитаны из исходного `payments.csv`.

## 1. Отчёт по мерчанту

**Endpoint:** `GET /api/v1/reports/tips?merchant_id=m_001&from=2025-11-01&to=2025-11-30`

| Метрика | Формула | Пример |
|-|-|-|
| `tips_total` | `sum(tip)` успешных платежей | `414.85` |
| `payments_count` | `count(SUCCESS)` | `5` |
| `avg_tip_pct` | `avg(tip / amount × 100)` | `9.0` |
| `success_rate` | `count(SUCCESS) / count(*)` | `0.833` |

```json
{
  "merchant_id": "m_001",
  "period": "2025-11",
  "tips_total": 414.85,
  "payments_count": 5,
  "avg_tip_pct": 9.0,
  "success_rate": 0.833
}
```

## 2. Отчёт по официанту

**Endpoint:** `GET /api/v1/reports/tips?employee_id=e_001&from=2025-11-01&to=2025-11-30`

| Метрика | Формула | Пример |
|-|-|-|
| `tips_total` | `sum(tip)` успешных платежей сотрудника | `83.60` |
| `payments_count` | `count(SUCCESS)` сотрудника | `2` |
| `avg_tip_amount` | `sum(tip) / count(SUCCESS)` | `41.80` |
| `top_day` | день с максимальным `sum(tip)` | `2025-11-03` |

```json
{
  "employee_id": "e_001",
  "period": "2025-11",
  "tips_total": 83.60,
  "payments_count": 2,
  "avg_tip_amount": 41.80,
  "top_day": "2025-11-03"
}
```

## 3. Отчёт по дням

**Endpoint:** `GET /api/v1/reports/tips/daily?merchant_id=m_001&from=2025-11-01&to=2025-11-30`

| Метрика | Формула |
|-|-|
| `date` | календарный день из `timestamp` |
| `tips_total` | `sum(tip)` успешных платежей за день |
| `payments_count` | `count(SUCCESS)` за день |
| `avg_tip_pct` | `avg(tip / amount × 100)` за день |

```json
{
  "merchant_id": "m_001",
  "daily": [
    {"date": "2025-11-01", "tips_total": 245.90, "payments_count": 3, "avg_tip_pct": 10.0},
    {"date": "2025-11-03", "tips_total": 168.95, "payments_count": 2, "avg_tip_pct": 10.0}
  ]
}
```

В демонстрационном seed веб-приложения суммы двух платежей Вероники намеренно увеличены до 250 ₽ и 450 ₽; исходный CSV при этом не изменён.

## Критерий приёмки

- [x] Три разреза: мерчант, официант, по дням.
- [x] Метрики и формулы указаны.
- [x] Примеры ответов приведены в JSON.
- [x] Примеры сходятся с `payments.csv`.
- [x] Указаны endpoint'ы.
