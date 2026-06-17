---
type: Table
title: Orders
description: One row per completed customer order.
tags:
  - sales
  - orders
timestamp: 2026-06-15T00:00:00Z
---

# Schema

| Column | Type | Notes |
| --- | --- | --- |
| order_id | string | Primary key |
| customer_id | string | Links to [Customers](customers.md) |
| order_total | number | Gross order value |

# Diagram

```mermaid
flowchart LR
  Orders --> Customers
  Orders --> Sales
```

![Orders chart](../assets/images/orders.png)
