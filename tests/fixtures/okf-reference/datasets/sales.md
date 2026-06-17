---
type: Dataset
title: Sales Dataset
description: Sales records prepared for OKF fixture coverage.
tags:
  - sales
  - fixture
timestamp: 2026-06-15T00:00:00Z
---

# Overview

The sales dataset joins [Orders](../tables/orders.md) and [Customers](../tables/customers.md).

# Lineage

```mermaid
flowchart LR
  Customers --> Orders
  Orders --> SalesDataset
```
