---
title: "Domain 5: Dashboarding & Visualization"
description: "Grafana, Prometheus UI, Panel Types, Variables, Templating, Dashboard Best Practices"
domain: 5
weight: 8
order: 5
---

# 📘 PCA EXAM — DOMAIN 5: DASHBOARDING & VISUALIZATION (8%)
## *Complete One-Stop Guide: Theory → Examples → Exam Questions*

---

## TABLE OF CONTENTS

```
5.1   Visualization in the Prometheus Ecosystem
5.2   Prometheus Native UI (Expression Browser)
5.3   Grafana — Overview & Architecture
5.4   Adding Prometheus as a Data Source in Grafana
5.5   Grafana Panel Types
5.6   Building Dashboards with PromQL
5.7   Variables & Templating
5.8   Dashboard Best Practices
5.9   Grafana vs Prometheus UI — When to Use Which
5.10  Real-World Dashboard Examples
5.11  EXAM-STYLE QUESTIONS (20 Questions with Answers)
```

---

---

## 5.1 📖 VISUALIZATION IN THE PROMETHEUS ECOSYSTEM

### The Visualization Landscape

```
Prometheus itself is primarily a metrics collection and storage system.
For visualization, you have two main options:

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Option 1: Prometheus Native UI (Built-in)              │
│    → Simple expression browser at http://localhost:9090 │
│    → Good for quick queries and debugging               │
│    → Limited visualization capabilities                 │
│    → No persistent dashboards                           │
│                                                         │
│  Option 2: Grafana (External, Most Popular)             │
│    → Rich, interactive dashboards                       │
│    → Multiple data sources (not just Prometheus)        │
│    → Alerting, annotations, variables                   │
│    → Industry standard for Prometheus visualization     │
│                                                         │
│  Other Options (less common):                           │
│    → Console Templates (Prometheus built-in, advanced)  │
│    → Perses (CNCF sandbox project, Prometheus-native)   │
│    → Custom dashboards using Prometheus HTTP API        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 💡 Key Takeaway for Exam
> **Prometheus is NOT a visualization tool** — it's a metrics collection/storage system
> **Grafana** is the de facto standard for Prometheus visualization
> Prometheus has a basic built-in UI for ad-hoc queries

---

---

## 5.2 📖 PROMETHEUS NATIVE UI (Expression Browser)

### Accessing the UI

```
URL: http://<prometheus-server>:9090

Default port: 9090
No authentication by default (add reverse proxy for production!)
```

### Key Pages in the Prometheus UI

```
┌─────────────────────────────────────────────────────────┐
│  Prometheus UI Navigation                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  /graph     → Expression Browser (PromQL queries)       │
│  /alerts    → Active alerting rules and their state     │
│  /status    → Runtime & Build Information               │
│  /targets   → Scrape targets and their health           │
│  /rules     → Loaded recording and alerting rules       │
│  /service-discovery → Active SD configurations          │
│  /flags     → Command-line flags                        │
│  /config    → Current prometheus.yml configuration      │
│  /tsdb-status → TSDB storage statistics                 │
│  /metrics   → Prometheus's OWN metrics (self-monitoring)│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### The Expression Browser (/graph)

```
Two modes:

1. Table View (Instant Query):
   → Enter a PromQL expression
   → Click "Execute"
   → Shows the latest value for each matching time series
   → Returns an instant vector
   → Example: up{job="web-app"}
   
   Result:
   Element                                    Value
   up{instance="app1:8080", job="web-app"}    1
   up{instance="app2:8080", job="web-app"}    1
   up{instance="app3:8080", job="web-app"}    0

2. Graph View (Range Query):
   → Enter a PromQL expression
   → Set time range (e.g., last 1 hour)
   → Click "Execute"
   → Shows a time-series graph
   → Returns a range of values over time
   → Example: rate(http_requests_total[5m])
   
   Features:
   → Adjustable time range
   → Resolution control (step size)
   → Stacked/Unstacked toggle
   → Can embed graphs via URL
```

### The Targets Page (/targets)

```
Shows all configured scrape targets and their current status:

Endpoint                          State   Labels                         Last Scrape
http://app1:8080/metrics          UP      job="web", instance="app1:8080"  2.345s ago
http://app2:8080/metrics          UP      job="web", instance="app2:8080"  1.234s ago
http://app3:8080/metrics          DOWN    job="web", instance="app3:8080"  15.678s ago
http://db:9104/metrics            UP      job="mysql", instance="db:9104"  0.567s ago

Useful for:
  → Checking which targets are healthy (UP) vs down (DOWN)
  → Seeing the last scrape time and duration
  → Verifying labels applied to each target
  → Debugging scrape failures (error messages shown)
```

### Limitations of the Prometheus UI

```
❌ No persistent dashboards (queries are lost on page refresh)
❌ No multi-panel layouts
❌ No variables or templating
❌ No alerting visualization (beyond /alerts page)
❌ No user management or access control
❌ Limited graph customization
❌ No annotation support
❌ Cannot combine multiple data sources

✅ Good for: Quick ad-hoc queries, debugging, checking target health
```

---

---

## 5.3 📖 GRAFANA — OVERVIEW & ARCHITECTURE

### What is Grafana?

**Grafana** is an open-source **visualization and analytics platform** that allows you to query, visualize, alert on, and understand your metrics from multiple data sources.

### Key Facts

```
Website:    https://grafana.com
Default Port: 3000
Default Login: admin / admin (change immediately!)
License:    AGPLv3 (open source)
Maintainer: Grafana Labs
Data Sources: Prometheus, InfluxDB, Elasticsearch, MySQL, 
              PostgreSQL, CloudWatch, Loki, Tempo, Jaeger, etc.
```

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GRAFANA ARCHITECTURE                  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Grafana Server                      │    │
│  │                                                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ Dashboard│  │ Alerting │  │ Plugin   │      │    │
│  │  │ Engine   │  │ Engine   │  │ System   │      │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘      │    │
│  │       │              │              │            │    │
│  │  ┌────┴──────────────┴──────────────┴─────┐      │    │
│  │  │         Data Source Plugins             │      │    │
│  │  │  Prometheus │ InfluxDB │ Elasticsearch  │      │    │
│  │  └────┬──────────────┬──────────────┬─────┘      │    │
│  └───────┼──────────────┼──────────────┼────────────┘    │
│          │              │              │                 │
│          ▼              ▼              ▼                 │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐         │
│  │  Prometheus  │ │ InfluxDB │ │ Elasticsearch│         │
│  │  Server      │ │          │ │              │         │
│  └──────────────┘ └──────────┘ └──────────────┘         │
│                                                         │
│  Users access Grafana via web browser (port 3000)       │
│  Grafana queries data sources and renders dashboards    │
└─────────────────────────────────────────────────────────┘
```

### Key Grafana Concepts

```
Organization (Org):
  → Top-level grouping (e.g., "My Company")
  → Each org has its own dashboards, data sources, users

Data Source:
  → Connection to a backend system (Prometheus, InfluxDB, etc.)
  → Must be configured before creating dashboards
  → Can have multiple data sources of the same type

Dashboard:
  → A collection of panels organized in a grid layout
  → Can have variables, annotations, and time range controls
  → Stored as JSON (can be version-controlled!)

Panel:
  → A single visualization within a dashboard
  → Contains a query (PromQL), visualization type, and settings
  → Types: Graph, Stat, Gauge, Table, Heatmap, etc.

Folder:
  → Organizes dashboards into logical groups
  → Supports permissions

User/Team:
  → Users can be assigned roles (Admin, Editor, Viewer)
  → Teams allow group-based permissions
```

---

---

## 5.4 📖 ADDING PROMETHEUS AS A DATA SOURCE IN GRAFANA

### Step-by-Step Configuration

```
1. Log into Grafana (http://grafana:3000)
2. Go to Configuration → Data Sources → Add data source
3. Select "Prometheus"
4. Configure:

   Name:     Prometheus-Production  (any descriptive name)
   URL:      http://prometheus:9090  (Prometheus server URL)
   Access:   Server (default) — Grafana server queries Prometheus
             Browser — User's browser queries Prometheus directly
   
   HTTP Settings:
     Timeout: 60s
     Max concurrent queries: 10
   
   Custom HTTP Headers: (if needed for auth)
     Authorization: Bearer <token>
   
   Query Settings:
     Min time interval: 15s  (should match scrape interval)
     Max data points: 11000
   
   HTTP Method: POST (recommended for large queries)
                GET  (default, simpler)

5. Click "Save & Test"
   → Should show "Data source is working" ✅
```

### Important Settings

```
Min Time Interval:
  → Should match your Prometheus scrape_interval (e.g., 15s)
  → Prevents Grafana from querying at higher resolution than data exists
  → If set too low, queries will return empty gaps

Max Data Points:
  → Controls the maximum number of data points returned per query
  → Grafana automatically adjusts the step size based on this
  → Default: 11000 (matches typical screen pixel width)

Access Mode:
  → Server (recommended): Grafana backend queries Prometheus
    ✅ Works behind firewalls
    ✅ Credentials stay on server
  → Browser: User's browser queries Prometheus directly
    ❌ Requires Prometheus to be accessible from user's browser
    ❌ Exposes Prometheus URL to users
```

---

---

## 5.5 📖 GRAFANA PANEL TYPES

### Complete Panel Type Reference

| Panel Type | Best For | Example Use Case |
|------------|----------|-----------------|
| **Time Series** | Trends over time | Request rate over 24h |
| **Stat** | Single current value | Current CPU usage: 75% |
| **Gauge** | Value within a range | Memory usage: 80/100% |
| **Bar Chart** | Comparing categories | Requests by endpoint |
| **Table** | Tabular data | List of all targets + status |
| **Heatmap** | Distribution over time | Request latency distribution |
| **Histogram** | Frequency distribution | Response size distribution |
| **Pie Chart** | Proportions | Traffic by status code |
| **State Timeline** | State changes over time | Target UP/DOWN history |
| **Status History** | Status grid | Service health grid |
| **Logs** | Log data | Application logs (with Loki) |
| **Node Graph** | Relationships | Service dependency map |
| **Text** | Documentation | Dashboard description |
| **Alert List** | Active alerts | Current firing alerts |
| **Dashboard List** | Navigation | Links to related dashboards |

### Detailed Panel Examples

#### 1. Time Series Panel (Most Common)

```
Purpose: Show how metrics change over time

Configuration:
  Query: rate(http_requests_total[5m])
  Legend: {{method}} - {{status}}
  Unit: requests/sec (ops)
  
  Display options:
    → Lines, Bars, or Points
    → Stacked or Unstacked
    → Line width, fill opacity
    → Gradient mode
    → Thresholds (color changes at values)
  
  Axes:
    → Y-axis: auto-scale or fixed range
    → X-axis: time (auto)
  
  Standard options:
    → Min/Max
    → Decimals
    → Unit (seconds, bytes, percent, etc.)

Best for: Rate, latency trends, resource usage over time
```

#### 2. Stat Panel

```
Purpose: Display a single big number (current value)

Configuration:
  Query: sum(rate(http_requests_total[5m]))
  Calculation: Last (not mean, not sum!)
  Unit: requests/sec
  
  Thresholds:
    → Green: < 1000
    → Yellow: 1000-5000
    → Red: > 5000
  
  Color mode: Background or Value
  Graph mode: None, Area, or Line (sparkline)

Best for: KPIs, current values, SLI indicators
Example: "Current Error Rate: 0.02%" (green)
```

#### 3. Gauge Panel

```
Purpose: Show a value within a min-max range (like a speedometer)

Configuration:
  Query: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
  Min: 0
  Max: 100
  Unit: percent
  
  Thresholds:
    → Green: 0-60%
    → Yellow: 60-80%
    → Red: 80-100%

Best for: Utilization metrics (CPU, memory, disk)
Example: CPU Usage gauge showing 75% (yellow zone)
```

#### 4. Table Panel

```
Purpose: Display data in rows and columns

Configuration:
  Query A: up
  Query B: time() - process_start_time_seconds
  
  Transform: Join by field (instance)
  
  Columns:
    → Instance
    → Status (up/down)
    → Uptime (formatted as duration)
  
  Overrides:
    → Color "Status" column: 1=green, 0=red
    → Format "Uptime" as "d hh:mm:ss"

Best for: Inventory lists, target status, SLA reports
```

#### 5. Heatmap Panel

```
Purpose: Show distribution of values over time (2D histogram)

Configuration:
  Query: sum(increase(http_request_duration_seconds_bucket[5m])) by (le)
  Format: Heatmap
  Legend: {{le}}
  
  Display:
    → Color scheme: Green-Yellow-Red
    → Y-axis: latency buckets
    → X-axis: time

Best for: Latency distributions, spotting patterns
Example: "Most requests are < 100ms, but at 2 PM there's a spike to 2s"
```

---

---

## 5.6 📖 BUILDING DASHBOARDS WITH PromQL

### Dashboard Structure

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Production API Dashboard          [Last 6 hours ▼] [🔄]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Total   │ │  Error   │ │  p99     │ │  Active  │      │
│  │  Req/s   │ │  Rate %  │ │  Latency │ │  Users   │      │
│  │  12,450  │ │  0.02%   │ │  234ms   │ │  3,456   │      │
│  │  (Stat)  │ │  (Stat)  │ │  (Stat)  │ │  (Stat)  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Request Rate by Method │ │  Error Rate Over Time   │   │
│  │  (Time Series)          │ │  (Time Series)          │   │
│  │  📈 GET, POST, PUT      │ │  📈 5xx rate %         │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Latency Distribution   │ │  CPU & Memory Usage     │   │
│  │  (Heatmap)              │ │  (Time Series)          │   │
│  │  🟩🟨🟥                 │ │  📈 per instance        │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Common Dashboard Queries

```promql
# Row 1: Stat Panels
# Total Request Rate
sum(rate(http_requests_total[5m]))

# Error Rate %
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ sum(rate(http_requests_total[5m])) * 100

# p99 Latency
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# Active Users (gauge)
app_active_users

# Row 2: Time Series
# Request Rate by Method
sum(rate(http_requests_total[5m])) by (method)

# Error Rate Over Time
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ sum(rate(http_requests_total[5m])) * 100

# Row 3: Heatmap + Resources
# Latency Heatmap
sum(increase(http_request_duration_seconds_bucket[5m])) by (le)

# CPU Usage per Instance
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

---

---

## 5.7 📖 VARIABLES & TEMPLATING

### What are Variables?

Variables allow you to create **dynamic, reusable dashboards** where users can select different values from dropdown menus.

### Types of Variables

#### 1. Query Variable (Most Common)

```
Purpose: Populate dropdown from a PromQL query

Example: Create an "instance" dropdown
  Name: instance
  Type: Query
  Data source: Prometheus
  Query: label_values(up, instance)
  Result: Dropdown with [app1:8080, app2:8080, app3:8080]

Example: Create a "job" dropdown
  Name: job
  Type: Query
  Query: label_values(up, job)
  Result: Dropdown with [web-app, database, cache]

Example: Create an "endpoint" dropdown (filtered by job)
  Name: endpoint
  Type: Query
  Query: label_values(http_requests_total{job="$job"}, endpoint)
  Result: Dynamically updates when $job changes!
```

#### 2. Custom Variable

```
Purpose: Manually define a list of values

Example:
  Name: environment
  Type: Custom
  Values: production, staging, development
  
  Usage in query:
  sum(rate(http_requests_total{env="$environment"}[5m]))
```

#### 3. Interval Variable

```
Purpose: Let users select the time resolution

Example:
  Name: interval
  Type: Interval
  Values: 1m, 5m, 15m, 30m, 1h
  
  Usage in query:
  rate(http_requests_total[$interval])
```

#### 4. Textbox Variable

```
Purpose: Free-text input from the user

Example:
  Name: search
  Type: Textbox
  Default: .*
  
  Usage in query:
  http_requests_total{endpoint=~"$search"}
```

#### 5. Datasource Variable

```
Purpose: Let users switch between data sources

Example:
  Name: datasource
  Type: Datasource
  Type filter: Prometheus
  
  Usage: Select data source for panels dynamically
```

#### 6. Constant Variable

```
Purpose: Hidden constant value (useful for templating)

Example:
  Name: cluster
  Type: Constant
  Value: us-east-1
```

### Using Variables in Queries

```promql
# Single value variable
rate(http_requests_total{job="$job"}[5m])

# Multi-value variable (use regex matching!)
rate(http_requests_total{job=~"$job"}[5m])
# If user selects "web" and "api", this becomes:
# rate(http_requests_total{job=~"web|api"}[5m])

# All values
rate(http_requests_total{instance=~"$instance"}[5m])
# If "All" is selected: {instance=~".*"}

# Nested variables
rate(http_requests_total{job="$job", instance="$instance"}[5m])
```

### Variable Settings

```
Multi-value: Allow selecting multiple values (use =~ in PromQL!)
Include All: Add an "All" option (maps to .* in regex)
Refresh: When to re-query the variable values
  → On Dashboard Load
  → On Time Range Change
Sort: Alphabetical, Numerical, Alphabetical (case-insensitive)
Hide: Hide the variable from the UI (useful for constants)
```

### 💡 Key Takeaway for Exam
> Variables make dashboards **dynamic and reusable**
> `label_values(metric, label)` populates dropdowns from Prometheus
> Use `=~` (regex match) for multi-value variables
> `$variable` syntax references variables in queries
> **Query variables** are the most common type

---

---

## 5.8 📖 DASHBOARD BEST PRACTICES

### 1. Organize by Purpose

```
Good:
  → "Production API Overview" (high-level KPIs)
  → "Production API - Detailed Latency" (deep dive)
  → "Infrastructure - Node Metrics" (servers)
  → "Database - MySQL Performance" (database)

Bad:
  → "Everything Dashboard" (too many panels, too slow)
```

### 2. Use the Right Panel Type

```
Trend over time?     → Time Series
Single KPI number?   → Stat
Utilization 0-100%?  → Gauge
Distribution?        → Heatmap
Tabular data?        → Table
Comparison?          → Bar Chart
```

### 3. Set Appropriate Units

```
Always set the correct unit in Grafana:
  → Latency: seconds (s), milliseconds (ms)
  → Throughput: requests/sec (reqps), ops/sec (ops)
  → Memory/Disk: bytes (decbytes or binbytes)
  → CPU: percent (0-100) or percentunit (0-1)
  → Network: bytes/sec (Bps) or bits/sec (bps)

⚠️ Prometheus uses base units (seconds, bytes)
   Grafana can auto-convert for display (e.g., bytes → GB)
```

### 4. Use Meaningful Legends

```
Good:
  Legend: {{method}} {{status}}    → "GET 200", "POST 500"
  Legend: {{instance}}             → "app1:8080"

Bad:
  Legend: {A}                      → Meaningless!
  Legend: (empty)                  → Can't distinguish lines!
```

### 5. Set Thresholds

```
Use color thresholds to highlight problems:
  → CPU: Green < 60%, Yellow 60-80%, Red > 80%
  → Error Rate: Green < 0.1%, Yellow 0.1-1%, Red > 1%
  → Latency: Green < 200ms, Yellow 200ms-1s, Red > 1s
```

### 6. Dashboard JSON Model

```
Grafana dashboards are stored as JSON!
This means you can:
  → Version-control dashboards in Git
  → Deploy dashboards via CI/CD (Grafana provisioning)
  → Share dashboards via grafana.com/dashboards
  → Export/Import dashboards between Grafana instances

Provisioning:
  Place JSON files in /etc/grafana/provisioning/dashboards/
  Grafana loads them automatically on startup
```

---

---

## 5.9 📖 GRAFANA vs PROMETHEUS UI — WHEN TO USE WHICH

| Feature | Prometheus UI | Grafana |
|---------|--------------|---------|
| **Quick ad-hoc queries** | ✅ Excellent | ⚠️ Possible but slower |
| **Persistent dashboards** | ❌ No | ✅ Yes |
| **Multi-panel layouts** | ❌ No | ✅ Yes |
| **Variables/Templating** | ❌ No | ✅ Yes |
| **Multiple data sources** | ❌ Prometheus only | ✅ Many |
| **Alerting visualization** | ⚠️ Basic (/alerts) | ✅ Rich |
| **User management** | ❌ No | ✅ Yes |
| **Annotations** | ❌ No | ✅ Yes |
| **Sharing/Embedding** | ⚠️ URL only | ✅ Snapshots, embed, share |
| **Heatmaps** | ❌ No | ✅ Yes |
| **Debugging PromQL** | ✅ Excellent | ⚠️ OK |
| **Checking target health** | ✅ /targets page | ⚠️ Needs query |
| **Production monitoring** | ❌ No | ✅ Yes |

### 💡 Key Takeaway for Exam
> **Prometheus UI** = Debugging, ad-hoc queries, checking targets
> **Grafana** = Production dashboards, visualization, alerting, sharing

---

---

## 5.10 📖 REAL-WORLD DASHBOARD EXAMPLES

### Example 1: Node Exporter Dashboard

```
Row 1 (Stats): CPU Usage | Memory Usage | Disk Usage | Network I/O
Row 2 (Graphs): CPU by Mode | Memory Breakdown
Row 3 (Graphs): Disk I/O | Network Traffic
Row 4 (Table): Filesystem Usage per Mount Point

Variables: $instance (from label_values(node_uname_info, instance))

Key queries:
  CPU: 100 - (avg(rate(node_cpu_seconds_total{mode="idle",instance="$instance"}[5m])) * 100)
  Mem: (1 - node_memory_MemAvailable_bytes{instance="$instance"} / node_memory_MemTotal_bytes{instance="$instance"}) * 100
  Disk: (1 - node_filesystem_avail_bytes{instance="$instance",mountpoint="/"} / node_filesystem_size_bytes{instance="$instance",mountpoint="/"}) * 100
```

### Example 2: HTTP Service Dashboard (RED Method)

```
Row 1 (Stats): Request Rate | Error Rate | p50 Latency | p99 Latency
Row 2 (Graphs): Rate by Endpoint | Error Rate by Status
Row 3 (Graphs): Latency Heatmap | Duration Percentiles
Row 4 (Graphs): Traffic by Method | Saturation (CPU/Mem)

Variables: $job, $instance, $endpoint

Key queries:
  Rate: sum(rate(http_requests_total{job="$job"}[5m])) by (endpoint)
  Errors: sum(rate(http_requests_total{job="$job",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="$job"}[5m])) * 100
  p99: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="$job"}[5m])) by (le))
```

---

---

## 5.11 📝 EXAM-STYLE QUESTIONS (20 Questions)

### Question 1
**What is the primary visualization tool used with Prometheus in production environments?**

A) Prometheus Native UI
B) Kibana
C) Grafana
D) Nagios

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

**Grafana** is the de facto standard visualization tool for Prometheus in production. While Prometheus has a built-in expression browser, it lacks persistent dashboards, multi-panel layouts, variables, and rich visualization options. Grafana connects to Prometheus as a data source and provides all these features. Kibana is for Elasticsearch, and Nagios is a separate monitoring system.
</details>

---

### Question 2
**What is the default port for Grafana?**

A) 9090
B) 3000
C) 8080
D) 9100

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Grafana runs on port **3000** by default. Port 9090 is Prometheus server, 9100 is Node Exporter, and 8080 is commonly used by cAdvisor or application servers.
</details>

---

### Question 3
**What is the default port for the Prometheus server web UI?**

A) 3000
B) 8080
C) 9090
D) 9100

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The Prometheus server runs on port **9090** by default. This serves both the web UI (expression browser, targets, alerts, etc.) and the HTTP API. Port 3000 is Grafana, 9100 is Node Exporter.
</details>

---

### Question 4
**Which page in the Prometheus UI shows the health status of all scrape targets?**

A) /graph
B) /alerts
C) /targets
D) /status

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `/targets` page shows all configured scrape targets, their current state (UP or DOWN), labels, last scrape time, scrape duration, and any error messages for failed scrapes. `/graph` is the expression browser, `/alerts` shows active alerting rules, and `/status` shows runtime information.
</details>

---

### Question 5
**When configuring Prometheus as a data source in Grafana, what should the "Min time interval" be set to?**

A) 1 second
B) It should match the Prometheus scrape interval (e.g., 15s)
C) 1 hour
D) It doesn't matter

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The "Min time interval" in Grafana's Prometheus data source settings should match the Prometheus `scrape_interval` (e.g., 15s). This prevents Grafana from querying at a higher resolution than the data actually exists, which would result in empty gaps or misleading results. If your scrape interval is 15s, setting the min interval to 1s would cause Grafana to request data points that don't exist.
</details>

---

### Question 6
**Which Grafana panel type is best suited for displaying the current CPU usage as a single number with color-coded thresholds?**

A) Time Series
B) Heatmap
C) Stat
D) Table

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The **Stat** panel displays a single big number (the current value) with optional color-coded thresholds. It's ideal for KPIs like "Current CPU: 75%" with green/yellow/red coloring. Time Series shows trends over time, Heatmap shows distributions, and Table shows tabular data.
</details>

---

### Question 7
**Which Grafana panel type would you use to visualize the distribution of HTTP request latencies over time?**

A) Stat
B) Gauge
C) Heatmap
D) Pie Chart

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

A **Heatmap** is ideal for visualizing distributions over time. The X-axis shows time, the Y-axis shows latency buckets, and the color intensity shows the number of requests in each bucket. This allows you to spot patterns like "latency spikes at 2 PM every day." Stat and Gauge show single values, and Pie Chart shows proportions at a single point in time.
</details>

---

### Question 8
**What Grafana function is used to populate a variable dropdown with label values from Prometheus?**

A) `values(metric, label)`
B) `label_values(metric, label)`
C) `get_labels(metric)`
D) `query_labels(metric, label)`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`label_values(metric, label)` is the Grafana function used in Query variables to populate dropdown menus with label values from Prometheus. For example, `label_values(up, instance)` returns all unique instance values from the `up` metric. This is specific to Grafana's variable system, not PromQL.
</details>

---

### Question 9
**When using multi-value variables in Grafana with Prometheus, which PromQL matcher should you use?**

A) `=` (exact match)
B) `!=` (not equal)
C) `=~` (regex match)
D) `!~` (regex not match)

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

When a Grafana variable allows multiple selections, the selected values are joined with `|` (pipe) to form a regex. For example, if the user selects "web" and "api", the variable `$job` becomes `web|api`. You must use the `=~` (regex match) operator in PromQL: `{job=~"$job"}` which expands to `{job=~"web|api"}`. Using `=` would try to match the literal string "web|api" which wouldn't work.
</details>

---

### Question 10
**How are Grafana dashboards stored internally?**

A) As binary files in a proprietary format
B) As JSON documents
C) As YAML files
D) As SQL database records only

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Grafana dashboards are stored as **JSON documents**. This is a key feature because it allows dashboards to be version-controlled in Git, shared via grafana.com, exported/imported between Grafana instances, and deployed via provisioning (placing JSON files in the provisioning directory). While Grafana stores them in its internal database (SQLite, MySQL, or PostgreSQL), the format is always JSON.
</details>

---

### Question 11
**What is the purpose of the `/graph` endpoint in the Prometheus UI?**

A) To display pre-built dashboards
B) To serve as an expression browser for running ad-hoc PromQL queries
C) To configure scrape targets
D) To manage alerting rules

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `/graph` endpoint is the **Expression Browser** in the Prometheus UI. It allows you to enter PromQL expressions and view results as either a table (instant query) or a graph (range query). It's primarily used for ad-hoc debugging and exploration, not for persistent dashboards (that's Grafana's role).
</details>

---

### Question 12
**Which of the following is a limitation of the Prometheus native UI?**

A) It cannot run PromQL queries
B) It does not support persistent dashboards or multi-panel layouts
C) It cannot display time series graphs
D) It requires a separate license

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The Prometheus native UI can run PromQL queries (A is wrong) and display basic time series graphs (C is wrong). It's free and open source (D is wrong). Its main limitations are: no persistent dashboards (queries are lost on refresh), no multi-panel layouts, no variables/templating, no user management, and limited visualization options. These limitations are why Grafana is used for production dashboards.
</details>

---

### Question 13
**What is the correct way to reference a Grafana variable named "instance" in a PromQL query?**

A) `{{instance}}`
B) `${instance}` or `$instance`
C) `#instance`
D) `@instance`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In Grafana, variables are referenced using `$variable` or `${variable}` syntax in PromQL queries. For example: `rate(http_requests_total{instance="$instance"}[5m])`. The `{{instance}}` syntax (A) is used in Grafana legend formatting, not in queries. Options C and D are not valid Grafana variable syntax.
</details>

---

### Question 14
**Which Grafana panel type is best for showing a value within a defined min-max range, like a speedometer?**

A) Stat
B) Time Series
C) Gauge
D) Bar Chart

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The **Gauge** panel displays a value within a defined range (min to max), similar to a speedometer. It's ideal for utilization metrics like CPU usage (0-100%), memory usage, or disk usage. The Stat panel shows a single number without a range indicator. Time Series shows trends, and Bar Chart compares categories.
</details>

---

### Question 15
**What does the "Access" setting control when configuring a Prometheus data source in Grafana?**

A) The authentication method (Basic Auth, Token, etc.)
B) Whether Grafana server or the user's browser makes the query to Prometheus
C) The read/write permissions on the Prometheus data
D) The network firewall rules

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The "Access" setting in Grafana's data source configuration controls the query proxy mode:
- **Server** (recommended): Grafana's backend server makes the HTTP request to Prometheus. The user's browser never directly contacts Prometheus.
- **Browser**: The user's browser makes the request directly to Prometheus. This requires Prometheus to be accessible from the user's network.
This is about the query path, not authentication (A), permissions (C), or firewall rules (D).
</details>

---

### Question 16
**Which Prometheus UI page would you check to verify that your recording rules are loaded correctly?**

A) /graph
B) /targets
C) /rules
D) /config

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `/rules` page shows all loaded recording rules and alerting rules, including their current state, last evaluation time, and evaluation duration. You can verify that your rules are loaded correctly, see if any rules have errors, and check the last evaluation results. `/config` shows the prometheus.yml file, `/targets` shows scrape targets, and `/graph` is for queries.
</details>

---

### Question 17
**What is the purpose of Grafana dashboard provisioning?**

A) To automatically create Prometheus scrape targets
B) To load dashboards from JSON files on disk automatically when Grafana starts
C) To provision new Grafana user accounts
D) To configure Prometheus alerting rules

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Grafana dashboard provisioning allows you to place dashboard JSON files in a designated directory (e.g., `/etc/grafana/provisioning/dashboards/`) and have Grafana automatically load them on startup. This enables Infrastructure as Code (IaC) practices — dashboards can be version-controlled in Git and deployed via CI/CD pipelines. It does NOT provision Prometheus targets (A), user accounts (C), or alerting rules (D).
</details>

---

### Question 18
**In Grafana, what is the purpose of the "Legend" field in a panel query?**

A) To set the panel title
B) To customize how each time series is labeled in the graph using template variables like `{{method}}`
C) To add a description to the dashboard
D) To define the Y-axis unit

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The Legend field in a Grafana panel query allows you to customize how each time series is labeled in the graph. You use template variables like `{{method}}`, `{{instance}}`, or `{{status}}` to extract label values from the PromQL result. For example, setting the legend to `{{method}} - {{status}}` would display lines labeled "GET - 200", "POST - 500", etc. This makes graphs much more readable.
</details>

---

### Question 19
**Which of the following is NOT a valid Grafana variable type?**

A) Query
B) Custom
C) Interval
D) PromQL

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: D**

The valid Grafana variable types are: **Query**, **Custom**, **Interval**, **Textbox**, **Datasource**, **Constant**, and **Ad hoc filters**. **"PromQL"** is NOT a variable type. While Query variables can use PromQL-related functions like `label_values()`, the type itself is called "Query", not "PromQL".
</details>

---

### Question 20
**What is the recommended approach for creating a production monitoring dashboard for a Prometheus-monitored application?**

A) Use the Prometheus native UI and bookmark your queries
B) Use Grafana with Prometheus as a data source, creating persistent dashboards with variables and thresholds
C) Export all Prometheus data to CSV and use a spreadsheet
D) Use the Prometheus /graph page and take screenshots

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The recommended approach for production monitoring is to use **Grafana** with Prometheus as a data source. Grafana provides persistent dashboards, multi-panel layouts, variables for dynamic filtering, color-coded thresholds, alerting, user management, and sharing capabilities — none of which are available in the Prometheus native UI. Options A, C, and D are impractical for production use.
</details>

---

---

## ✅ DOMAIN 5 REVISION SUMMARY CHEAT SHEET

```
┌──────────────────────────────────────────────────────────────────────┐
│              DOMAIN 5: DASHBOARDING & VISUALIZATION CHEAT SHEET      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PROMETHEUS UI (Port 9090):                                         │
│  /graph   → Expression browser (ad-hoc PromQL)                      │
│  /targets → Scrape target health (UP/DOWN)                          │
│  /alerts  → Active alerting rules                                    │
│  /rules   → Recording + alerting rules                               │
│  /config  → Current prometheus.yml                                   │
│  /status  → Runtime info                                             │
│  /metrics → Self-monitoring                                          │
│  Limitations: No persistent dashboards, no variables, no multi-panel │
│                                                                      │
│  GRAFANA (Port 3000):                                                │
│  Default login: admin/admin                                          │
│  Data source: Add Prometheus (URL: http://prometheus:9090)           │
│  Min time interval = scrape_interval (e.g., 15s)                     │
│  Access: Server (recommended) or Browser                             │
│  Dashboards stored as JSON (version-controllable!)                   │
│  Provisioning: Load dashboards from JSON files on startup            │
│                                                                      │
│  PANEL TYPES:                                                        │
│  Time Series → Trends over time                                      │
│  Stat        → Single KPI number with thresholds                     │
│  Gauge       → Value in min-max range (speedometer)                  │
│  Heatmap     → Distribution over time                                │
│  Table       → Tabular data                                          │
│  Bar Chart   → Category comparison                                   │
│  Pie Chart   → Proportions                                           │
│                                                                      │
│  VARIABLES:                                                          │
│  Query    → label_values(metric, label) — most common                │
│  Custom   → Manual list of values                                    │
│  Interval → Time resolution selector (1m, 5m, 15m)                  │
│  Textbox  → Free-text input                                          │
│  Syntax:  $variable or ${variable} in PromQL queries                 │
│  Multi-value: Use =~ (regex match) in PromQL                         │
│  Include All: Maps to .* in regex                                    │
│                                                                      │
│  BEST PRACTICES:                                                     │
│  ✅ Set correct units (seconds, bytes, percent)                      │
│  ✅ Use meaningful legends ({{method}}, {{instance}})                │
│  ✅ Set color thresholds (green/yellow/red)                          │
│  ✅ Organize dashboards by purpose                                   │
│  ✅ Version-control dashboard JSON in Git                            │
│  ✅ Use variables for reusability                                    │
│                                                                      │
│  PROMETHEUS UI vs GRAFANA:                                           │
│  Debugging/ad-hoc queries → Prometheus UI                            │
│  Production dashboards    → Grafana                                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

> **Reply with "Domain 5 Complete"** and I'll provide the guides for the final two domains:
> 
> **Domain 6: Service Discovery (6%)**
> - Static, File, DNS, Kubernetes, Consul, EC2 SD
> - Relabeling deep dive (relabel_configs, metric_relabel_configs)
> 
> **Domain 7: Alerting & Alertmanager (4%)**
> - Alerting rules syntax, Alertmanager routing, grouping, silencing, inhibition
> 
> These are the last two domains — only 10% combined! We're almost there! 🚀
