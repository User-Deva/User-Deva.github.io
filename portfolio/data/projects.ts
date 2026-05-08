export type Project = {
  title: string
  description: string
  tags: string[]
  url: string
  repo?: string
  featured?: boolean
}

export const projects: Project[] = [
  {
    title: "Demand Forecasting & Inventory Optimization — McCormick & Company",
    description: "Rebuilt the demand-forecasting workflow in **Power BI + SQL**, lifting forecast accuracy by **14%** and cutting stockouts on high-demand spices, seasonings, and flavor ingredients. Aligned MRP, replenishment, and finance views in a single source of truth.",
    tags: ["Power BI", "SQL", "S&OP", "Demand Planning"],
    url: "#contact",
    featured: true,
  },
  {
    title: "Distribution Network Redesign — Regional DCs",
    description: "Re-routed transportation across regional DCs using **S&OP** scenario modeling, lowering freight spend by **$2.1M** while holding **96% OTIF** to retail, foodservice, and e-commerce partners. Built KPI dashboards in Tableau to monitor MRP compliance and on-time delivery.",
    tags: ["S&OP", "Tableau", "Transportation", "Cost Reduction"],
    url: "#contact",
    featured: true,
  },
  {
    title: "Reverse Logistics Kaizen — $1.3M Recovery",
    description: "Applied **Lean Six Sigma + Kaizen** to the returns flow, cutting reverse-logistics processing time by **22%** and recovering **$1.3M** in reusable packaging, returned goods, and bulk raw materials. Standardized SOPs across regional return hubs.",
    tags: ["Lean Six Sigma", "Kaizen", "Reverse Logistics"],
    url: "#contact",
    featured: false,
  },
  {
    title: "Supplier Risk & Compliance — SAP S/4HANA",
    description: "Led supplier risk and compliance management on **SAP S/4HANA**, achieving **100% audit readiness**, eliminating contract violations, and tightening regulatory compliance across the vendor base.",
    tags: ["SAP S/4HANA", "Vendor Management", "Compliance"],
    url: "#contact",
    featured: false,
  },
  {
    title: "Big Billion Days Replenishment — Flipkart",
    description: "Designed **Python**-based analytics to track supplier lead times and turnover across 12 regional warehouses, enabling proactive replenishment, cutting stockouts by **15%**, and preventing **₹6.2 Cr** in lost revenue during peak campaigns.",
    tags: ["Python", "Pandas", "Inventory Optimization", "E-commerce"],
    url: "#contact",
    featured: true,
  },
  {
    title: "Tier-1 Order Fulfillment — Flipkart WMS",
    description: "Streamlined cross-dock operations on **WMS + Oracle Cloud ERP**, cutting average delivery lead time by **1.2 days** and hitting **98% SLA adherence** across the Tier-1 network. Monitored throughput and last-mile dispatch in Flipkart Commerce Cloud.",
    tags: ["WMS", "Oracle Cloud ERP", "Order Fulfillment"],
    url: "#contact",
    featured: false,
  },
  {
    title: "Inbound Scheduling & Dock-to-Stock — Adani Logistics",
    description: "Optimized inbound scheduling on **SAP S/4HANA + Smartsheet** for a 150K sq. ft. warehouse with 15K+ SKUs, reducing detention costs by **13%** and improving dock-to-stock cycle time by **21%** through Root Cause Analysis and Kaizen.",
    tags: ["SAP S/4HANA", "Smartsheet", "Warehouse Operations"],
    url: "#contact",
    featured: false,
  },
  {
    title: "3PL SLA Reporting Automation",
    description: "Built **Advanced Excel** (Pivot Tables, Power Query, Macros) reporting suite for 3PL partners, achieving **94% SLA adherence** and giving operations leaders a single weekly view of outbound performance across hubs.",
    tags: ["Advanced Excel", "Reporting Automation", "KPI Dashboards"],
    url: "#contact",
    featured: false,
  },
]

export const allTags = Array.from(new Set(projects.flatMap(p => p.tags)))
