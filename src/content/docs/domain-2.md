---
title: "Domain 2: Prometheus Fundamentals"
description: "Architecture, Data Model, Metric Types, Configuration, Storage, TSDB, Exposition Format"
domain: 2
weight: 20
order: 2
---

# 📘 PCA EXAM — DOMAIN 2: PROMETHEUS FUNDAMENTALS (20%)
## *Complete One-Stop Guide: Theory → Examples → Exam Questions*

---

## TABLE OF CONTENTS

```
2.1  Prometheus Architecture & Components
2.2  Prometheus Data Model
2.3  Metric Naming Conventions
2.4  The Four Metric Types (Counter, Gauge, Histogram, Summary)
2.5  Prometheus Configuration (prometheus.yml)
2.6  Storage & TSDB Internals
2.7  Exposition Format
2.8  Staleness & Timestamps
2.9  Federation
2.10 Remote Read / Remote Write
2.11 Real-World Scenarios
2.12 EXAM-STYLE QUESTIONS (30 Questions with Answers)
```

---

---

## 2.1 📖 PROMETHEUS ARCHITECTURE & COMPONENTS

### The Big Picture Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROMETHEUS ECOSYSTEM                            │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  App 1   │  │  App 2   │  │  App 3   │  │  Batch   │            │
│  │ (Client  │  │ (Client  │  │ (Client  │  │  Job     │            │
│  │  Library)│  │  Library)│  │  Library)│  │ (Short)  │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │              │              │              │                 │
│       │ /metrics     │ /metrics     │ /metrics     │ push            │
│       ▼              ▼              ▼              ▼                 │
│  ┌──────────────────────────────────────┐    ┌──────────────┐        │
│  │          EXPORTERS                    │    │  Pushgateway │        │
│  │  ┌──────────┐ ┌──────────┐           │    │              │        │
│  │  │  Node    │ │  MySQL   │  ...      │    └──────┬───────┘        │
│  │  │ Exporter │ │ Exporter │           │           │                │
│  │  └──────────┘ └──────────┘           │           │                │
│  └──────────────┬───────────────────────┘           │                │
│                 │                                   │                │
│                 │  ◄──── PULL (scrape) ────►        │                │
│                 ▼                                   ▼                │
│  ┌──────────────────────────────────────────────────────────┐        │
│  │                  PROMETHEUS SERVER                        │        │
│  │                                                          │        │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │        │
│  │  │  Retrieval  │  │   Storage   │  │   HTTP      │      │        │
│  │  │  (Scrape    │  │   (TSDB)    │  │   Server    │      │        │
│  │  │   Manager)  │  │             │  │   (API/UI)  │      │        │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │        │
│  │         │                │                │              │        │
│  │  ┌──────┴──────────────────────────────────┴──────┐      │        │
│  │  │         Service Discovery (SD)                  │      │        │
│  │  │  Kubernetes │ Consul │ EC2 │ DNS │ File │ Static │      │        │
│  │  └────────────────────────────────────────────────┘      │        │
│  │                                                          │        │
│  │  ┌────────────────────────────────────────────────┐      │        │
│  │  │         Rule Manager (Alerting + Recording)     │      │        │
│  │  └────────────────────┬───────────────────────────┘      │        │
│  └───────────────────────┼──────────────────────────────────┘        │
│                          │                                           │
│                          ▼                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Alertmanager │  │   Grafana    │  │  Remote      │               │
│  │ (Routing,    │  │ (Dashboards, │  │  Storage     │               │
│  │  Grouping,   │  │  Visualization)│ (Thanos,     │               │
│  │  Silencing)  │  │              │  │  Cortex,     │               │
│  └──────┬───────┘  └──────────────┘  │  VictoriaM.) │               │
│         │                            └──────────────┘               │
│         ▼                                                            │
│  ┌──────────────────────────────────┐                                │
│  │  Notification Receivers          │                                │
│  │  Slack │ Email │ PagerDuty │ WH  │                                │
│  └──────────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

---

#### Component 1: Prometheus Server (The Core)

The Prometheus server is the **central brain** of the entire system. It has three main internal components:

**A) Retrieval Module (Scrape Manager)**
```
Responsibility: Pulls metrics from targets at configured intervals

How it works:
  1. Reads target list from Service Discovery or static config
  2. Sends HTTP GET request to each target's /metrics endpoint
  3. Parses the response (exposition format)
  4. Stores the data in TSDB

Configuration:
  scrape_interval: 15s    # How often to scrape
  scrape_timeout: 10s     # Max time to wait for response
  
Example scrape flow:
  Prometheus → HTTP GET http://app:8080/metrics
  Response: 
    http_requests_total{method="GET"} 1027
    http_requests_total{method="POST"} 342
  Prometheus → Parses → Stores in TSDB with timestamp
```

**B) Storage Module (TSDB — Time Series Database)**
```
Responsibility: Stores all scraped metrics efficiently on local disk

Key features:
  → Optimized for time-series data (append-only)
  → Data stored in blocks (typically 2 hours each)
  → Uses compression (very efficient: ~1-2 bytes per sample)
  → Local storage by default (not distributed!)
  → Retention controlled by flags:
      --storage.tsdb.retention.time=15d
      --storage.tsdb.retention.size=50GB

Storage path: /prometheus/data/ (default)
```

**C) HTTP Server (API & UI)**
```
Responsibility: Serves the web UI and API endpoints

Key endpoints:
  /graph        → Expression browser (PromQL queries)
  /targets      → Shows all scrape targets and their status
  /status       → Runtime info, config, flags, rules
  /alerts       → Active alerting rules
  /rules        → All loaded rules
  /metrics      → Prometheus's OWN metrics (self-monitoring!)
  /api/v1/*     → REST API for programmatic access
  
Examples:
  GET /api/v1/query?query=up
  GET /api/v1/query_range?query=up&start=...&end=...&step=15s
  GET /api/v1/targets
  GET /api/v1/labels
```

---

#### Component 2: Service Discovery (SD)

```
Responsibility: Automatically finds targets to scrape

Why needed:
  → In modern environments (Kubernetes, cloud), targets are dynamic
  → Pods are created/destroyed constantly
  → Manually maintaining a target list is impossible at scale

Supported SD mechanisms:
  → static_configs     (manual list)
  → file_sd_configs    (read from JSON/YAML files)
  → kubernetes_sd_configs (K8s API: pods, services, nodes, endpoints)
  → ec2_sd_configs     (AWS EC2 instances)
  → consul_sd_configs  (HashiCorp Consul)
  → dns_sd_configs     (DNS records)
  → azure_sd_configs   (Azure VMs)
  → gce_sd_configs     (Google Cloud instances)
  → dockerswarm_sd_configs
  → ... and many more

Example (Kubernetes SD):
  kubernetes_sd_configs:
    - role: pod
      namespaces:
        names: ['production']
  # Prometheus automatically discovers all pods in 'production' namespace
```

---

#### Component 3: Client Libraries

```
Responsibility: Instrument application code to expose custom metrics

Available for:
  → Go (github.com/prometheus/client_golang)     ← Most mature
  → Python (prometheus_client)
  → Java (io.prometheus.simpleclient)
  → Ruby (prometheus-client)
  → .NET (prometheus-net)
  → Rust, C++, etc. (community maintained)

What they do:
  1. Provide APIs to create Counters, Gauges, Histograms, Summaries
  2. Automatically expose a /metrics HTTP endpoint
  3. Handle metric registration and exposition format

Example (Go):
  var httpRequests = prometheus.NewCounterVec(
    prometheus.CounterOpts{
      Name: "http_requests_total",
      Help: "Total HTTP requests",
    },
    []string{"method", "status"},
  )
  
  func handler(w http.ResponseWriter, r *http.Request) {
    httpRequests.WithLabelValues(r.Method, "200").Inc()
    // ... handle request
  }

Example (Python):
  from prometheus_client import Counter, start_http_server
  
  REQUESTS = Counter('http_requests_total', 'Total HTTP requests', ['method'])
  
  def handle_request(method):
      REQUESTS.labels(method=method).inc()
  
  start_http_server(8000)  # Exposes /metrics on port 8000
```

---

#### Component 4: Exporters

```
Responsibility: Expose metrics from third-party systems that don't 
                natively support Prometheus format

How they work:
  → An exporter is a standalone process
  → It connects to a third-party system (MySQL, Redis, Linux, etc.)
  → It translates that system's metrics into Prometheus format
  → It exposes a /metrics endpoint for Prometheus to scrape

Common Exporters:
  ┌─────────────────────┬────────┬──────────────────────────┐
  │ Exporter            │ Port   │ What it monitors         │
  ├─────────────────────┼────────┼──────────────────────────┤
  │ Node Exporter       │ 9100   │ Linux system metrics     │
  │ MySQL Exporter      │ 9104   │ MySQL/MariaDB            │
  │ Redis Exporter      │ 9121   │ Redis                    │
  │ PostgreSQL Exporter │ 9187   │ PostgreSQL               │
  │ Blackbox Exporter   │ 9115   │ HTTP/TCP/ICMP probing    │
  │ cAdvisor            │ 8080   │ Docker containers        │
  │ SNMP Exporter       │ 9116   │ Network devices (SNMP)   │
  │ JMX Exporter        │ varies │ Java JMX metrics         │
  │ Kafka Exporter      │ 9308   │ Apache Kafka             │
  └─────────────────────┴────────┴──────────────────────────┘

Example (Node Exporter):
  $ ./node_exporter
  # Now available at http://localhost:9100/metrics
  # Exposes: node_cpu_seconds_total, node_memory_MemTotal_bytes,
  #          node_disk_io_time_seconds_total, etc.
```

---

#### Component 5: Pushgateway

```
Responsibility: Accept metrics pushed by short-lived batch jobs

When to use:
  → Cron jobs that run for 5 seconds (Prometheus can't scrape in time)
  → CI/CD pipeline jobs
  → Serverless functions
  → Any job shorter than the scrape interval

When NOT to use:
  ❌ Long-running services (use direct scraping!)
  ❌ As a general replacement for pull model
  ❌ To push metrics from behind a firewall (use federation instead)

Flow:
  Batch Job → HTTP POST → Pushgateway → Prometheus scrapes Pushgateway

Example:
  # In a bash cron job:
  echo "backup_duration_seconds 45.2" | curl --data-binary @- \
    http://pushgateway:9091/metrics/job/backup/instance/server1

  # Prometheus config:
  scrape_configs:
    - job_name: 'pushgateway'
      honor_labels: true  # Important! Preserves job/instance labels
      static_configs:
        - targets: ['pushgateway:9091']
```

---

#### Component 6: Alertmanager

```
Responsibility: Handles alerts sent by the Prometheus server

What it does:
  1. Receives alerts from Prometheus (via HTTP API)
  2. Deduplicates alerts (same alert from multiple sources)
  3. Groups related alerts together
  4. Routes alerts to the correct receiver
  5. Handles silencing (suppressing alerts during maintenance)
  6. Handles inhibition (suppressing alerts when a parent alert fires)

Flow:
  Prometheus Rule Engine → Alert fires → Sends to Alertmanager
  Alertmanager → Groups → Routes → Sends to Slack/Email/PagerDuty

Key concepts:
  → Grouping: Group by cluster, alertname
  → Inhibition: If "cluster down" fires, inhibit "node down" alerts
  → Silencing: Mute alerts during planned maintenance
  → Receivers: Where to send (email, Slack, webhook, PagerDuty)

Note: Alertmanager is a SEPARATE binary, not part of Prometheus server!
```

---

#### Component 7: Grafana (Visualization)

```
Responsibility: Create dashboards and visualize Prometheus metrics

Key features:
  → Add Prometheus as a data source
  → Write PromQL queries in panels
  → Create beautiful dashboards
  → Set up Grafana-managed alerts (alternative to Alertmanager)
  → Import community dashboards (grafana.com/dashboards)

Note: Grafana is NOT part of Prometheus. It's a separate open-source tool
      that integrates with Prometheus as a data source.
```

---

### 💡 Key Takeaway for Exam
> **Prometheus Server** = Retrieval + TSDB + HTTP Server
> **Service Discovery** = Finds targets automatically
> **Client Libraries** = Instrument your code
> **Exporters** = Bridge to third-party systems
> **Pushgateway** = ONLY for short-lived batch jobs
> **Alertmanager** = Separate component for alert routing
> **Grafana** = Separate tool for visualization

---

---

## 2.2 📖 PROMETHEUS DATA MODEL

### The Fundamental Concept: Time Series

Prometheus stores all data as **time series**. A time series is a stream of timestamped values belonging to the same metric and set of labels.

### Data Model Structure

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Time Series = Metric Name + Labels + Samples           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Metric Name: http_requests_total                │    │
│  │ Labels:      {method="GET", status="200"}       │    │
│  │                                                 │    │
│  │ Samples (timestamp + value):                    │    │
│  │   @1699000000 → 1027                            │    │
│  │   @1699000015 → 1042                            │    │
│  │   @1699000030 → 1058                            │    │
│  │   @1699000045 → 1071                            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  A DIFFERENT combination of labels = DIFFERENT series!  │
│                                                         │
│  http_requests_total{method="GET", status="200"}  ← S1  │
│  http_requests_total{method="GET", status="404"}  ← S2  │
│  http_requests_total{method="POST", status="200"} ← S3  │
│  http_requests_total{method="POST", status="500"} ← S4  │
│                                                         │
│  These are 4 SEPARATE time series!                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### The Three Components in Detail

#### 1. Metric Name

```
Definition: Identifies the general feature of a system being measured

Rules:
  → Must match regex: [a-zA-Z_:][a-zA-Z0-9_:]*
  → Must start with a letter, underscore, or colon
  → Can contain letters, digits, underscores, colons
  → Colons are reserved for recording rules (don't use in raw metrics!)
  → Convention: snake_case

Examples:
  ✅ http_requests_total
  ✅ node_cpu_seconds_total
  ✅ process_resident_memory_bytes
  ✅ go_goroutines
  ❌ http-requests-total  (hyphens not allowed)
  ❌ 1http_requests       (can't start with digit)
  ❌ http.requests.total  (dots not allowed)
```

#### 2. Labels (Key-Value Pairs)

```
Definition: Labels add dimensions to a metric, allowing you to 
            differentiate between time series

Rules:
  → Label names must match: [a-zA-Z_][a-zA-Z0-9_]*
  → Label names starting with __ are reserved for internal use
  → Label values can be any Unicode string
  → Labels are what make Prometheus powerful (high cardinality!)

Special Labels (automatically added by Prometheus):
  → job: The job name from scrape config (e.g., "web-app")
  → instance: The target that was scraped (e.g., "app1:8080")

Examples:
  http_requests_total{job="api", instance="app1:8080", method="GET", status="200"}
  node_cpu_seconds_total{job="nodes", instance="server1:9100", cpu="0", mode="idle"}

⚠️ Cardinality Warning:
  High cardinality = too many unique label combinations = memory explosion!
  
  BAD:  http_requests_total{user_id="user_12345"} 
        → Millions of unique user IDs = millions of time series!
        
  GOOD: http_requests_total{method="GET", status="200"}
        → Limited combinations = manageable number of series
```

#### 3. Samples (Timestamp + Value)

```
Definition: Each data point in a time series is a sample consisting of:
  → A float64 value
  → A millisecond-precision timestamp

Characteristics:
  → Values are always 64-bit floating point numbers
  → Timestamps are Unix epoch in milliseconds
  → Samples are appended in chronological order
  → Prometheus stores samples efficiently (~1-2 bytes per sample)

Example:
  Metric: http_requests_total{method="GET"}
  
  Sample 1: (timestamp=1699000000000, value=1027.0)
  Sample 2: (timestamp=1699000015000, value=1042.0)
  Sample 3: (timestamp=1699000030000, value=1058.0)
  
  Note: Even though the counter is an integer, Prometheus stores it as float64
```

### Notation Format

```
Full notation:
  <metric_name>{<label_name>=<label_value>, ...}

Examples:
  http_requests_total{method="GET", status="200"}
  node_memory_MemAvailable_bytes{instance="server1:9100"}
  up{job="prometheus", instance="localhost:9090"}

In PromQL:
  # Instant vector (single point in time)
  http_requests_total{method="GET"}
  
  # Range vector (over a time window)
  http_requests_total{method="GET"}[5m]
```

### 💡 Key Takeaway for Exam
> **Time Series = Metric Name + Labels**
> Different label values = different time series
> Labels `job` and `instance` are added automatically
> Labels starting with `__` are internal/reserved
> High cardinality labels (like user_id) = BAD (memory explosion)
> Values are always float64, timestamps are millisecond precision

---

---

## 2.3 📖 METRIC NAMING CONVENTIONS

Prometheus has strict naming conventions that you MUST know for the exam.

### General Rules

```
1. Use snake_case (underscores, not hyphens or camelCase)
   ✅ http_requests_total
   ❌ httpRequestsTotal
   ❌ http-requests-total

2. Use base units (seconds, bytes, not milliseconds, megabytes)
   ✅ http_request_duration_seconds
   ❌ http_request_duration_milliseconds
   
   ✅ process_resident_memory_bytes
   ❌ process_resident_memory_megabytes

3. Include the unit in the metric name as a suffix
   ✅ node_cpu_seconds_total     (unit: seconds)
   ✅ node_memory_MemTotal_bytes (unit: bytes)
   ✅ http_request_duration_seconds (unit: seconds)

4. Use _total suffix for counters
   ✅ http_requests_total
   ✅ node_cpu_seconds_total
   ❌ http_requests (missing _total for a counter)

5. Use _ratio or _fraction for ratios (0 to 1)
   ✅ go_memstats_alloc_ratio

6. Don't put the metric type in the name
   ❌ http_requests_counter_total (redundant!)
   ✅ http_requests_total

7. Use _bucket, _sum, _count suffixes for histograms/summaries
   (These are auto-generated, don't create them manually)
```

### Common Metric Name Patterns

```
┌─────────────────────────────────────────────────────────────┐
│ Pattern                          │ Example                  │
├─────────────────────────────────────────────────────────────┤
│ <namespace>_<subsystem>_<name>   │ http_requests_total      │
│                                  │ node_cpu_seconds_total   │
│                                  │ process_open_fds         │
│                                  │ go_goroutines            │
├─────────────────────────────────────────────────────────────┤
│ Namespaces:                      │                          │
│   http, node, process, go,       │                          │
│   jvm, mysql, redis, kafka       │                          │
├─────────────────────────────────────────────────────────────┤
│ Units:                           │                          │
│   _seconds, _bytes, _total,      │                          │
│   _ratio, _info, _created        │                          │
└─────────────────────────────────────────────────────────────┘
```

### 💡 Key Takeaway for Exam
> **snake_case**, **base units** (seconds, bytes), **_total for counters**
> Include unit in name, don't include type in name
> Colons (:) reserved for recording rules only

---

---

## 2.4 📖 THE FOUR METRIC TYPES

This is one of the **most heavily tested** topics in the PCA exam!

### Type 1: COUNTER 🔢

**Definition:** A cumulative metric that **only goes up** (or resets to zero on restart). It represents a count of events.

**Key Characteristics:**
- Monotonically increasing (never decreases)
- Resets to 0 when the process restarts
- Used with `rate()`, `increase()`, `irate()` in PromQL
- Always has `_total` suffix (by convention)

**When to use:**
- Total HTTP requests served
- Total errors occurred
- Total bytes sent/received
- Total tasks completed
- Total CPU seconds consumed

**Examples:**
```
# Total HTTP requests (always increasing)
http_requests_total{method="GET", status="200"} 15432
http_requests_total{method="GET", status="404"} 234
http_requests_total{method="POST", status="500"} 12

# CPU time consumed (always increasing)
node_cpu_seconds_total{cpu="0", mode="user"} 78345.23
node_cpu_seconds_total{cpu="0", mode="idle"} 234567.89

# Bytes transmitted (always increasing)
node_network_transmit_bytes_total{device="eth0"} 9876543210
```

**PromQL Usage:**
```promql
# NEVER use raw counter values! Always use rate() or increase()

# Per-second rate of requests (last 5 minutes)
rate(http_requests_total[5m])

# Total increase in requests over last hour
increase(http_requests_total[1h])

# Instant rate (last 2 data points) — for volatile graphs
irate(http_requests_total[5m])

# Total requests per second across all instances
sum(rate(http_requests_total[5m]))
```

**Counter Reset Handling:**
```
Timeline:
  t=0:  counter = 100
  t=1:  counter = 150
  t=2:  counter = 200
  t=3:  counter = 0    ← PROCESS RESTARTED!
  t=4:  counter = 30
  t=5:  counter = 75

rate() and increase() AUTOMATICALLY handle this reset!
They detect the drop from 200 → 0 and adjust the calculation.

rate() over [t=0 to t=5]:
  = (75 + 200) / 5 seconds = 55 per second
  (It adds the pre-reset value to the post-reset value)
```

---

### Type 2: GAUGE 🌡️

**Definition:** A metric that represents a **single numerical value that can go up AND down**. It's a snapshot of the current state.

**Key Characteristics:**
- Can increase, decrease, or stay the same
- Represents a point-in-time value
- Can be used directly in PromQL (no need for `rate()`)
- No `_total` suffix

**When to use:**
- Current temperature
- Current memory usage
- Current number of active connections
- Current queue size
- Current CPU utilization percentage
- Number of goroutines currently running

**Examples:**
```
# Current memory usage (goes up and down)
process_resident_memory_bytes 256000000
node_memory_MemAvailable_bytes 4294967296

# Current temperature
node_hwmon_temp_celsius{chip="coretemp", sensor="temp1"} 65.0

# Current active connections
mysql_global_status_threads_connected 45

# Current queue depth
rabbitmq_queue_messages 1200

# Number of goroutines
go_goroutines 150

# Up/down status (1 = up, 0 = down)
up{job="web-app", instance="app1:8080"} 1
```

**PromQL Usage:**
```promql
# Use gauges directly (no rate needed!)
process_resident_memory_bytes

# Average memory across all instances
avg(process_resident_memory_bytes)

# Instances with memory > 1GB
process_resident_memory_bytes > 1073741824

# Current CPU idle percentage
avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100
# Note: node_cpu_seconds_total is a COUNTER, so we use rate()
# But the RESULT is a gauge-like value (percentage)
```

---

### Type 3: HISTOGRAM 📊

**Definition:** A histogram **samples observations** (usually request durations or response sizes) and counts them in **configurable buckets**. It also provides a sum and count of all observations.

**Key Characteristics:**
- Divides observations into buckets (ranges)
- Each bucket is a **cumulative counter** (le = "less than or equal")
- Automatically creates `_bucket`, `_sum`, and `_count` metrics
- Allows server-side quantile calculation using `histogram_quantile()`
- **Aggregatable** across instances (unlike Summary!)

**Auto-generated Metrics:**
```
# If you create a histogram called http_request_duration_seconds
# with buckets [0.1, 0.5, 1.0, 2.5, 5.0, 10.0]

# You get these metrics automatically:

# 1. Bucket counters (cumulative!)
http_request_duration_seconds_bucket{le="0.1"}  500    # ≤ 0.1s
http_request_duration_seconds_bucket{le="0.5"}  800    # ≤ 0.5s
http_request_duration_seconds_bucket{le="1.0"}  950    # ≤ 1.0s
http_request_duration_seconds_bucket{le="2.5"}  990    # ≤ 2.5s
http_request_duration_seconds_bucket{le="5.0"}  998    # ≤ 5.0s
http_request_duration_seconds_bucket{le="10.0"} 999    # ≤ 10.0s
http_request_duration_seconds_bucket{le="+Inf"} 1000   # ALL requests

# 2. Sum of all observed values
http_request_duration_seconds_sum 245.7

# 3. Count of all observations
http_request_duration_seconds_count 1000
```

**Understanding Cumulative Buckets:**
```
le="0.1"  → 500 requests took ≤ 0.1 seconds
le="0.5"  → 800 requests took ≤ 0.5 seconds (INCLUDES the 500 above!)
le="1.0"  → 950 requests took ≤ 1.0 seconds (INCLUDES the 800 above!)
le="+Inf" → 1000 total requests (MUST always equal _count)

So the actual distribution is:
  0.0 - 0.1s:  500 requests
  0.1 - 0.5s:  300 requests  (800 - 500)
  0.5 - 1.0s:  150 requests  (950 - 800)
  1.0 - 2.5s:   40 requests  (990 - 950)
  2.5 - 5.0s:    8 requests  (998 - 990)
  5.0 - 10.0s:   1 request   (999 - 998)
  > 10.0s:       1 request   (1000 - 999)
```

**PromQL Usage:**
```promql
# Calculate the 99th percentile latency
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# Calculate the 95th percentile latency
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# Calculate the 50th percentile (median)
histogram_quantile(0.5, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# Average request duration
rate(http_request_duration_seconds_sum[5m]) 
/ 
rate(http_request_duration_seconds_count[5m])

# Percentage of requests under 200ms
sum(rate(http_request_duration_seconds_bucket{le="0.2"}[5m])) 
/ 
sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m]))
```

**When to use Histogram:**
- Request durations (latency)
- Response sizes
- Processing times
- When you need to calculate quantiles across multiple instances
- When you want to aggregate data from multiple servers

---

### Type 4: SUMMARY 📋

**Definition:** A summary also samples observations but calculates **quantiles on the client side** (in the application). It provides pre-calculated quantile values.

**Key Characteristics:**
- Calculates quantiles (e.g., p50, p90, p99) **in the application**
- Also provides `_sum` and `_count` metrics
- Quantiles are **NOT aggregatable** across instances!
- More expensive on the client side (calculation overhead)
- Quantile values are exact (not approximations like histogram)

**Auto-generated Metrics:**
```
# If you create a summary called http_request_duration_seconds
# with quantiles [0.5, 0.9, 0.99]

# You get these metrics automatically:

# 1. Pre-calculated quantiles
http_request_duration_seconds{quantile="0.5"}  0.12   # Median: 120ms
http_request_duration_seconds{quantile="0.9"}  0.45   # p90: 450ms
http_request_duration_seconds{quantile="0.99"} 1.23   # p99: 1.23s

# 2. Sum of all observed values
http_request_duration_seconds_sum 245.7

# 3. Count of all observations
http_request_duration_seconds_count 1000
```

**PromQL Usage:**
```promql
# Read pre-calculated quantile directly
http_request_duration_seconds{quantile="0.99"}

# Average duration (same as histogram)
rate(http_request_duration_seconds_sum[5m]) 
/ 
rate(http_request_duration_seconds_count[5m])

# ⚠️ You CANNOT aggregate quantiles across instances!
# This is WRONG:
# sum(http_request_duration_seconds{quantile="0.99"}) 
# → Averaging percentiles is mathematically invalid!
```

---

### HISTOGRAM vs SUMMARY — The Big Comparison (Exam Critical!)

| Aspect | Histogram | Summary |
|--------|-----------|---------|
| **Quantile calculation** | Server-side (PromQL) | Client-side (application) |
| **Aggregatable?** | ✅ YES (across instances) | ❌ NO (mathematically invalid) |
| **Bucket/Quantile config** | Buckets configured in code | Quantiles configured in code |
| **Accuracy** | Approximation (depends on buckets) | Exact (for configured quantiles) |
| **Client overhead** | Low (just counting) | Higher (calculating quantiles) |
| **Flexibility** | Can calculate ANY quantile in PromQL | Only pre-configured quantiles |
| **Use case** | Multi-instance, distributed systems | Single instance, exact quantiles |
| **Auto metrics** | `_bucket{le="..."}`, `_sum`, `_count` | `{quantile="..."}`, `_sum`, `_count` |

### 🔍 Real-World Example: Choosing Between Histogram and Summary

```
Scenario: You have 10 instances of your web service behind a load balancer.
          You want to know the p99 latency across ALL instances.

Using HISTOGRAM ✅:
  → Each instance exposes bucket counts
  → In PromQL: sum(rate(..._bucket[5m])) by (le)
  → Then: histogram_quantile(0.99, ...)
  → Result: Accurate p99 across all 10 instances!

Using SUMMARY ❌:
  → Each instance exposes its own p99
  → Instance 1: p99 = 200ms
  → Instance 2: p99 = 500ms
  → Instance 3: p99 = 100ms
  → What's the overall p99? You CAN'T just average them!
  → avg(p99) = 267ms ← This is WRONG!
  → The actual p99 could be 800ms (if Instance 2 handles most traffic)

Conclusion: Use HISTOGRAM for distributed systems!
```

### 💡 Key Takeaway for Exam
> **Counter** = Only goes up (use `rate()`, `increase()`)
> **Gauge** = Goes up and down (use directly)
> **Histogram** = Buckets, server-side quantiles, AGGREGATABLE ✅
> **Summary** = Pre-calculated quantiles, NOT aggregatable ❌
> 
> For distributed systems → **Always prefer Histogram over Summary**
> Histogram buckets are CUMULATIVE (`le` = less than or equal)
> `_sum` and `_count` are available for both Histogram and Summary

---

---

## 2.5 📖 PROMETHEUS CONFIGURATION (prometheus.yml)

### Complete Configuration Structure

```yaml
# prometheus.yml — Complete annotated example

# ──────────────────────────────────────────────
# GLOBAL CONFIGURATION
# ──────────────────────────────────────────────
global:
  scrape_interval: 15s        # How often to scrape targets (default: 1m)
  evaluation_interval: 15s    # How often to evaluate rules (default: 1m)
  scrape_timeout: 10s         # Timeout for each scrape (default: 10s)
  
  # Labels added to all time series and alerts
  external_labels:
    cluster: 'production'
    region: 'us-east-1'
    environment: 'prod'

# ──────────────────────────────────────────────
# RULE FILES
# ──────────────────────────────────────────────
rule_files:
  - "alerting_rules.yml"      # Alerting rules
  - "recording_rules.yml"     # Recording rules
  - "/etc/prometheus/rules/*.yml"  # Glob patterns supported

# ──────────────────────────────────────────────
# ALERTING (Alertmanager configuration)
# ──────────────────────────────────────────────
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 'alertmanager1:9093'
            - 'alertmanager2:9093'
      scheme: http
      path_prefix: /
      timeout: 10s

# ──────────────────────────────────────────────
# SCRAPE CONFIGURATIONS
# ──────────────────────────────────────────────
scrape_configs:

  # Job 1: Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Job 2: Application servers (static)
  - job_name: 'web-app'
    scrape_interval: 10s          # Override global for this job
    scrape_timeout: 5s            # Override global for this job
    metrics_path: '/metrics'      # Default: /metrics
    scheme: http                  # Default: http
    static_configs:
      - targets: 
          - 'app1.example.com:8080'
          - 'app2.example.com:8080'
        labels:
          team: 'backend'
          env: 'production'

  # Job 3: Node Exporter (file-based SD)
  - job_name: 'node-exporter'
    file_sd_configs:
      - files:
          - '/etc/prometheus/targets/nodes.json'
        refresh_interval: 30s

  # Job 4: Kubernetes pods
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['default', 'monitoring']
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: ${1}:${2}

  # Job 5: Blackbox Exporter (probing)
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com
          - https://prometheus.io
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  # Job 6: Pushgateway
  - job_name: 'pushgateway'
    honor_labels: true            # Important for Pushgateway!
    static_configs:
      - targets: ['pushgateway:9091']
```

### Key Configuration Concepts

#### 1. Job vs Instance vs Target
```
Job:      A logical group of targets (e.g., "web-app", "database")
          → Defined by job_name in scrape_configs
          → Added as the "job" label to all metrics

Instance: A specific endpoint being scraped (e.g., "app1:8080")
          → Added as the "instance" label automatically
          → Usually host:port

Target:   The actual URL being scraped
          → e.g., http://app1:8080/metrics

Example:
  job="web-app", instance="app1:8080" → target: http://app1:8080/metrics
  job="web-app", instance="app2:8080" → target: http://app2:8080/metrics
  job="database", instance="db1:9104" → target: http://db1:9104/metrics
```

#### 2. honor_labels vs honor_timestamps
```yaml
honor_labels: true
  → Keeps the labels from the scraped target as-is
  → Prometheus won't override "job" and "instance" labels
  → ESSENTIAL for Pushgateway and federation
  → Default: false

honor_timestamps: true
  → Uses the timestamps from the scraped target
  → Default: true
  → Set to false if you want Prometheus to use its own scrape time
```

#### 3. metrics_path and scheme
```yaml
metrics_path: '/metrics'    # Default path to scrape
scheme: 'http'              # Default scheme (http or https)

# Custom example:
metrics_path: '/actuator/prometheus'  # Spring Boot apps
scheme: 'https'
```

#### 4. Relabeling (Preview — covered more in Domain 6)
```yaml
relabel_configs:        # Applied BEFORE scraping (on targets)
  - source_labels: [__address__]
    target_label: instance
    
metric_relabel_configs: # Applied AFTER scraping (on metrics)
  - source_labels: [__name__]
    regex: 'go_.*'
    action: drop         # Drop all Go runtime metrics
```

### 💡 Key Takeaway for Exam
> **global** section sets defaults for all scrape configs
> **scrape_interval** default is 1m, **evaluation_interval** default is 1m
> **job_name** becomes the `job` label, target address becomes `instance` label
> **honor_labels: true** is critical for Pushgateway
> **rule_files** loads alerting and recording rules
> **alerting** section configures Alertmanager connection
> Each job can override global settings

---

---

## 2.6 📖 STORAGE & TSDB INTERNALS

### Prometheus Local Storage (TSDB)

Prometheus uses its own **Time Series Database (TSDB)** for local storage.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PROMETHEUS TSDB                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              HEAD BLOCK (In-Memory)              │    │
│  │  → Receives all new incoming samples             │    │
│  │  → Keeps last ~2 hours of data in memory         │    │
│  │  → Uses WAL (Write-Ahead Log) for crash recovery │    │
│  │  → When full → Compacted to disk as a block      │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │ compaction (every 2 hours)    │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │            PERSISTED BLOCKS (On Disk)            │    │
│  │                                                  │    │
│  │  Block 1: [0h - 2h]    (compressed, immutable)  │    │
│  │  Block 2: [2h - 4h]    (compressed, immutable)  │    │
│  │  Block 3: [4h - 6h]    (compressed, immutable)  │    │
│  │  ...                                             │    │
│  │  Block N: [Xh - Yh]    (compressed, immutable)  │    │
│  │                                                  │    │
│  │  Larger blocks created by merging smaller ones:  │    │
│  │  [0h-2h] + [2h-4h] + [4h-6h] → [0h-6h]         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Storage path: /prometheus/data/ (default)               │
│  Each block is a directory with:                         │
│    → meta.json (block metadata)                          │
│    → index (series index)                                │
│    → chunks/ (compressed sample data)                    │
│    → tombstones (deleted series)                         │
└─────────────────────────────────────────────────────────┘
```

### Key Storage Concepts

#### 1. Write-Ahead Log (WAL)
```
Purpose: Prevents data loss if Prometheus crashes

How it works:
  1. Every incoming sample is first written to the WAL (on disk)
  2. Then it's stored in the Head block (in memory)
  3. If Prometheus crashes, it replays the WAL on restart
  4. WAL is truncated after the Head block is compacted to disk

Location: /prometheus/data/wal/
```

#### 2. Compaction
```
Purpose: Merge small blocks into larger ones for efficiency

Process:
  → Head block (2h in memory) → Compacted to 2h disk block
  → Three 2h blocks → Merged into one 6h block
  → Three 6h blocks → Merged into one 18h block
  → And so on...

Benefits:
  → Reduces the number of files
  → Improves query performance
  → Better compression ratios
```

#### 3. Retention
```
Two ways to control how long data is kept:

By Time (default):
  --storage.tsdb.retention.time=15d    # Keep 15 days (default)
  --storage.tsdb.retention.time=6h     # Keep 6 hours
  --storage.tsdb.retention.time=1y     # Keep 1 year

By Size:
  --storage.tsdb.retention.size=50GB   # Keep max 50GB of data
  --storage.tsdb.retention.size=100GB  # Keep max 100GB

Both can be combined:
  --storage.tsdb.retention.time=30d
  --storage.tsdb.retention.size=100GB
  → Data is deleted when EITHER limit is reached

⚠️ Important: Retention applies to BLOCKS, not individual samples.
   A block is only deleted when its ENTIRE time range is outside
   the retention window.
```

#### 4. Storage Efficiency
```
Prometheus TSDB is very efficient:
  → ~1-2 bytes per sample (after compression)
  → A single Prometheus server can handle:
      • Millions of active time series
      • Hundreds of thousands of samples per second
  → Typical storage: ~10GB per day for 1M active series at 15s scrape

Example calculation:
  1,000,000 series × 4 scrapes/minute × 60 min × 24 hours
  = 5,760,000,000 samples/day
  × 1.5 bytes/sample
  ≈ 8.6 GB/day
```

### Important Storage Flags

```bash
# Data directory
--storage.tsdb.path=/prometheus/data

# Retention
--storage.tsdb.retention.time=15d
--storage.tsdb.retention.size=50GB

# Minimum block duration
--storage.tsdb.min-block-duration=2h    # Default: 2h

# Maximum block duration
--storage.tsdb.max-block-duration=36h   # Default: 36h

# Disable compaction (not recommended!)
--storage.tsdb.no-lockfile

# WAL compression
--storage.tsdb.wal-compression          # Enable WAL compression
```

### 💡 Key Takeaway for Exam
> **TSDB** = Prometheus's built-in local time series database
> **Head block** = Last ~2 hours in memory, uses WAL for crash safety
> **Persisted blocks** = Compressed, immutable blocks on disk
> **Compaction** = Merges small blocks into larger ones
> **Retention** = Controlled by time (`--storage.tsdb.retention.time`) or size
> **Default retention** = 15 days
> **Storage efficiency** = ~1-2 bytes per sample

---

---

## 2.7 📖 EXPOSITION FORMAT

### What is the Exposition Format?

The exposition format is the **text-based format** that targets use to expose metrics on the `/metrics` endpoint. Prometheus scrapes this format.

### Format Structure

```
# Each metric has:
# 1. HELP line (description) — optional but recommended
# 2. TYPE line (metric type) — required
# 3. Data lines (actual metric values)

# ─── COUNTER Example ───
# HELP http_requests_total The total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="post",code="200"} 1027
http_requests_total{method="post",code="400"} 3
http_requests_total{method="get",code="200"} 15432

# ─── GAUGE Example ───
# HELP node_memory_MemAvailable_bytes Available memory in bytes.
# TYPE node_memory_MemAvailable_bytes gauge
node_memory_MemAvailable_bytes 4294967296

# ─── HISTOGRAM Example ───
# HELP http_request_duration_seconds Request duration in seconds.
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.05"} 24054
http_request_duration_seconds_bucket{le="0.1"} 33444
http_request_duration_seconds_bucket{le="0.2"} 100392
http_request_duration_seconds_bucket{le="0.5"} 129389
http_request_duration_seconds_bucket{le="1"} 133988
http_request_duration_seconds_bucket{le="+Inf"} 144320
http_request_duration_seconds_sum 53423
http_request_duration_seconds_count 144320

# ─── SUMMARY Example ───
# HELP rpc_duration_seconds RPC duration in seconds.
# TYPE rpc_duration_seconds summary
rpc_duration_seconds{quantile="0.01"} 3102
rpc_duration_seconds{quantile="0.05"} 3272
rpc_duration_seconds{quantile="0.5"} 4773
rpc_duration_seconds{quantile="0.9"} 9001
rpc_duration_seconds{quantile="0.99"} 76656
rpc_duration_seconds_sum 1.7560473e+07
rpc_duration_seconds_count 2693

# ─── Special: "up" metric ───
# Automatically generated by Prometheus for each scrape
# up{job="web", instance="app1:8080"} 1   ← Target is healthy
# up{job="web", instance="app2:8080"} 0   ← Target is DOWN!

# ─── Special: "scrape_duration_seconds" ───
# How long the scrape took
# scrape_duration_seconds{job="web"} 0.023

# ─── Special: "scrape_samples_scraped" ───
# How many samples were scraped
# scrape_samples_scraped{job="web"} 342
```

### Format Rules

```
1. Lines starting with # are comments (except HELP and TYPE)
2. # HELP <metric_name> <description>
3. # TYPE <metric_name> <type>  (counter|gauge|histogram|summary|untyped)
4. Metric lines: <metric_name>{<labels>} <value> [<timestamp>]
5. Labels are comma-separated key="value" pairs inside {}
6. Label values must be in double quotes
7. Timestamp is optional (Unix epoch in milliseconds)
8. Empty lines are allowed
9. Encoding must be UTF-8
10. Content-Type header should be: text/plain; version=0.0.4
    (or application/openmetrics-text for OpenMetrics)
```

### 💡 Key Takeaway for Exam
> Exposition format is **text-based**, exposed on `/metrics`
> Each metric should have `# HELP` and `# TYPE` lines
> Types: counter, gauge, histogram, summary, untyped
> Special auto-generated metrics: `up`, `scrape_duration_seconds`, `scrape_samples_scraped`
> `up = 1` means target is healthy, `up = 0` means target is DOWN

---

---

## 2.8 📖 STALENESS & TIMESTAMPS

### Staleness

**Definition:** Staleness is Prometheus's mechanism for handling time series that stop receiving new samples (e.g., when a target goes down or a label combination disappears).

```
How it works:
  1. Prometheus scrapes a target every 15 seconds
  2. Each scrape produces a set of time series
  3. If a time series is NOT present in the latest scrape,
     it is marked as "stale" after 5 minutes
  4. Stale series return "StaleNaN" in queries
  5. This prevents showing outdated data as if it were current

Example:
  t=0:   http_requests_total{status="200"} = 100  ✅ scraped
  t=15s: http_requests_total{status="200"} = 115  ✅ scraped
  t=30s: http_requests_total{status="200"} = 130  ✅ scraped
  t=45s: (target goes down, scrape fails)
  t=60s: (still down)
  ...
  t=5m:  Series marked as STALE ❌
         Queries will no longer return this series
         
Why 5 minutes?
  → Default stale timeout = 5 minutes (lookback delta)
  → Configurable via --query.lookback-delta flag
  → Should be at least 2× the scrape interval
```

### The `up` Metric and Staleness

```
The "up" metric is the most important staleness indicator:

up{job="web", instance="app1:8080"} 1  → Target was scraped successfully
up{job="web", instance="app2:8080"} 0  → Scrape failed (target down)

Common alerting pattern:
  - alert: InstanceDown
    expr: up == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Instance {{ $labels.instance }} is down"
```

### Timestamps

```
Prometheus timestamps:
  → Millisecond precision (Unix epoch)
  → Added automatically at scrape time
  → Targets CAN provide their own timestamps (honor_timestamps: true)
  → Recording rules use evaluation time as timestamp

Example:
  Scraped at: 2024-11-15T10:30:00.000Z
  Timestamp:  1731667800000 (milliseconds since epoch)
  Value:      1027.0
```

### 💡 Key Takeaway for Exam
> **Staleness** = Series not seen in 5 minutes are marked stale
> **Lookback delta** = 5 minutes default (`--query.lookback-delta`)
> **up = 0** means target is down (scrape failed)
> **up = 1** means target is healthy (scrape succeeded)
> Stale series return StaleNaN, not the last known value

---

---

## 2.9 📖 FEDERATION

### What is Federation?

Federation allows one Prometheus server to **scrape metrics from another Prometheus server**. This is used for hierarchical monitoring setups.

### Architecture

```
┌─────────────────────────────────────────────────┐
│           GLOBAL PROMETHEUS (Tier 2)             │
│  Scrapes aggregated metrics from regional servers│
│                                                  │
│  scrape_configs:                                 │
│    - job_name: 'federate'                        │
│      honor_labels: true                          │
│      metrics_path: '/federate'                   │
│      params:                                     │
│        'match[]':                                │
│          - '{job="prometheus"}'                  │
│          - 'up'                                  │
│          - 'sum:http_requests:rate5m'            │
│      static_configs:                             │
│        - targets:                                │
│            - 'prometheus-us-east:9090'           │
│            - 'prometheus-eu-west:9090'           │
└──────────────────┬──────────────┬───────────────┘
                   │              │
          /federate│              │/federate
                   ▼              ▼
┌──────────────────────┐  ┌──────────────────────┐
│  REGIONAL PROMETHEUS │  │  REGIONAL PROMETHEUS │
│  (US-East, Tier 1)   │  │  (EU-West, Tier 1)   │
│  Scrapes all local   │  │  Scrapes all local   │
│  targets directly    │  │  targets directly    │
└──────────────────────┘  └──────────────────────┘
```

### Key Points

```
1. The /federate endpoint returns metrics matching the given selectors
2. honor_labels: true is ESSENTIAL (preserves original job/instance)
3. Use recording rules on Tier 1 to pre-aggregate data
4. Federation is for HIERARCHICAL setups, not for HA
5. Don't federate raw data — federate aggregated/recording rule data
```

### 💡 Key Takeaway for Exam
> **Federation** = Prometheus scraping another Prometheus
> Uses `/federate` endpoint with `match[]` parameters
> **honor_labels: true** is required
> Used for hierarchical monitoring (regional → global)
> Federate aggregated data, not raw metrics

---

---

## 2.10 📖 REMOTE READ / REMOTE WRITE

### Why Remote Storage?

```
Problem: Prometheus local storage is:
  → Single-node (not distributed)
  → Limited by local disk
  → Limited retention (typically days/weeks)
  → No built-in replication

Solution: Remote Read/Write to external long-term storage
```

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  PROMETHEUS SERVER                   │
│                                                      │
│  Scrape → TSDB (local) ──┬──→ Remote Write ──→      │
│                          │                           │
│                          │    ┌──────────────────┐   │
│                          └──→ │  Remote Storage   │   │
│                               │  (Thanos, Cortex, │   │
│  Query ← TSDB (local) ──┬──→ │  VictoriaMetrics, │   │
│                          │    │  InfluxDB, etc.)  │   │
│                          └──→ │                   │   │
│                               └──────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Configuration

```yaml
# prometheus.yml

remote_write:
  - url: "http://thanos-receive:19291/api/v1/receive"
    queue_config:
      max_samples_per_send: 1000
      batch_send_deadline: 5s
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'go_.*'
        action: drop  # Don't send Go metrics to remote

remote_read:
  - url: "http://thanos-query:10902/api/v1/read"
    read_recent: true  # Also read recent data from remote
```

### Remote Storage Solutions

```
┌─────────────────────┬──────────────────────────────────────┐
│ Solution            │ Description                          │
├─────────────────────┼──────────────────────────────────────┤
│ Thanos              │ CNCF project, adds HA + long-term    │
│                     │ storage + global query to Prometheus │
├─────────────────────┼──────────────────────────────────────┤
│ Cortex              │ Horizontally scalable Prometheus     │
│                     │ as a service (now Grafana Mimir)     │
├─────────────────────┼──────────────────────────────────────┤
│ VictoriaMetrics     │ High-performance TSDB, drop-in       │
│                     │ replacement for Prometheus storage   │
├─────────────────────┼──────────────────────────────────────┤
│ InfluxDB            │ Time-series database with remote     │
│                     │ write support                        │
├─────────────────────┼──────────────────────────────────────┤
│ Grafana Mimir       │ Successor to Cortex, scalable        │
│                     │ long-term storage                    │
└─────────────────────┴──────────────────────────────────────┘
```

### 💡 Key Takeaway for Exam
> **Remote Write** = Send data to external storage (Thanos, Cortex, etc.)
> **Remote Read** = Query data from external storage
> Prometheus local storage is single-node, not distributed
> Remote storage solves: long-term retention, HA, global queries
> `remote_write` and `remote_read` configured in prometheus.yml

---

---

## 2.11 📖 REAL-WORLD SCENARIOS

### Scenario 1: Choosing the Right Metric Type

```
You're instrumenting a new payment service. Which metric type for each?

1. Total number of payments processed
   → COUNTER ✅ (only goes up, cumulative count)
   → Name: payment_processed_total

2. Current number of active payment sessions
   → GAUGE ✅ (goes up and down)
   → Name: payment_active_sessions

3. Distribution of payment processing times
   → HISTOGRAM ✅ (need to aggregate across 10 instances)
   → Name: payment_processing_duration_seconds

4. Current CPU temperature of the server
   → GAUGE ✅ (fluctuates up and down)
   → Name: node_hwmon_temp_celsius

5. Total bytes sent to the payment gateway
   → COUNTER ✅ (cumulative, only increases)
   → Name: payment_gateway_bytes_sent_total
```

### Scenario 2: Debugging a Storage Issue

```
Problem: Prometheus is running out of disk space.

Investigation:
  $ du -sh /prometheus/data/
  450G  /prometheus/data/
  
  $ promtool tsdb list /prometheus/data/
  BLOCK ULID    MIN TIME    MAX TIME    DURATION   NUM SAMPLES  SIZE
  01HXYZ...     1699000000  1699007200  2h0m0s     50000000     2.1GB
  ... (hundreds of blocks)

Solution:
  1. Reduce retention:
     --storage.tsdb.retention.time=7d  (was 30d)
     --storage.tsdb.retention.size=100GB
  
  2. Drop unnecessary metrics:
     metric_relabel_configs:
       - source_labels: [__name__]
         regex: 'go_.*|process_.*'
         action: drop
  
  3. Reduce scrape frequency for non-critical targets:
     scrape_interval: 60s  (was 15s)
```

---

---

## 2.12 📝 EXAM-STYLE QUESTIONS (30 Questions)

### Question 1
**Which of the following is NOT a component of the Prometheus server?**

A) Retrieval Module (Scrape Manager)
B) Storage Module (TSDB)
C) Alertmanager
D) HTTP Server (API & UI)

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Alertmanager is a **separate component** in the Prometheus ecosystem, NOT part of the Prometheus server itself. The Prometheus server consists of three internal modules: Retrieval (scraping), Storage (TSDB), and HTTP Server (API/UI). Alertmanager receives alerts from Prometheus but runs as its own binary.
</details>

---

### Question 2
**What is the default scrape interval in Prometheus?**

A) 10 seconds
B) 15 seconds
C) 30 seconds
D) 1 minute

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: D**

The default `scrape_interval` in Prometheus is **1 minute (60s)**. This can be overridden globally in the `global` section or per-job in `scrape_configs`. Most production setups override this to 15s or 30s for more granular data.
</details>

---

### Question 3
**Which metric type should you use to track the total number of HTTP requests served by your application?**

A) Gauge
B) Counter
C) Histogram
D) Summary

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

A **Counter** is the correct type for tracking cumulative counts that only increase (like total HTTP requests). Counters are monotonically increasing and reset to zero only on process restart. You would then use `rate()` or `increase()` in PromQL to calculate the per-second rate or total increase over a time window.
</details>

---

### Question 4
**What is the key difference between a Histogram and a Summary in Prometheus?**

A) Histograms track counts while Summaries track durations
B) Histogram quantiles are calculated server-side and are aggregatable; Summary quantiles are calculated client-side and are NOT aggregatable
C) Summaries are more accurate than Histograms in all cases
D) Histograms cannot calculate percentiles

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The fundamental difference is WHERE quantiles are calculated and whether they can be aggregated. Histograms store bucket counts, and quantiles are calculated at query time using `histogram_quantile()` — this allows aggregation across instances. Summaries pre-calculate quantiles in the application code, and averaging percentiles across instances is mathematically invalid.
</details>

---

### Question 5
**What does the `up` metric indicate in Prometheus?**

A) The uptime of the Prometheus server
B) The CPU utilization of the target
C) Whether the last scrape of a target was successful (1) or failed (0)
D) The number of active targets

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `up` metric is automatically generated by Prometheus for every scrape target. `up = 1` means the last scrape was successful (target is healthy). `up = 0` means the scrape failed (target is down or unreachable). It's the most fundamental health check metric in Prometheus.
</details>

---

### Question 6
**Which of the following is a valid Prometheus metric name?**

A) http-requests-total
B) http_requests_total
C) 2http_requests
D) http.requests.total

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Prometheus metric names must match the regex `[a-zA-Z_:][a-zA-Z0-9_:]*`. They must start with a letter, underscore, or colon, and can only contain letters, digits, underscores, and colons. Hyphens (A), leading digits (C), and dots (D) are not allowed.
</details>

---

### Question 7
**What happens to a counter metric when the application restarts?**

A) It continues from the last value
B) It resets to zero
C) It becomes a gauge
D) It is deleted from Prometheus

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

When an application restarts, all in-memory counters reset to zero. Prometheus functions like `rate()` and `increase()` automatically detect and handle counter resets. They see the value drop from a high number to zero and adjust the calculation accordingly.
</details>

---

### Question 8
**Which PromQL function should you use with a Counter metric to get the per-second rate?**

A) `avg()`
B) `sum()`
C) `rate()`
D) `histogram_quantile()`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `rate()` function calculates the per-second average rate of increase of a counter over a specified time window. For example, `rate(http_requests_total[5m])` gives the per-second rate of HTTP requests averaged over the last 5 minutes. You should NEVER use raw counter values directly — always use `rate()`, `increase()`, or `irate()`.
</details>

---

### Question 9
**What is the default data retention period in Prometheus?**

A) 7 days
B) 15 days
C) 30 days
D) 90 days

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The default retention period in Prometheus is **15 days**. This can be changed using the `--storage.tsdb.retention.time` flag (e.g., `--storage.tsdb.retention.time=30d`). You can also set a size-based retention with `--storage.tsdb.retention.size`.
</details>

---

### Question 10
**What is the purpose of the Write-Ahead Log (WAL) in Prometheus?**

A) To store long-term historical data
B) To compress old data blocks
C) To prevent data loss

---

# 📘 PCA EXAM — DOMAIN 2: PROMETHEUS FUNDAMENTALS (Continued)
## *Questions 10–30 + Summary Cheat Sheet*

---

### Question 10 (Complete Answer)
**What is the purpose of the Write-Ahead Log (WAL) in Prometheus?**

A) To store long-term historical data
B) To compress old data blocks
C) To prevent data loss if Prometheus crashes before the Head block is compacted to disk
D) To replicate data to remote storage

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The WAL (Write-Ahead Log) ensures crash recovery. Every incoming sample is first written to the WAL on disk before being stored in the in-memory Head block. If Prometheus crashes, it replays the WAL on restart to recover any data that hadn't been compacted to a persistent block yet. The WAL is NOT for long-term storage (A), compression (B), or remote replication (D).
</details>

---

### Question 11
**In the Prometheus data model, what makes two time series different from each other?**

A) Different metric names only
B) Different timestamps only
C) Different metric names OR different label combinations
D) Different values

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

A time series in Prometheus is uniquely identified by its **metric name + the complete set of label key-value pairs**. If either the metric name differs OR any label value differs, it's a completely separate time series. For example, `http_requests_total{method="GET"}` and `http_requests_total{method="POST"}` are two distinct time series. Timestamps and values are the data WITHIN a time series, not identifiers.
</details>

---

### Question 12
**Which labels are automatically added by Prometheus to every scraped time series?**

A) `cluster` and `region`
B) `job` and `instance`
C) `host` and `port`
D) `service` and `namespace`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Prometheus automatically adds two labels to every scraped time series:
- **`job`**: The `job_name` from the scrape configuration
- **`instance`**: The `<host>:<port>` of the target being scraped

Labels like `cluster`, `region`, `service`, and `namespace` can be added via relabeling or `external_labels`, but they are NOT automatic. `host` and `port` are not standard Prometheus labels.
</details>

---

### Question 13
**What does the `honor_labels: true` configuration do in a scrape job?**

A) It renames all labels to lowercase
B) It prevents Prometheus from overriding labels that already exist in the scraped data (like `job` and `instance`)
C) It drops all labels from the scraped metrics
D) It adds additional labels from the Prometheus server

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

When `honor_labels: true` is set, Prometheus keeps the `job` and `instance` labels (and any other conflicting labels) as they appear in the scraped data, instead of overwriting them with the values from the scrape configuration. This is **critical for Pushgateway and Federation**, where the original labels must be preserved. By default, `honor_labels` is `false`, meaning Prometheus overwrites conflicting labels.
</details>

---

### Question 14
**Which of the following is the correct way to calculate average request duration from a Histogram?**

A) `avg(http_request_duration_seconds)`
B) `histogram_quantile(0.5, rate(http_request_duration_seconds_bucket[5m]))`
C) `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])`
D) `sum(http_request_duration_seconds_sum) / sum(http_request_duration_seconds_count)`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

To calculate the **average** request duration from a Histogram, you divide the rate of the `_sum` (total duration) by the rate of the `_count` (total number of observations). Both `_sum` and `_count` are counters, so you must use `rate()`. Option B calculates the median (p50), not the average. Option A is invalid syntax for histograms. Option D uses raw counter values without `rate()`, which is incorrect.
</details>

---

### Question 15
**What is the Prometheus Pushgateway used for?**

A) Replacing the pull model for all monitoring targets
B) Pushing metrics from behind a firewall
C) Accepting metrics from short-lived batch jobs that cannot be scraped
D) Sending alerts to external systems

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The Pushgateway is specifically designed for **short-lived batch jobs** (cron jobs, CI/CD pipelines, serverless functions) that may complete before Prometheus has a chance to scrape them. The job pushes its metrics to the Pushgateway, and Prometheus scrapes the Pushgateway. It should NOT be used as a general replacement for the pull model (A), for firewall traversal (B — use federation or remote write), or for alerting (D — that's Alertmanager).
</details>

---

### Question 16
**What is the default value of `evaluation_interval` in Prometheus?**

A) 10 seconds
B) 15 seconds
C) 30 seconds
D) 1 minute

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: D**

The default `evaluation_interval` is **1 minute (60s)**, same as the default `scrape_interval`. This controls how often Prometheus evaluates alerting and recording rules. It's configured in the `global` section of `prometheus.yml`.
</details>

---

### Question 17
**Which of the following metric names follows Prometheus naming conventions correctly?**

A) `http_request_duration_milliseconds`
B) `httpRequestDurationSeconds`
C) `http_request_duration_seconds`
D) `http_request_duration_seconds_counter`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Prometheus naming conventions require:
- **snake_case** (eliminates B which is camelCase)
- **Base units** (eliminates A — should be seconds, not milliseconds)
- **No type in the name** (eliminates D — don't put "counter" in the name)

`http_request_duration_seconds` follows all conventions: snake_case, base unit (seconds), and no redundant type suffix.
</details>

---

### Question 18
**What does the `le` label in a Histogram bucket represent?**

A) "last event" — the timestamp of the last observation
B) "less than or equal" — the upper bound of the bucket
C) "log entry" — the log level of the observation
D) "latency estimate" — the estimated latency

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `le` label stands for **"less than or equal"**. It represents the upper inclusive bound of a histogram bucket. For example, `http_request_duration_seconds_bucket{le="0.5"}` counts all requests that took ≤ 0.5 seconds. Histogram buckets are **cumulative**, meaning the `le="0.5"` bucket includes all requests counted in the `le="0.1"` bucket.
</details>

---

### Question 19
**Which of the following is TRUE about Prometheus local storage (TSDB)?**

A) It is a distributed database that replicates data across nodes
B) It stores data in a single file for simplicity
C) It stores data in time-ordered blocks, with the most recent data in an in-memory Head block
D) It requires an external database like PostgreSQL

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Prometheus TSDB stores data in **time-ordered blocks**. The most recent ~2 hours of data is kept in an in-memory **Head block** (protected by the WAL). When the Head block is full, it's compacted to disk as an immutable persisted block. Smaller blocks are periodically merged into larger ones through compaction. TSDB is NOT distributed (A), NOT a single file (B), and does NOT require an external database (D) — it's fully self-contained.
</details>

---

### Question 20
**What is the purpose of `external_labels` in the Prometheus global configuration?**

A) To label targets that are outside the network
B) To add labels to all time series and alerts produced by this Prometheus instance, useful for federation and remote write
C) To override labels from scraped targets
D) To configure labels for the Alertmanager

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`external_labels` are added to **all time series and alerts** produced by this Prometheus server. They are primarily used in **federation** and **remote write** scenarios to identify which Prometheus instance produced the data. For example, you might set `cluster: 'us-east-1'` and `replica: 'prometheus-1'` so that when data is sent to a central Thanos or Cortex, you can distinguish the source.
</details>

---

### Question 21
**Which of the following correctly describes the relationship between a Prometheus "job" and an "instance"?**

A) A job is a single target; an instance is a group of targets
B) A job is a logical group of targets; an instance is a specific target endpoint within that job
C) They are the same thing
D) A job runs on an instance

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

A **job** is a logical grouping of targets that serve the same purpose (e.g., `job="web-app"` groups all web application servers). An **instance** is a specific target endpoint within that job (e.g., `instance="app1:8080"`, `instance="app2:8080"`). One job can have many instances. The `job` label comes from `job_name` in the scrape config, and the `instance` label comes from the target's address.
</details>

---

### Question 22
**What is the exposition format content type header that Prometheus expects?**

A) `application/json`
B) `text/html`
C) `text/plain; version=0.0.4`
D) `application/xml`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The Prometheus exposition format uses the content type `text/plain; version=0.0.4`. This is the standard text-based format for the `/metrics` endpoint. The newer OpenMetrics format uses `application/openmetrics-text`. JSON (A), HTML (B), and XML (D) are not used for Prometheus metric exposition.
</details>

---

### Question 23
**Which of the following scenarios would cause a counter to reset to zero?**

A) When the counter reaches its maximum value
B) When the Prometheus server restarts
C) When the application/process that exposes the counter restarts
D) When the scrape interval changes

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

A counter resets to zero when the **application or process** that maintains the counter restarts, because the counter is stored in the application's memory. When the process restarts, all in-memory state is lost. Prometheus server restarts (B) don't affect the counter — Prometheus stores historical data in TSDB. Counters don't have a maximum value (A), and scrape interval changes (D) don't affect counter values.
</details>

---

### Question 24
**What is the purpose of the `/federate` endpoint in Prometheus?**

A) To send alerts to Alertmanager
B) To allow one Prometheus server to scrape selected metrics from another Prometheus server
C) To expose metrics to Grafana
D) To push metrics to remote storage

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `/federate` endpoint allows hierarchical Prometheus setups where a "global" Prometheus server scrapes aggregated metrics from "regional" Prometheus servers. You specify which metrics to federate using `match[]` URL parameters. This is useful for multi-datacenter or multi-team setups where each team has their own Prometheus, and a central server aggregates key metrics.
</details>

---

### Question 25
**Which of the following is NOT a valid metric type in Prometheus?**

A) Counter
B) Gauge
C) Histogram
D) Timer

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: D**

Prometheus has exactly **four** metric types: **Counter, Gauge, Histogram, and Summary**. "Timer" is NOT a Prometheus metric type. Some other monitoring systems (like StatsD or Dropwizard) have a Timer type, but in Prometheus, you would use a Histogram or Summary to track durations/timers.
</details>

---

### Question 26
**What does the `scrape_timeout` configuration control?**

A) How long Prometheus waits before marking a target as permanently down
B) The maximum time Prometheus waits for a single scrape request to complete
C) How long metrics are retained in the TSDB
D) The interval between scrape retries after a failure

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`scrape_timeout` defines the **maximum duration** Prometheus will wait for a single scrape HTTP request to complete. If the target doesn't respond within this time, the scrape is considered failed. The default is 10 seconds. It must be less than or equal to `scrape_interval`. It does NOT control permanent down detection (A), retention (C), or retry intervals (D).
</details>

---

### Question 27
**In Prometheus TSDB, what is "compaction"?**

A) Deleting old data to free disk space
B) Compressing individual samples to save memory
C) Merging smaller time-ordered blocks into larger blocks for efficiency
D) Encrypting stored data for security

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Compaction is the process of **merging smaller blocks into larger blocks**. For example, three 2-hour blocks are merged into one 6-hour block, and three 6-hour blocks into one 18-hour block. This reduces the number of files on disk, improves query performance (fewer blocks to scan), and achieves better compression ratios. Compaction is NOT deletion (A — that's retention), NOT individual sample compression (B), and NOT encryption (D).
</details>

---

### Question 28
**Which of the following PromQL queries correctly identifies targets that are currently down?**

A) `up == 1`
B) `up == 0`
C) `down == 1`
D) `target_status == "down"`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `up` metric is automatically generated by Prometheus. `up == 1` means the target is healthy (scrape succeeded). `up == 0` means the target is DOWN (scrape failed). There is no `down` metric (C) or `target_status` metric (D) in Prometheus. A common alerting rule is: `expr: up == 0` with `for: 5m` to alert when a target has been down for 5 minutes.
</details>

---

### Question 29
**What is the recommended approach for long-term storage of Prometheus data?**

A) Increase `--storage.tsdb.retention.time` to 10 years
B) Use remote write to send data to a long-term storage solution like Thanos, Cortex, or VictoriaMetrics
C) Export all data to CSV files daily
D) Use the Pushgateway for long-term storage

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The recommended approach for long-term storage is to use **remote write** to send data to a purpose-built long-term storage solution like **Thanos, Cortex (Grafana Mimir), or VictoriaMetrics**. While you CAN increase local retention (A), Prometheus's local TSDB is not designed for years of data — it's single-node and limited by local disk. CSV export (C) is impractical. Pushgateway (D) is for batch jobs, not storage.
</details>

---

### Question 30
**Which of the following statements about Prometheus metric labels is TRUE?**

A) Label names starting with `__` (double underscore) are reserved for internal use
B) Labels can contain any character including spaces and special symbols
C) High-cardinality labels like `user_id` are recommended for detailed monitoring
D) Label values must be numeric

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

Label names starting with `__` (double underscore) are **reserved for internal use** by Prometheus. Examples include `__address__`, `__scheme__`, `__metrics_path__`, and `__meta_*` labels from service discovery. These are used during relabeling and are typically dropped before storage. Label names must match `[a-zA-Z_][a-zA-Z0-9_]*` (B is wrong). High-cardinality labels cause memory explosion (C is wrong). Label values are strings, not numeric (D is wrong).
</details>

---

---

## ✅ DOMAIN 2 REVISION SUMMARY CHEAT SHEET

```
┌──────────────────────────────────────────────────────────────────┐
│                   DOMAIN 2 CHEAT SHEET                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ARCHITECTURE:                                                   │
│  Prometheus Server = Retrieval + TSDB + HTTP Server              │
│  Ecosystem = Server + Exporters + Client Libs + Pushgateway      │
│              + Alertmanager + Service Discovery + Grafana         │
│  Alertmanager & Grafana are SEPARATE components                  │
│                                                                  │
│  DATA MODEL:                                                     │
│  Time Series = Metric Name + Labels                              │
│  Samples = Timestamp (ms) + Value (float64)                      │
│  Auto labels: job, instance                                      │
│  Reserved labels: __ prefix (internal use)                       │
│  ⚠️ High cardinality labels = BAD (memory explosion)             │
│                                                                  │
│  NAMING: snake_case, base units (seconds/bytes), _total suffix   │
│                                                                  │
│  METRIC TYPES:                                                   │
│  Counter   → Only ↑ (rate(), increase())                        │
│  Gauge     → ↑ and ↓ (use directly)                             │
│  Histogram → Buckets (le), _sum, _count, aggregatable ✅        │
│  Summary   → Quantiles, _sum, _count, NOT aggregatable ❌       │
│  → Prefer Histogram for distributed systems                      │
│                                                                  │
│  CONFIG (prometheus.yml):                                        │
│  global → scrape_interval (default 1m), evaluation_interval (1m) │
│  scrape_configs → job_name, targets, SD, relabeling             │
│  rule_files → alerting + recording rules                         │
│  alerting → Alertmanager connection                              │
│  honor_labels: true → Preserve original labels (Pushgateway)     │
│                                                                  │
│  STORAGE (TSDB):                                                 │
│  Head block → ~2h in memory, WAL for crash safety               │
│  Persisted blocks → Compressed, immutable, on disk               │
│  Compaction → Merge small blocks into larger ones                │
│  Retention → --storage.tsdb.retention.time=15d (default)        │
│  Efficiency → ~1-2 bytes per sample                              │
│                                                                  │
│  EXPOSITION: text/plain, /metrics endpoint                       │
│  Special metrics: up (0/1), scrape_duration_seconds              │
│                                                                  │
│  STALENESS: 5 min lookback delta, stale = StaleNaN              │
│  FEDERATION: /federate endpoint, honor_labels: true              │
│  REMOTE: remote_write/remote_read → Thanos, Cortex, VictoriaM.   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

Once you've thoroughly studied Domain 2 and can confidently answer all 30 questions:

> **Reply with "Domain 2 Complete"** and I'll provide the comprehensive guide for **Domain 3: PromQL (28%)** — the **MOST heavily weighted** domain on the exam!
> 
> This will cover:
> - Selectors (Instant & Range Vectors)
> - Label Matchers (=, !=, =~, !~)
> - All Operators (Arithmetic, Comparison, Logical, Vector Matching)
> - All Aggregation Operators (sum, avg, topk, etc.)
> - All Functions (rate, irate, increase, histogram_quantile, etc.)
> - Recording Rules
> - Subqueries
> - 30+ Exam-Style Questions
> 
> Since PromQL is 28% of the exam, this will be the most detailed domain! 🚀
