import type { WorkspaceEntry } from "./types";

export interface SeedDrawerFile {
  path: string;
  contents: string;
}

export const SEED_DRAWER_TITLE = "Onyx Commerce Seed Drawer";

export const SEED_DRAWER_FILES: SeedDrawerFile[] = [
  {
    path: "datasets/commerce.md",
    contents: concept("Dataset", "Commerce Dataset", "Canonical commerce facts for orders, customers, products, and revenue.", ["commerce", "dataset"], [
      "# Commerce Dataset",
      "",
      "The commerce dataset joins [Orders](../tables/orders.md), [Order Items](../tables/order-items.md), [Customers](../tables/customers.md), and [Products](../tables/products.md).",
      "",
      "Revenue definitions roll up through [Revenue](../metrics/revenue.md) and appear in the [Executive Overview](../dashboards/executive-overview.md).",
      "",
      "```mermaid",
      "flowchart LR",
      "  Customers --> Orders",
      "  Orders --> OrderItems",
      "  Products --> OrderItems",
      "  OrderItems --> Revenue",
      "```",
    ]),
  },
  {
    path: "datasets/marketing.md",
    contents: concept("Dataset", "Marketing Dataset", "Campaign, attribution, and conversion facts used by growth reporting.", ["marketing", "dataset"], [
      "# Marketing Dataset",
      "",
      "The marketing dataset centers on [Campaigns](../tables/campaigns.md), [Conversion Rate](../metrics/conversion-rate.md), and [Campaign Attribution](../domains/marketing/campaign-attribution.md).",
      "",
      "It feeds the [Marketing Funnel](../dashboards/marketing-funnel.md) dashboard and connects campaign spend back to [Revenue by Channel](../queries/revenue-by-channel.md).",
    ]),
  },
  {
    path: "tables/orders.md",
    contents: concept("Table", "Orders", "One row per completed or attempted customer order.", ["commerce", "orders", "table"], [
      "# Schema",
      "",
      "| Column | Type | Notes |",
      "| --- | --- | --- |",
      "| order_id | string | Primary key |",
      "| customer_id | string | Links to [Customers](customers.md) |",
      "| order_status | string | Lifecycle state from [Order Lifecycle](../domains/commerce/order-lifecycle.md) |",
      "| order_total | number | Gross value used by [Revenue](../metrics/revenue.md) |",
      "",
      "# Relationships",
      "",
      "Orders belong to the [Commerce Dataset](../datasets/commerce.md) and expand through [Order Items](order-items.md).",
    ]),
  },
  {
    path: "tables/order-items.md",
    contents: concept("Table", "Order Items", "Line-item grain for products purchased in each order.", ["commerce", "orders", "products", "table"], [
      "# Schema",
      "",
      "- `order_item_id` uniquely identifies the line.",
      "- `order_id` links each line to [Orders](orders.md).",
      "- `product_id` links each line to [Products](products.md).",
      "- `line_revenue` contributes to [Revenue](../metrics/revenue.md).",
    ]),
  },
  {
    path: "tables/customers.md",
    contents: concept("Table", "Customers", "One row per known customer profile.", ["commerce", "customers", "table"], [
      "# Schema",
      "",
      "- `customer_id` uniquely identifies a customer.",
      "- `first_order_at` supports [Customer Lifetime Value](../metrics/customer-lifetime-value.md).",
      "- `acquisition_channel` connects customers to [Campaign Attribution](../domains/marketing/campaign-attribution.md).",
      "",
      "# Related",
      "",
      "Customers create [Orders](orders.md), belong to the [Commerce Dataset](../datasets/commerce.md), and move through the [Customer Journey](../domains/commerce/customer-journey.md).",
    ]),
  },
  {
    path: "tables/products.md",
    contents: concept("Table", "Products", "Catalog table for sellable product records.", ["commerce", "products", "table"], [
      "# Schema",
      "",
      "- `product_id` uniquely identifies the product.",
      "- `category` supports merchandising cuts in [Revenue](../metrics/revenue.md).",
      "- Product records appear on [Order Items](order-items.md) during the [Order Lifecycle](../domains/commerce/order-lifecycle.md).",
    ]),
  },
  {
    path: "tables/campaigns.md",
    contents: concept("Table", "Campaigns", "Marketing campaigns, channels, and planned spend.", ["marketing", "campaigns", "table"], [
      "# Schema",
      "",
      "- `campaign_id` uniquely identifies a campaign.",
      "- `channel` joins campaign delivery to [Revenue by Channel](../queries/revenue-by-channel.md).",
      "- `landing_sessions` and `conversions` support [Conversion Rate](../metrics/conversion-rate.md).",
      "",
      "# Related",
      "",
      "Campaigns belong to the [Marketing Dataset](../datasets/marketing.md) and are interpreted through [Campaign Attribution](../domains/marketing/campaign-attribution.md).",
    ]),
  },
  {
    path: "metrics/revenue.md",
    contents: concept("Metric", "Revenue", "Recognized commerce revenue after discounts and returns.", ["commerce", "metric", "revenue"], [
      "# Definition",
      "",
      "Revenue sums fulfilled [Order Items](../tables/order-items.md) from completed [Orders](../tables/orders.md).",
      "",
      "The metric appears in the [Executive Overview](../dashboards/executive-overview.md) and is queried by [Revenue by Channel](../queries/revenue-by-channel.md).",
      "",
      "```mermaid",
      "flowchart TD",
      "  Orders --> EligibleOrders",
      "  OrderItems --> EligibleLines",
      "  EligibleOrders --> Revenue",
      "  EligibleLines --> Revenue",
      "```",
    ]),
  },
  {
    path: "metrics/customer-lifetime-value.md",
    contents: concept("Metric", "Customer Lifetime Value", "Trailing customer value derived from orders and cohorts.", ["commerce", "customers", "metric"], [
      "# Definition",
      "",
      "Customer Lifetime Value combines [Customers](../tables/customers.md), historical [Orders](../tables/orders.md), and [Revenue](revenue.md).",
      "",
      "It is segmented by [Customer Cohorts](../queries/customer-cohorts.md) and summarized in the [Executive Overview](../dashboards/executive-overview.md).",
    ]),
  },
  {
    path: "metrics/conversion-rate.md",
    contents: concept("Metric", "Conversion Rate", "Share of campaign sessions that become orders.", ["marketing", "metric", "conversion"], [
      "# Definition",
      "",
      "Conversion Rate divides conversions by qualified sessions from [Campaigns](../tables/campaigns.md).",
      "",
      "It appears in the [Marketing Funnel](../dashboards/marketing-funnel.md) and supports [Campaign Attribution](../domains/marketing/campaign-attribution.md).",
      "",
      "```mermaid",
      "flowchart LR",
      "  Campaigns --> Sessions",
      "  Sessions --> Conversions",
      "  Conversions --> ConversionRate",
      "```",
    ]),
  },
  {
    path: "dashboards/executive-overview.md",
    contents: concept("Dashboard", "Executive Overview", "Executive dashboard for revenue, customers, and operating health.", ["dashboard", "commerce", "executive"], [
      "# Panels",
      "",
      "- [Revenue](../metrics/revenue.md)",
      "- [Customer Lifetime Value](../metrics/customer-lifetime-value.md)",
      "- [Order Health](operations/order-health.md)",
      "- [Marketing Funnel](marketing-funnel.md)",
      "",
      "The dashboard is sourced from the [Commerce Dataset](../datasets/commerce.md) and provides a top-level entry point for graph testing.",
    ]),
  },
  {
    path: "dashboards/operations/order-health.md",
    contents: concept("Dashboard", "Order Health", "Operations dashboard for order flow and fulfillment exceptions.", ["dashboard", "operations", "orders"], [
      "# Panels",
      "",
      "Order Health tracks [Orders](../../tables/orders.md), [Order Items](../../tables/order-items.md), and state transitions in the [Order Lifecycle](../../domains/commerce/order-lifecycle.md).",
      "",
      "It rolls up to the [Executive Overview](../executive-overview.md).",
    ]),
  },
  {
    path: "dashboards/marketing-funnel.md",
    contents: concept("Dashboard", "Marketing Funnel", "Growth dashboard for acquisition and conversion reporting.", ["dashboard", "marketing"], [
      "# Panels",
      "",
      "The Marketing Funnel connects the [Marketing Dataset](../datasets/marketing.md), [Conversion Rate](../metrics/conversion-rate.md), and [Campaign Attribution](../domains/marketing/campaign-attribution.md).",
      "",
      "The executive rollup links this dashboard back to the [Executive Overview](executive-overview.md).",
    ]),
  },
  {
    path: "queries/revenue-by-channel.md",
    contents: concept("Query", "Revenue by Channel", "Query pattern for joining orders to campaign channel reporting.", ["query", "revenue", "marketing"], [
      "# Query Intent",
      "",
      "Revenue by Channel combines [Revenue](../metrics/revenue.md), [Orders](../tables/orders.md), and acquisition fields from [Campaigns](../tables/campaigns.md).",
      "",
      "This query is used by the [Marketing Dataset](../datasets/marketing.md) to reconcile growth spend to commerce outcomes.",
    ]),
  },
  {
    path: "queries/customer-cohorts.md",
    contents: concept("Query", "Customer Cohorts", "Query pattern for grouping customers by acquisition and first order month.", ["query", "customers", "cohorts"], [
      "# Query Intent",
      "",
      "Customer Cohorts groups [Customers](../tables/customers.md), [Orders](../tables/orders.md), and [Customer Lifetime Value](../metrics/customer-lifetime-value.md).",
      "",
      "It explains retention movement in the [Customer Journey](../domains/commerce/customer-journey.md).",
    ]),
  },
  {
    path: "references/source-systems.md",
    contents: concept("Reference", "Source Systems", "Operational systems that feed the seed drawer.", ["reference", "systems"], [
      "# Systems",
      "",
      "- Storefront events feed the [Marketing Dataset](../datasets/marketing.md).",
      "- Order management feeds the [Commerce Dataset](../datasets/commerce.md).",
      "- Quality checks are documented in [Data Quality Rules](data-quality.md).",
    ]),
  },
  {
    path: "references/data-quality.md",
    contents: concept("Reference", "Data Quality Rules", "Seed data quality expectations for graph and validator QA.", ["reference", "quality"], [
      "# Rules",
      "",
      "- [Orders](../tables/orders.md) must have a customer.",
      "- [Customers](../tables/customers.md) must have a stable identifier.",
      "- [Campaigns](../tables/campaigns.md) must map to a known channel.",
      "",
      "These rules are sourced from [Source Systems](source-systems.md).",
    ]),
  },
  {
    path: "domains/commerce/order-lifecycle.md",
    contents: concept("Concept", "Order Lifecycle", "Business process from cart creation through fulfillment.", ["commerce", "process"], [
      "# Lifecycle",
      "",
      "The lifecycle starts with [Orders](../../tables/orders.md), expands through [Order Items](../../tables/order-items.md), and is monitored by [Order Health](../../dashboards/operations/order-health.md).",
      "",
      "It connects to the [Customer Journey](customer-journey.md) when customers place repeat orders.",
      "",
      "```mermaid",
      "stateDiagram-v2",
      "  [*] --> Created",
      "  Created --> Paid",
      "  Paid --> Fulfilled",
      "  Fulfilled --> Returned",
      "  Fulfilled --> [*]",
      "```",
    ]),
  },
  {
    path: "domains/commerce/customer-journey.md",
    contents: concept("Concept", "Customer Journey", "Business journey from acquisition through repeat purchase.", ["commerce", "customers", "process"], [
      "# Journey",
      "",
      "The journey starts at [Customers](../../tables/customers.md), accumulates [Customer Lifetime Value](../../metrics/customer-lifetime-value.md), and loops through the [Order Lifecycle](order-lifecycle.md).",
      "",
      "Acquisition context comes from [Campaign Attribution](../marketing/campaign-attribution.md).",
    ]),
  },
  {
    path: "domains/marketing/campaign-attribution.md",
    contents: concept("Concept", "Campaign Attribution", "Business rules for assigning campaign influence to commerce outcomes.", ["marketing", "attribution", "process"], [
      "# Attribution",
      "",
      "Campaign Attribution interprets [Campaigns](../../tables/campaigns.md), [Conversion Rate](../../metrics/conversion-rate.md), and the [Marketing Funnel](../../dashboards/marketing-funnel.md).",
      "",
      "The output feeds the [Marketing Dataset](../../datasets/marketing.md) and influences the [Customer Journey](../commerce/customer-journey.md).",
      "",
      "```mermaid",
      "flowchart LR",
      "  Campaigns --> Touchpoints",
      "  Touchpoints --> Attribution",
      "  Attribution --> ConversionRate",
      "  Attribution --> Revenue",
      "```",
    ]),
  },
];

export function seedDrawerMarkdownPaths(): string[] {
  return SEED_DRAWER_FILES.map((file) => file.path);
}

export function seedDrawerTree(name = "onyx-seed-drawer"): WorkspaceEntry {
  const root: WorkspaceEntry = { name, path: "", kind: "folder", reserved: false, children: [] };
  for (const file of SEED_DRAWER_FILES) addFile(root, file.path);
  return sortTree(root);
}

function addFile(root: WorkspaceEntry, path: string): void {
  const parts = path.split("/");
  let current = root;
  let currentPath = "";
  for (const part of parts.slice(0, -1)) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    let folder = current.children.find((child) => child.kind === "folder" && child.path === currentPath);
    if (!folder) {
      folder = { name: part, path: currentPath, kind: "folder", reserved: false, children: [] };
      current.children.push(folder);
    }
    current = folder;
  }
  const name = parts[parts.length - 1] ?? path;
  current.children.push({ name, path, kind: "file", reserved: false, children: [] });
}

function sortTree(entry: WorkspaceEntry): WorkspaceEntry {
  entry.children.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1;
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
  for (const child of entry.children) sortTree(child);
  return entry;
}

function concept(type: string, title: string, description: string, tags: string[], body: string[]): string {
  const tagLines = tags.map((tag) => `  - ${tag}`).join("\n");
  return [
    "---",
    `type: ${type}`,
    `title: ${title}`,
    `description: ${description}`,
    "tags:",
    tagLines,
    "timestamp: 2026-06-15T00:00:00Z",
    "---",
    "",
    ...body,
    "",
  ].join("\n");
}
