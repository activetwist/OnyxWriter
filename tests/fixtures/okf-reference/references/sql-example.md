---
type: Query
title: Orders by Customer SQL
description: SQL example that should stay raw-mode safe.
tags:
  - sql
  - fixture
timestamp: 2026-06-15T00:00:00Z
---

# Query

```sql
select
  customer_id,
  count(*) as order_count
from analytics.orders
group by 1
```

Uses [Orders](../tables/orders.md) as the source table.
