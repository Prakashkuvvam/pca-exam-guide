---
title: "Domain 1: Observability Concepts"
description: "Monitoring vs Observability, Three Pillars, Push vs Pull, SLI/SLO/SLA, Golden Signals, RED & USE methods"
domain: 1
weight: 18
order: 1
---

# 📘 PCA EXAM — DOMAIN 1: OBSERVABILITY CONCEPTS (18%)
## *Complete One-Stop Guide: Theory → Examples → Exam Questions*

---

## TABLE OF CONTENTS

```
1.1  Monitoring vs Observability
1.2  The Three Pillars of Observability (Metrics, Logs, Traces)
1.3  White-Box vs Black-Box Monitoring
1.4  Push vs Pull Model
1.5  Why Prometheus Uses Pull Model
1.6  SLI, SLO, SLA (The Reliability Trio)
1.7  Golden Signals (Google SRE Approach)
1.8  RED Method (Tom Wilkie)
1.9  USE Method (Brendan Gregg)
1.10 Comparison: Golden Signals vs RED vs USE
1.11 Real-World Scenarios
1.12 EXAM-STYLE QUESTIONS (30 Questions with Answers)
```

---

---

## 1.1 📖 MONITORING vs OBSERVABILITY

### What is Monitoring?

Monitoring is the process of **collecting, aggregating, and analyzing predefined metrics and logs** to track the health and performance of a system.

> **Think of it as:** A car dashboard showing speed, fuel level, engine temperature. You know WHAT is happening.

**Key Characteristics:**
- Reactive in nature
- Focuses on **known unknowns** (things you already know can go wrong)
- Uses predefined dashboards and alerts
- Answers: *"Is the system healthy?"*

### What is Observability?

Observability is a **measure of how well you can understand the internal state of a system from its external outputs**. It allows you to explore and investigate **why** something is happening, even for problems you've never seen before.

> **Think of it as:** Having a full diagnostic computer connected to your car that can tell you exactly which cylinder is misfiring and why. You know WHY it's happening.

**Key Characteristics:**
- Proactive and exploratory
- Focuses on **unknown unknowns** (things you didn't anticipate)
- Uses high-cardinality data and ad-hoc queries
- Answers: *"Why is the system behaving this way?"*

### The Key Difference (Exam Favorite!)

| Aspect | Monitoring | Observability |
|--------|-----------|---------------|
| **Question it answers** | Is something wrong? | WHY is something wrong? |
| **Approach** | Reactive | Proactive & Exploratory |
| **Data** | Predefined metrics | High-cardinality, contextual |
| **Scope** | Known unknowns | Unknown unknowns |
| **Action** | Alert → Fix | Investigate → Understand → Fix |
| **Analogy** | Smoke detector | Fire investigator |

### 🔍 Real-World Example

**Scenario:** Your e-commerce website is slow.

**Monitoring tells you:**
> "CPU usage on server-3 is at 95%. Response time is above 2 seconds."
> ✅ You know SOMETHING is wrong.

**Observability tells you:**
> "CPU spike on server-3 is caused by a specific database query from the checkout microservice, triggered only for users in the EU region using the new payment gateway, because of a missing database index on the `transactions` table."
> ✅ You know EXACTLY WHY it's wrong and how to fix it.

### 💡 Key Takeaway for Exam
> **Monitoring is a SUBSET of Observability.** You can have monitoring without observability, but you CANNOT have observability without monitoring. Observability is the evolution of monitoring.

---

---

## 1.2 📖 THE THREE PILLARS OF OBSERVABILITY

The three pillars are the foundational data types that together provide full observability.

### Pillar 1: METRICS 📊

**Definition:** Numerical measurements of system behavior over time. Metrics are **aggregated, structured, and time-series** data.

**Characteristics:**
- Lightweight and cheap to store
- Great for dashboards and alerting
- Pre-aggregated (you lose individual event details)
- Best for: *"How is the system performing overall?"*

**Examples:**
```
# CPU Usage (Gauge)
node_cpu_seconds_total{cpu="0", mode="idle"} 78345.23

# HTTP Requests (Counter)
http_requests_total{method="GET", status="200"} 15432

# Request Duration (Histogram)
http_request_duration_seconds_bucket{le="0.1"} 500
http_request_duration_seconds_bucket{le="0.5"} 800
http_request_duration_seconds_bucket{le="1.0"} 950
http_request_duration_seconds_bucket{le="+Inf"} 1000

# Memory Usage (Gauge)
process_resident_memory_bytes 256000000
```

**When to use Metrics:**
- Tracking trends over time
- Setting up alerts (e.g., CPU > 90%)
- Building dashboards
- Capacity planning

**Limitation:** Metrics are aggregated. You know 1000 requests failed, but you don't know WHICH specific requests or WHY.

---

### Pillar 2: LOGS 📝

**Definition:** Discrete, timestamped records of events that happened in a system. Logs are **detailed, unstructured or semi-structured text**.

**Characteristics:**
- Rich in detail and context
- Can be structured (JSON) or unstructured (plain text)
- Expensive to store and search at scale
- Best for: *"What exactly happened at this specific moment?"*

**Examples:**
```
# Unstructured Log
[2024-11-15 10:23:45] ERROR Connection to database failed: 
timeout after 30s host=db-primary.internal:5432

# Structured Log (JSON)
{
  "timestamp": "2024-11-15T10:23:45.123Z",
  "level": "ERROR",
  "service": "payment-service",
  "trace_id": "abc123def456",
  "user_id": "user_789",
  "message": "Payment processing failed",
  "error": "Insufficient funds",
  "duration_ms": 234
}
```

**When to use Logs:**
- Debugging specific errors
- Auditing and compliance
- Post-incident investigation
- Understanding exact sequence of events

**Limitation:** Logs generate massive volume. Searching through billions of log lines is slow and expensive.

---

### Pillar 3: TRACES 🔗

**Definition:** Traces represent the **end-to-end journey of a single request** as it flows through multiple services in a distributed system. A trace is made up of **spans**.

**Characteristics:**
- Shows the full path of a request across microservices
- Each span represents a single unit of work
- Essential for distributed systems
- Best for: *"Where is the bottleneck in this request's journey?"*

**Key Terminology:**
- **Trace:** The entire journey of one request (has a unique Trace ID)
- **Span:** A single operation within a trace (has a Span ID and Parent Span ID)
- **Context Propagation:** Passing trace context between services

**Example:**
```
User clicks "Buy Now" → Trace ID: xyz789

┌─────────────────────────────────────────────────────┐
│ Trace: xyz789 (Total: 850ms)                        │
│                                                     │
│ ├─ Span 1: API Gateway          (10ms)              │
│ │   ├─ Span 2: Auth Service     (50ms)              │
│ │   ├─ Span 3: Order Service    (200ms)             │
│ │   │   ├─ Span 4: Inventory    (150ms)  ← SLOW!    │
│ │   │   └─ Span 5: Payment      (400ms)  ← SLOWER!  │
│ │   └─ Span 6: Notification     (40ms)              │
└─────────────────────────────────────────────────────┘

→ Trace reveals: Payment service is the bottleneck (400ms)
```

**When to use Traces:**
- Debugging latency in microservices
- Finding bottlenecks in distributed systems
- Understanding service dependencies
- Root cause analysis across services

**Limitation:** Traces are sampled (you can't trace 100% of requests at scale due to cost). You might miss the specific failing request.

---

### How the Three Pillars Work Together

```
┌──────────────────────────────────────────────────────────┐
│              OBSERVABILITY WORKFLOW                       │
│                                                          │
│  Step 1: METRICS alert you                               │
│          "Error rate spiked to 5% on payment-service"     │
│                          ↓                               │
│  Step 2: TRACES help you find                            │
│          "Requests to /api/pay are taking 3s,             │
│           bottleneck is the database call"                │
│                          ↓                               │
│  Step 3: LOGS give you the detail                        │
│          "Connection pool exhausted at 10:23:45,          │
│           max_connections=100, active=100"                │
│                          ↓                               │
│  Result: You fix the connection pool size!                │
└──────────────────────────────────────────────────────────┘
```

### 💡 Key Takeaway for Exam
> **Metrics** = WHAT is happening (numbers, trends, alerts)
> **Logs** = WHAT happened in detail (events, errors, context)
> **Traces** = WHERE it happened (request flow across services)
> 
> Prometheus is primarily a **METRICS** system. It does NOT handle logs or traces natively (though it can integrate with tools that do).

---

---

## 1.3 📖 WHITE-BOX vs BLACK-BOX MONITORING

### White-Box Monitoring (Inside-Out)

**Definition:** Monitoring the **internal state** of a system by instrumenting the application code and infrastructure from within.

**How it works:**
- You add instrumentation code INSIDE your application
- The application exposes metrics about its internal workings
- You monitor things like: memory usage, queue depth, active connections, internal error rates

**Example:**
```
# Your application exposes these metrics internally:
http_requests_total{handler="/api/users", method="GET"} 5000
process_open_fds 256
go_goroutines 150
jvm_memory_used_bytes{area="heap"} 536870912
app_active_database_connections 45
app_queue_messages_pending 1200
```

**Tools:** Prometheus (with client libraries), Datadog APM, New Relic

**Analogy:** A doctor performing blood tests and X-rays to see what's happening INSIDE your body.

---

### Black-Box Monitoring (Outside-In)

**Definition:** Monitoring the **external behavior** of a system by probing it from the outside, just like a real user would.

**How it works:**
- You send synthetic requests to your system from outside
- You measure response time, availability, and correctness
- You DON'T need access to internal code or metrics

**Example:**
```
# Blackbox Exporter probing your website:
probe_success{instance="https://myapp.com"} 1
probe_http_status_code{instance="https://myapp.com"} 200
probe_duration_seconds{instance="https://myapp.com"} 0.234
probe_http_ssl 1
probe_ssl_earliest_cert_expiry 1735689600
```

**Tools:** Prometheus Blackbox Exporter, Pingdom, UptimeRobot, Synthetic monitoring

**Analogy:** A patient checking their own temperature with a thermometer — they can tell if they have a fever, but not WHY.

---

### Comparison Table

| Aspect | White-Box | Black-Box |
|--------|-----------|-----------|
| **Perspective** | Internal (developer) | External (user) |
| **What it monitors** | Internal metrics, code paths | Endpoints, availability |
| **Instrumentation** | Required in code | No code changes needed |
| **Depth** | Deep, granular | Surface-level |
| **Use case** | Debugging, optimization | Uptime, SLA verification |
| **Example** | "DB connection pool at 90%" | "Website returned 200 OK in 200ms" |
| **Prometheus tool** | Client libraries, exporters | Blackbox Exporter |

### 💡 Key Takeaway for Exam
> **Best practice: Use BOTH.**
> - Black-box tells you IF there's a problem (from user's perspective)
> - White-box tells you WHY there's a problem (from system's perspective)
> 
> In Prometheus: White-box = application metrics via client libraries
> Black-box = Blackbox Exporter for probing endpoints

---

---

## 1.4 📖 PUSH vs PULL MODEL

This is one of the **most frequently tested** topics in the PCA exam!

### PUSH Model

**Definition:** The monitored targets **actively send (push)** their metrics to a central monitoring server at regular intervals.

**How it works:**
```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  App Server │──push──→│             │←──push──│  App Server │
│  (Agent)    │  every  │  Central    │  every  │  (Agent)    │
│             │  10s    │  Monitoring │  10s    │             │
└─────────────┘         │  Server     │         └─────────────┘
                        │             │
┌─────────────┐         │  (e.g.,     │
│  Database   │──push──→│  Graphite,  │
│  (Agent)    │  every  │  InfluxDB,  │
│             │  10s    │  Datadog)   │
└─────────────┘         └─────────────┘
```

**Tools using Push:** Graphite, InfluxDB (Telegraf), Datadog Agent, StatsD, Nagios (NRPE)

**Advantages of Push:**
- ✅ Works well behind firewalls (agent initiates outbound connection)
- ✅ Server doesn't need to know about targets in advance
- ✅ Good for short-lived jobs (they push before dying)
- ✅ Easier to scale horizontally (just add more agents)

**Disadvantages of Push:**
- ❌ Hard to detect if a target dies (it just stops pushing — is it dead or just slow?)
- ❌ Configuration is distributed (each agent needs to know where to push)
- ❌ Can overwhelm the server if too many agents push simultaneously
- ❌ Harder to debug (is the agent running? is the network blocking?)
- ❌ No single source of truth for what should be monitored

---

### PULL Model

**Definition:** The central monitoring server **actively fetches (pulls/scrapes)** metrics from targets at regular intervals.

**How it works:**
```
                        ┌─────────────┐
                        │  Prometheus │
                        │  Server     │
                        │             │
                        └──────┬──────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                scrape      scrape     scrape
                every       every      every
                15s         15s        15s
                    │          │          │
                    ▼          ▼          ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │App Server│ │ Database │ │  Cache   │
              │ :9090    │ │ Exporter │ │ Exporter │
              │ /metrics │ │ :9104    │ │ :9121    │
              └──────────┘ │ /metrics │ │ /metrics │
                           └──────────┘ └──────────┘
```

**Tools using Pull:** Prometheus, Nagios (partially)

**Advantages of Pull:**
- ✅ **Easy to detect if a target is down** (scrape fails = target is dead)
- ✅ **Centralized configuration** (prometheus.yml defines all targets)
- ✅ **Easier debugging** (just curl the /metrics endpoint yourself!)
- ✅ **Targets don't need to know about the monitoring server**
- ✅ **Natural rate limiting** (server controls scrape frequency)
- ✅ **Health check is built-in** (if Prometheus can't scrape, something is wrong)

**Disadvantages of Pull:**
- ❌ Targets must be reachable from the server (firewall issues)
- ❌ Server needs to know all targets (solved by Service Discovery)
- ❌ Not ideal for short-lived batch jobs (solved by Pushgateway)
- ❌ Can be harder to scale to millions of targets

---

### Detailed Comparison Table

| Aspect | Push Model | Pull Model |
|--------|-----------|------------|
| **Who initiates?** | Target (agent) | Monitoring server |
| **Direction** | Target → Server | Server → Target |
| **Dead target detection** | ❌ Difficult (timeout-based) | ✅ Easy (scrape failure) |
| **Configuration** | Distributed (on each agent) | Centralized (on server) |
| **Debugging** | Hard (check agent logs) | Easy (curl /metrics) |
| **Firewall** | ✅ Easier (outbound) | ❌ Harder (inbound needed) |
| **Short-lived jobs** | ✅ Natural fit | ❌ Needs Pushgateway |
| **Rate control** | Agent decides | Server decides |
| **Examples** | Graphite, Datadog, StatsD | Prometheus |

---

### 🔍 Real-World Example

**Push Model Scenario (Datadog):**
```
Your app server has a Datadog agent installed.
Every 10 seconds, the agent collects CPU, memory, and custom metrics
and PUSHES them to Datadog's cloud servers via HTTPS.

If the app server crashes, the agent stops pushing.
Datadog notices "no data received for 2 minutes" → alerts.
But was it a crash? Network issue? Agent bug? Hard to tell immediately.
```

**Pull Model Scenario (Prometheus):**
```
Prometheus is configured to scrape your app server at http://app:8080/metrics
every 15 seconds.

If the app server crashes, the next scrape FAILS immediately.
Prometheus marks the target as DOWN and fires an alert within 15 seconds.
You can also try `curl http://app:8080/metrics` yourself to debug.
```

---

---

## 1.5 📖 WHY PROMETHEUS USES THE PULL MODEL

This is a **philosophical design decision** by the Prometheus creators (at SoundCloud). Here are the key reasons:

### Reason 1: Reliability & Health Detection
```
In a pull model, if Prometheus can't scrape a target, it IMMEDIATELY knows:
  → The target might be down
  → The network might be broken
  → The target is overloaded and can't respond

In a push model, if data stops arriving:
  → Is the target dead?
  → Is the agent crashed?
  → Is the network partitioned?
  → Is the agent misconfigured?
  → You can't easily tell!
```

### Reason 2: Easier Development & Debugging
```bash
# During development, you can simply run your app and check metrics:
$ curl http://localhost:8080/metrics

# Output:
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 42
http_requests_total{method="POST",status="500"} 3

# No need to set up a monitoring server to see your metrics!
# This makes local development and debugging trivially easy.
```

### Reason 3: Centralized Configuration
```yaml
# prometheus.yml - Everything in ONE place
scrape_configs:
  - job_name: 'web-app'
    scrape_interval: 15s
    static_configs:
      - targets: ['app1:8080', 'app2:8080', 'app3:8080']
      
  - job_name: 'database'
    scrape_interval: 30s
    static_configs:
      - targets: ['db-exporter:9104']
```
> You know exactly what is being monitored by looking at ONE file.

### Reason 4: Service Discovery Integration
```
Prometheus can automatically discover targets using:
  → Kubernetes API
  → AWS EC2 API
  → Consul
  → DNS records
  → File-based configs

When a new pod is created in Kubernetes, Prometheus automatically
discovers it and starts scraping. No agent configuration needed!
```

### Reason 5: Natural Rate Limiting
```
In push model: 10,000 agents all push at the same time → server overload!
In pull model: Prometheus controls the pace. It scrapes when IT's ready.
              If the server is overloaded, scrapes slow down naturally.
```

### When Pull Model Doesn't Work (The Exception)
```
Short-lived batch jobs (e.g., a cron job that runs for 5 seconds):
  → The job finishes before Prometheus can scrape it
  → Solution: Use the Pushgateway!
  
  Batch Job → pushes metrics → Pushgateway → Prometheus scrapes Pushgateway
  
  This is the ONLY officially recommended use case for pushing in Prometheus.
```

### 💡 Key Takeaway for Exam
> Prometheus uses pull because:
> 1. Better failure detection
> 2. Easier debugging (curl /metrics)
> 3. Centralized configuration
> 4. Works with service discovery
> 5. Natural rate limiting
> 
> Exception: Pushgateway for short-lived batch jobs

---

---

## 1.6 📖 SLI, SLO, SLA (The Reliability Trio)

These three concepts are fundamental to Site Reliability Engineering (SRE) and frequently appear on the PCA exam.

### SLI — Service Level INDICATOR

**Definition:** A **quantitative measure** of some aspect of the service level. It's the actual metric you measure.

**Format:** Usually a ratio or percentage.

**Examples:**
```
SLI 1: Availability
  → Proportion of successful HTTP requests
  → Measurement: (successful requests / total requests) × 100
  → Current value: 99.95%

SLI 2: Latency
  → Proportion of requests served faster than 200ms
  → Measurement: (requests < 200ms / total requests) × 100
  → Current value: 98.5%

SLI 3: Throughput
  → Number of requests processed per second
  → Current value: 5,000 req/s

SLI 4: Error Rate
  → Proportion of requests returning 5xx errors
  → Current value: 0.02%
```

**PromQL Examples for SLIs:**
```promql
# Availability SLI (last 5 minutes)
sum(rate(http_requests_total{status=~"2.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) 
* 100

# Latency SLI: % of requests under 200ms
sum(rate(http_request_duration_seconds_bucket{le="0.2"}[5m])) 
/ 
sum(rate(http_request_duration_seconds_bucket{le="+Inf"}[5m])) 
* 100

# Error Rate SLI
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) 
* 100
```

---

### SLO — Service Level OBJECTIVE

**Definition:** A **target value or range** for an SLI. It's the GOAL you want to achieve.

**Format:** "SLI should be ≥ X% over Y time period"

**Examples:**
```
SLO 1: "99.9% of HTTP requests should succeed over a 30-day window"
  → SLI: Availability
  → Target: 99.9%
  → Window: 30 days

SLO 2: "95% of requests should complete within 500ms over 7 days"
  → SLI: Latency
  → Target: 95%
  → Threshold: 500ms
  → Window: 7 days

SLO 3: "Error rate should be less than 0.1% over 30 days"
  → SLI: Error Rate
  → Target: < 0.1%
  → Window: 30 days
```

**Key Concept — Error Budget:**
```
If your SLO is 99.9% availability over 30 days:
  → Total minutes in 30 days = 43,200 minutes
  → Allowed downtime = 0.1% × 43,200 = 43.2 minutes
  → This 43.2 minutes is your ERROR BUDGET
  
  → If you've used 30 minutes of downtime this month,
     you have 13.2 minutes of error budget remaining.
  → If error budget is exhausted → stop releasing new features,
     focus on reliability!
```

---

### SLA — Service Level AGREEMENT

**Definition:** A **formal contract** between a service provider and customer that includes **consequences** (usually financial penalties) if the SLO is not met.

**Key Point:** SLA is a **business/legal** concept, not a technical one.

**Examples:**
```
SLA: "We guarantee 99.95% uptime per month. If we fail to meet this,
      you will receive a 10% credit on your monthly bill."

  → SLO (internal): 99.95% uptime
  → Consequence: 10% billing credit
  → This is a LEGAL document signed by both parties
```

---

### The Relationship (Exam Critical!)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   SLI (Indicator)    →  What you MEASURE                │
│        ↓                                                │
│   SLO (Objective)    →  What you AIM FOR (target)       │
│        ↓                                                │
│   SLA (Agreement)    →  What you PROMISE (contract)     │
│                                                         │
│   Hierarchy:  SLI ⊂ SLO ⊂ SLA                          │
│                                                         │
│   • Every SLO is based on an SLI                        │
│   • Every SLA contains one or more SLOs                 │
│   • Not every SLO has an SLA (internal services)        │
│   • SLO should be STRICTER than SLA (internal buffer)   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 🔍 Real-World Example

```
Netflix Streaming Service:

SLI:  Proportion of video play requests that start within 2 seconds
      Current measurement: 99.7%

SLO:  99.5% of video play requests should start within 2 seconds
      (Internal target — stricter than SLA)

SLA:  "We guarantee 99.0% of play requests start within 2 seconds.
       If we fall below this, enterprise customers get a refund."
      (External promise — less strict than SLO to give buffer)

Why SLO > SLA?
  → If your SLO is 99.5% and SLA is 99.0%, you have a 0.5% buffer.
  → You can breach your SLO internally and still not breach the SLA.
  → This gives you time to react before customers are affected!
```

### 💡 Key Takeaway for Exam
> **SLI** = The metric (what you measure) — e.g., "99.95% success rate"
> **SLO** = The target (what you aim for) — e.g., "≥ 99.9% success rate"
> **SLA** = The contract (what you promise + penalty) — e.g., "≥ 99.5% or refund"
> 
> **SLO is always stricter than SLA** (internal target > external promise)
> **Not all SLOs have SLAs** (internal services don't need contracts)

---

---

## 1.7 📖 GOLDEN SIGNALS (Google SRE Approach)

The **Four Golden Signals** were introduced by Google in their SRE Book. They represent the most important aspects of monitoring a user-facing system.

### Signal 1: LATENCY ⏱️

**Definition:** The time it takes to service a request.

**Important:** Distinguish between **success latency** and **error latency**!

```
✅ Good: "99th percentile latency for successful requests is 120ms"
❌ Bad:  "Average latency is 200ms" 
         (This hides the fact that 1% of requests take 10 seconds!)

Why separate success and error latency?
  → A fast error (50ms 500 error) shouldn't drag down your latency metric
  → A slow success (2s 200 OK) is still a problem even if errors are fast
```

**PromQL Example:**
```promql
# 99th percentile latency for successful requests
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket{status=~"2.."}[5m])) 
  by (le)
)

# Median (50th percentile) latency
histogram_quantile(0.5, 
  sum(rate(http_request_duration_seconds_bucket[5m])) 
  by (le)
)
```

---

### Signal 2: TRAFFIC 🚦

**Definition:** A measure of how much demand is being placed on your system.

**Examples:**
- HTTP requests per second
- Concurrent active users
- Database queries per second
- Messages per second in a queue

**PromQL Example:**
```promql
# Requests per second
sum(rate(http_requests_total[5m]))

# Traffic by endpoint
sum(rate(http_requests_total[5m])) by (handler)

# Concurrent connections
sum(node_netstat_Tcp_CurrEstab)
```

**Why it matters:**
- Helps with capacity planning
- High traffic + high latency = scaling problem
- Sudden traffic spike = possible DDoS or viral event

---

### Signal 3: ERRORS ❌

**Definition:** The rate of requests that fail, either explicitly (5xx) or implicitly (wrong content, slow response counted as error).

**Types of Errors:**
```
Explicit Errors:
  → HTTP 500 Internal Server Error
  → HTTP 503 Service Unavailable
  → Connection refused
  → Timeout

Implicit Errors:
  → HTTP 200 but with wrong/empty content
  → Response took longer than SLO threshold (e.g., > 2s)
  → Partial data returned
```

**PromQL Example:**
```promql
# Error rate (5xx responses)
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) 
* 100

# Error rate including timeouts
sum(rate(http_requests_total{status=~"5..|timeout"}[5m])) 
/ 
sum(rate(http_requests_total[5m])) 
* 100
```

---

### Signal 4: SATURATION 📈

**Definition:** How "full" your system is. A measure of resource utilization against capacity.

**Examples:**
- CPU utilization: 85% (capacity: 100%)
- Memory usage: 12GB / 16GB = 75%
- Disk usage: 450GB / 500GB = 90%
- Thread pool: 180 / 200 active threads = 90%
- Connection pool: 95 / 100 connections = 95%

**PromQL Example:**
```promql
# CPU Saturation
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory Saturation
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk Saturation
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100

# Thread Pool Saturation
app_active_threads / app_max_threads * 100
```

**Why it matters:**
- Saturation > 80% = time to scale up
- Saturation at 100% = system is degraded or will crash
- Saturation often LEADS to increased latency and errors

---

### The Golden Signals Relationship

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   TRAFFIC increases                                  │
│       ↓                                              │
│   SATURATION increases (resources getting full)      │
│       ↓                                              │
│   LATENCY increases (system struggling)              │
│       ↓                                              │
│   ERRORS increase (system failing)                   │
│                                                      │
│   This is the typical degradation cascade!           │
│   Monitor all four to catch problems early.          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 💡 Key Takeaway for Exam
> The Four Golden Signals are: **Latency, Traffic, Errors, Saturation**
> - **Latency:** Time to serve (separate success vs error!)
> - **Traffic:** Demand on the system
> - **Errors:** Rate of failures (explicit + implicit)
> - **Saturation:** How full your resources are
> 
> These are for **user-facing systems** (from Google SRE book)

---

---

## 1.8 📖 RED METHOD (Tom Wilkie)

The **RED Method** was introduced by Tom Wilkie (Grafana Labs) and is specifically designed for **microservices and request-driven systems**.

### R — Rate (Request Rate)

**Definition:** The number of requests per second your service is handling.

```promql
# Request rate per service
sum(rate(http_requests_total{job="payment-service"}[5m]))

# Request rate by endpoint
sum(rate(http_requests_total[5m])) by (handler, method)

# Example output:
# {handler="/api/pay", method="POST"} → 250 req/s
# {handler="/api/refund", method="POST"} → 15 req/s
```

---

### E — Errors (Error Rate)

**Definition:** The number of failed requests per second (or as a percentage of total).

```promql
# Error rate (absolute)
sum(rate(http_requests_total{status=~"5.."}[5m]))

# Error rate (percentage)
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) 
* 100

# Example: 2.5% of requests are failing
```

---

### D — Duration (Request Duration/Latency)

**Definition:** The distribution of request durations (how long requests take).

```promql
# 99th percentile duration
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# Average duration
sum(rate(http_request_duration_seconds_sum[5m])) 
/ 
sum(rate(http_request_duration_seconds_count[5m]))

# Example: p99 = 450ms, avg = 120ms
```

---

### When to Use RED

```
✅ USE RED for:
  → Microservices
  → API endpoints
  → Request-driven architectures
  → HTTP/gRPC services
  → When you care about the REQUEST perspective

❌ DON'T use RED for:
  → Infrastructure (servers, disks, networks)
  → Batch processing systems
  → Storage systems
  → When you care about the RESOURCE perspective
```

### 💡 Key Takeaway for Exam
> **RED = Rate, Errors, Duration**
> Designed for **microservices and request-driven systems**
> Think of it as the "per-service" version of Golden Signals

---

---

## 1.9 📖 USE METHOD (Brendan Gregg)

The **USE Method** was created by Brendan Gregg (Netflix) and is designed for **infrastructure and resource monitoring**.

### U — Utilization

**Definition:** The average time that a resource was busy servicing work (as a percentage).

```promql
# CPU Utilization
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
# Example: 75% → CPU is busy 75% of the time

# Disk I/O Utilization
rate(node_disk_io_time_seconds_total[5m]) * 100
# Example: 60% → Disk is busy 60% of the time

# Network Utilization
rate(node_network_transmit_bytes_total[5m]) / node_network_speed_bytes * 100
```

---

### S — Saturation

**Definition:** The amount of work a resource has to do, often measured as queue length or wait time. It indicates how much work is **waiting** because the resource is full.

```promql
# CPU Saturation (load average vs CPU count)
node_load1 / count(node_cpu_seconds_total{mode="idle"})
# Example: 2.5 → On average, 2.5 processes are waiting for CPU per core

# Memory Saturation (swap usage indicates memory saturation)
rate(node_vmstat_pswpout[5m])
# Example: High swap-out rate = memory is saturated

# Disk Saturation (I/O wait queue)
rate(node_disk_io_time_weighted_seconds_total[5m])
```

**Key Difference: Utilization vs Saturation**
```
Utilization: "The CPU is busy 90% of the time" (it's working)
Saturation:  "There are 50 processes waiting in the run queue" (it's overwhelmed)

A resource can be 100% utilized but NOT saturated (if it's keeping up).
A resource is saturated when work is QUEUED and waiting.
```

---

### E — Errors

**Definition:** The count of error events for a resource.

```promql
# Network errors
rate(node_network_receive_errs_total[5m])
rate(node_network_transmit_errs_total[5m])

# Disk errors
rate(node_disk_io_errors_total[5m])

# Memory errors (ECC errors, OOM kills)
rate(node_vmstat_oom_kill[5m])

# File descriptor errors
node_filefd_allocated / node_filefd_maximum * 100
```

---

### When to Use USE

```
✅ USE USE for:
  → Infrastructure monitoring (servers, VMs, containers)
  → Hardware resources (CPU, memory, disk, network)
  → Finding bottlenecks at the resource level
  → Capacity planning

❌ DON'T use USE for:
  → Application-level metrics
  → Microservice request flows
  → Business metrics
```

### 💡 Key Takeaway for Exam
> **USE = Utilization, Saturation, Errors**
> Designed for **infrastructure and resource monitoring**
> Apply to EVERY resource: CPU, memory, disk, network
> **Utilization ≠ Saturation** (busy vs overwhelmed)

---

---

## 1.10 📖 COMPARISON: GOLDEN SIGNALS vs RED vs USE

| Aspect | Golden Signals | RED | USE |
|--------|---------------|-----|-----|
| **Creator** | Google SRE | Tom Wilkie | Brendan Gregg |
| **Components** | Latency, Traffic, Errors, Saturation | Rate, Errors, Duration | Utilization, Saturation, Errors |
| **Best for** | User-facing systems | Microservices | Infrastructure |
| **Perspective** | User experience | Request/Service | Resource/Hardware |
| **Scope** | Broad | Narrow (per service) | Narrow (per resource) |
| **Example** | "Users see 2s latency" | "Payment API: 500 req/s, 2% errors, p99=300ms" | "CPU: 85% util, load=4, 0 errors" |
| **When to use** | Overall system health | Debugging a specific service | Debugging a specific server |

### How They Work Together in Practice

```
┌─────────────────────────────────────────────────────────┐
│                    FULL OBSERVABILITY                    │
│                                                          │
│  Layer 1: USE Method (Infrastructure)                    │
│    → "Server-3 CPU is 95% utilized, load average = 8"    │
│                                                          │
│  Layer 2: RED Method (Microservices)                     │
│    → "Payment-service: error rate spiked to 5%"          │
│    → "Order-service: p99 latency is 3 seconds"           │
│                                                          │
│  Layer 3: Golden Signals (User Experience)               │
│    → "Checkout page latency is 5s for 10% of users"      │
│    → "Overall error rate is 3%"                          │
│                                                          │
│  All three layers together give you complete picture!    │
└─────────────────────────────────────────────────────────┘
```

---

---

## 1.11 📖 REAL-WORLD SCENARIOS

### Scenario 1: E-Commerce Black Friday

```
Situation: It's Black Friday. Traffic spikes 10x.

Golden Signals:
  → Traffic: 50,000 req/s (normally 5,000) ⚠️
  → Latency: p99 went from 200ms to 2s ⚠️
  → Errors: 5xx rate at 8% (normally 0.1%) 🔴
  → Saturation: CPU at 98%, memory at 95% 🔴

RED (per service):
  → Checkout-service: Rate=5000/s, Errors=12%, Duration p99=5s 🔴
  → Catalog-service: Rate=30000/s, Errors=0.5%, Duration p99=100ms ✅
  → Payment-service: Rate=4000/s, Errors=15%, Duration p99=8s 🔴

USE (per server):
  → Web-server-1: CPU=99%, Saturation=load 20, Errors=0 🔴
  → DB-server-1: CPU=95%, Saturation=IOPS at max, Errors=timeout 🔴

Conclusion: Database is the bottleneck. Scale DB and add caching.
```

### Scenario 2: Microservice Deployment Gone Wrong

```
Situation: New version of user-service deployed. Users report slowness.

SLI: Success rate dropped from 99.95% to 97%
SLO: Target is 99.9% → BREACHED! 🔴

Investigation using RED:
  → user-service: Rate=1000/s (normal), Errors=3% (was 0.05%), Duration p99=1s (was 100ms)
  
Root cause found via logs: New code introduced N+1 query problem.
Each user request now makes 50 DB queries instead of 1.

Fix: Rollback deployment, fix the query, redeploy.
```

---

---

## 1.12 📝 EXAM-STYLE QUESTIONS (30 Questions)

### Question 1
**What is the primary difference between monitoring and observability?**

A) Monitoring uses metrics while observability uses logs
B) Monitoring is proactive while observability is reactive
C) Monitoring answers "is something wrong?" while observability answers "why is something wrong?"
D) Monitoring is for infrastructure while observability is for applications

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Monitoring tells you IF there is a problem (reactive, predefined alerts). Observability helps you understand WHY there is a problem (proactive, exploratory, ad-hoc queries). Monitoring is a subset of observability. A is wrong because both use metrics, logs, and traces. B is reversed. D is incorrect — both apply to all layers.
</details>

---

### Question 2
**Which of the following is NOT one of the three pillars of observability?**

A) Metrics
B) Logs
C) Traces
D) Alerts

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: D**

The three pillars of observability are Metrics, Logs, and Traces. Alerts are a feature built ON TOP of metrics (or logs/traces), not a pillar themselves. Alerts are derived from the data collected through the three pillars.
</details>

---

### Question 3
**In the context of observability, what is a "trace"?**

A) A log entry that tracks a specific error
B) A metric that shows the trend of a value over time
C) The end-to-end journey of a single request through a distributed system
D) A recording rule in Prometheus

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

A trace represents the complete path of a single request as it flows through multiple services in a distributed system. It is composed of multiple spans, each representing a unit of work. Traces are essential for understanding latency and bottlenecks in microservice architectures.
</details>

---

### Question 4
**Which monitoring model does Prometheus use?**

A) Push model
B) Pull model
C) Hybrid model (push and pull equally)
D) Agent-based push model

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Prometheus primarily uses a pull model where the Prometheus server scrapes metrics from targets at configured intervals. The only exception is the Pushgateway, which is used for short-lived batch jobs that cannot be scraped.
</details>

---

### Question 5
**What is a key advantage of the pull model over the push model?**

A) It works better behind firewalls
B) It is easier to detect when a target goes down
C) It requires less network bandwidth
D) It supports short-lived batch jobs natively

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In a pull model, if a target stops responding to scrapes, Prometheus immediately knows the target is down (scrape failure). In a push model, if data stops arriving, it's ambiguous — the target could be down, the agent could have crashed, or there could be a network issue. A and D are advantages of the push model. C is not necessarily true.
</details>

---

### Question 6
**When should you use the Prometheus Pushgateway?**

A) For all monitoring targets behind a firewall
B) For long-running services that are hard to reach
C) For short-lived batch jobs that may not exist long enough to be scraped
D) For high-traffic services that generate too many metrics

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The Pushgateway is specifically designed for short-lived batch jobs (e.g., cron jobs, CI/CD pipelines) that may complete before Prometheus has a chance to scrape them. The batch job pushes its metrics to the Pushgateway, and Prometheus scrapes the Pushgateway. It should NOT be used as a general replacement for the pull model.
</details>

---

### Question 7
**What does SLI stand for in the context of reliability?**

A) Service Level Integration
B) Service Level Indicator
C) System Latency Index
D) Service Log Interface

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

SLI stands for Service Level Indicator. It is a quantitative measure of some aspect of the service level, such as availability percentage, latency percentile, or error rate. It's the actual metric you measure to determine if you're meeting your objectives.
</details>

---

### Question 8
**Which of the following correctly describes the relationship between SLI, SLO, and SLA?**

A) SLA is stricter than SLO, which is stricter than SLI
B) SLI is the metric, SLO is the target for that metric, SLA is the contract with consequences
C) SLO and SLA are the same thing
D) SLI is the contract, SLO is the metric, SLA is the target

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

SLI (Service Level Indicator) is the quantitative measure (e.g., "99.95% success rate"). SLO (Service Level Objective) is the target you aim for (e.g., "≥ 99.9% success rate"). SLA (Service Level Agreement) is the formal contract that includes consequences for not meeting the SLO (e.g., "≥ 99.5% or you get a refund"). The hierarchy is SLI → SLO → SLA.
</details>

---

### Question 9
**If your SLO is 99.9% availability over a 30-day period, what is your error budget?**

A) 43.2 minutes of allowed downtime
B) 4.32 minutes of allowed downtime
C) 432 minutes of allowed downtime
D) 0.1 minutes of allowed downtime

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

30 days = 30 × 24 × 60 = 43,200 minutes.
Error budget = (100% - 99.9%) × 43,200 = 0.1% × 43,200 = 43.2 minutes.
This means you can afford 43.2 minutes of downtime per month while still meeting your SLO.
</details>

---

### Question 10
**Which of the following is NOT one of the Four Golden Signals?**

A) Latency
B) Traffic
C) Utilization
D) Saturation

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The Four Golden Signals (from Google SRE) are: Latency, Traffic, Errors, and Saturation. Utilization is part of the USE Method (Utilization, Saturation, Errors), not the Golden Signals. This is a common trick question on the exam!
</details>

---

### Question 11
**In the context of the Golden Signals, why is it important to distinguish between success latency and error latency?**

A) Error latency is always higher than success latency
B) Fast errors should not skew the latency measurement of successful requests
C) Prometheus cannot measure error latency
D) Success latency is not important for SLOs

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

A fast error response (e.g., a 500 error returned in 10ms) should not artificially lower your overall latency metric. Similarly, a slow successful response is still a problem. By separating success and error latency, you get a more accurate picture of user experience. Users who get errors have a different experience than users who get slow successes.
</details>

---

### Question 12
**What does the RED method stand for?**

A) Reliability, Errors, Duration
B) Rate, Errors, Duration
C) Requests, Exceptions, Delays
D) Response, Errors, Distribution

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

RED stands for Rate (requests per second), Errors (failed requests), and Duration (distribution of request latencies). It was introduced by Tom Wilkie and is specifically designed for monitoring microservices and request-driven systems.
</details>

---

### Question 13
**The USE method is best suited for monitoring which of the following?**

A) Microservice request flows
B) User experience metrics
C) Infrastructure resources (CPU, memory, disk, network)
D) Business KPIs

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The USE Method (Utilization, Saturation, Errors) by Brendan Gregg is designed for infrastructure and resource-level monitoring. You apply it to every hardware resource: CPU, memory, disk, network, etc. For microservices, use the RED method. For user-facing systems, use Golden Signals.
</details>

---

### Question 14
**What is the difference between utilization and saturation in the USE method?**

A) They are the same thing
B) Utilization measures how busy a resource is; saturation measures how much work is queued waiting for the resource
C) Utilization is for CPU; saturation is for memory
D) Saturation is always lower than utilization

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Utilization = the percentage of time a resource is busy (e.g., CPU at 80%). Saturation = the amount of work waiting in queue because the resource is full (e.g., 50 processes waiting for CPU). A resource can be 100% utilized but not saturated (if it's keeping up with demand). Saturation indicates the resource is overwhelmed.
</details>

---

### Question 15
**Which of the following is an example of white-box monitoring?**

A) Using the Blackbox Exporter to probe https://myapp.com
B) Checking if a website returns HTTP 200 from an external location
C) Instrumenting application code to expose internal metrics like active database connections
D) Pinging a server to check if it's reachable

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

White-box monitoring involves instrumenting the internals of a system to expose metrics about its inner workings (e.g., active connections, queue depth, internal error rates). Options A, B, and D are all examples of black-box monitoring — observing the system from the outside without knowledge of its internals.
</details>

---

### Question 16
**Which Prometheus component is used for black-box monitoring?**

A) Node Exporter
B) Pushgateway
C) Blackbox Exporter
D) Alertmanager

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The Blackbox Exporter is used for black-box monitoring. It probes endpoints over HTTP, HTTPS, DNS, TCP, and ICMP to check availability, response time, SSL certificate expiry, etc. Node Exporter is for white-box infrastructure metrics. Pushgateway is for batch jobs. Alertmanager handles alerts.
</details>

---

### Question 17
**In a pull-based monitoring system, what happens when a target becomes unreachable?**

A) The monitoring server continues to use the last known metrics
B) The monitoring server immediately detects the failure because the scrape fails
C) The target sends an alert to the monitoring server
D) The monitoring server switches to push mode automatically

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In a pull model, the monitoring server (Prometheus) actively scrapes targets. If a target becomes unreachable, the scrape fails immediately, and Prometheus marks the target as DOWN. This is one of the key advantages of the pull model — immediate and unambiguous failure detection. Note: Prometheus does keep the last known value for a short time (staleness period of 5 minutes), but the target is marked as down.
</details>

---

### Question 18
**Which of the following best describes an "unknown unknown" in the context of observability?**

A) A known issue that you have an alert for
B) A problem you didn't anticipate and don't have a predefined dashboard for
C) A metric that has no data
D) A target that is not configured in Prometheus

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

"Unknown unknowns" are problems you didn't anticipate and can't predict. Observability enables you to investigate these issues using ad-hoc queries and high-cardinality data, even without predefined dashboards. "Known unknowns" are problems you expect and have alerts for (monitoring handles these).
</details>

---

### Question 19
**Which of the following PromQL expressions correctly calculates an availability SLI?**

A) `sum(http_requests_total{status="200"}) / sum(http_requests_total)`
B) `sum(rate(http_requests_total{status=~"2.."}[5m])) / sum(rate(http_requests_total[5m]))`
C) `count(http_requests_total{status="200"}) / count(http_requests_total)`
D) `avg(http_requests_total{status=~"2.."}) * 100`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

To calculate an availability SLI, you need to use `rate()` because `http_requests_total` is a counter. You calculate the rate of successful requests (2xx status codes) divided by the rate of all requests over a time window. Option A uses raw counter values (incorrect for counters). Option C uses `count()` which counts time series, not values. Option D uses `avg()` which is meaningless for counters.
</details>

---

### Question 20
**What is an "error budget" in the context of SLOs?**

A) The maximum number of errors your application can generate per day
B) The amount of acceptable unreliability, calculated as 100% minus the SLO target
C) The budget allocated for fixing errors in the application
D) The number of alerts you can receive before escalating

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

An error budget is the amount of acceptable unreliability. If your SLO is 99.9%, your error budget is 0.1%. This represents the maximum amount of downtime or errors you can have while still meeting your SLO. When the error budget is exhausted, teams should focus on reliability instead of new features.
</details>

---

### Question 21
**Which monitoring approach would be MOST appropriate for detecting that a new deployment caused a regression in a specific microservice?**

A) USE Method on the underlying servers
B) Black-box monitoring of the website homepage
C) RED Method on the specific microservice
D) Monitoring network bandwidth utilization

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The RED Method (Rate, Errors, Duration) is designed for microservices. By monitoring the specific microservice's request rate, error rate, and request duration, you can quickly detect if a new deployment caused increased errors or latency. USE method is for infrastructure, black-box is too high-level, and network bandwidth is too low-level.
</details>

---

### Question 22
**In the push model, why is it difficult to detect a dead target?**

A) The monitoring server cannot process push data fast enough
B) The target might just be slow to push, or the network might be partitioned, making it ambiguous
C) Push model does not support alerting
D) The monitoring server has no configuration for the target

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In a push model, when data stops arriving, it's ambiguous: the target could be dead, the agent could have crashed, the network could be partitioned, or the target could just be slow. In contrast, in a pull model, a failed scrape is a clear signal that something is wrong with the target or the network path to it.
</details>

---

### Question 23
**Which of the following is a characteristic of metrics as an observability pillar?**

A) They provide detailed per-request information
B) They are expensive to store at scale
C) They are lightweight, pre-aggregated, and ideal for dashboards and alerting
D) They show the full request path across microservices

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Metrics are lightweight numerical measurements that are pre-aggregated over time. They are cheap to store, ideal for dashboards and alerting, and great for trend analysis. However, they lose individual event details (A is logs/traces). B describes logs. D describes traces.
</details>

---

### Question 24
**What is the relationship between monitoring and observability?**

A) They are exactly the same thing
B) Observability is a subset of monitoring
C) Monitoring is a subset of observability
D) They are completely unrelated concepts

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Monitoring is a subset of observability. Monitoring focuses on predefined metrics and alerts for known issues. Observability encompasses monitoring but goes further, enabling you to explore and understand unknown issues through metrics, logs, and traces. You can have monitoring without observability, but not observability without monitoring.
</details>

---

### Question 25
**Which of the following is an example of an implicit error?**

A) HTTP 500 Internal Server Error
B) HTTP 503 Service Unavailable
C) HTTP 200 OK with incorrect or empty response body
D) Connection timeout

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

An implicit error is when the response appears successful (HTTP 200) but the content is wrong, empty, or stale. The system didn't explicitly signal an error, but from the user's perspective, the request failed. Options A, B, and D are explicit errors — the system clearly indicates failure.
</details>

---

### Question 26
**You are monitoring a Kubernetes cluster. Which method would you use to check if the nodes have enough CPU and memory capacity?**

A) RED Method
B) Golden Signals only
C) USE Method
D) Black-box probing

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The USE Method (Utilization, Saturation, Errors) is designed for infrastructure resources. You would check CPU utilization (%), CPU saturation (load average/run queue), memory utilization (%), memory saturation (swap usage/OOM kills), and any hardware errors. RED is for microservices. Golden Signals are for user-facing systems. Black-box probing checks external availability.
</details>

---

### Question 27
**Why is centralized configuration an advantage of the pull model?**

A) It allows targets to configure themselves automatically
B) All monitoring targets and scrape settings are defined in one place on the monitoring server
C) It eliminates the need for service discovery
D) It reduces the number of metrics collected

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In the pull model, all target configurations (what to scrape, how often, which labels to add) are defined in a single configuration file (prometheus.yml) on the Prometheus server. This makes it easy to audit, manage, and understand what is being monitored. In the push model, each agent needs to be individually configured with the server address.
</details>

---

### Question 28
**Which of the following statements about SLOs and SLAs is TRUE?**

A) Every SLO must have a corresponding SLA
B) SLOs should typically be stricter than SLAs to provide an internal buffer
C) SLAs are internal targets and SLOs are external contracts
D) SLOs and SLAs always have the same target value

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

SLOs (internal targets) should be stricter than SLAs (external promises) to provide a buffer. For example, your SLO might be 99.95% while your SLA promises 99.9%. This gives you time to detect and fix issues before you breach the SLA. Not every SLO needs an SLA (internal services). C is reversed. D is incorrect — they should differ.
</details>

---

### Question 29
**What is a "span" in the context of distributed tracing?**

A) A time range in a PromQL query
B) A single unit of work within a trace, representing one operation
C) The total duration of a trace
D) A type of Prometheus metric

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

A span is a single unit of work within a trace. Each span has a span ID, a parent span ID (except the root span), a start time, a duration, and metadata (tags/logs). A trace is composed of multiple spans that together represent the full journey of a request through a distributed system.
</details>

---

### Question 30
**You notice that your application's p99 latency has increased from 200ms to 2s, but the average latency is still 150ms. What does this indicate?**

A) The system is healthy because the average is low
B) A small percentage of requests are experiencing very high latency, which the average hides
C) The p99 metric is broken and should be ignored
D) All requests are now taking 2 seconds

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

This is a classic example of why averages are misleading. The average latency of 150ms hides the fact that the worst 1% of requests (p99) are taking 2 seconds. This could affect a significant number of users in a high-traffic system. This is why the Golden Signals recommend looking at percentile latency (p50, p95, p99) rather than averages. The p99 is not broken — it's revealing a real problem.
</details>

---

---

## ✅ DOMAIN 1 REVISION SUMMARY CHEAT SHEET

```
┌──────────────────────────────────────────────────────────────┐
│                    DOMAIN 1 CHEAT SHEET                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Monitoring = "Is something wrong?" (Reactive)               │
│  Observability = "WHY is something wrong?" (Proactive)       │
│  Monitoring ⊂ Observability                                  │
│                                                              │
│  3 Pillars: Metrics (numbers) + Logs (events) + Traces (path)│
│  Prometheus = Metrics system primarily                       │
│                                                              │
│  White-Box = Internal instrumentation (client libraries)     │
│  Black-Box = External probing (Blackbox Exporter)            │
│                                                              │
│  Pull Model = Prometheus scrapes targets                     │
│    ✅ Easy failure detection, centralized config, debugging   │
│    ❌ Firewall issues, needs service discovery                │
│  Push Model = Targets send to server (Graphite, Datadog)     │
│    ✅ Works behind firewalls, good for batch jobs             │
│    ❌ Hard to detect dead targets, distributed config         │
│  Pushgateway = ONLY for short-lived batch jobs               │
│                                                              │
│  SLI = Measure (e.g., 99.95% success rate)                   │
│  SLO = Target (e.g., ≥ 99.9%)  [Internal, stricter]         │
│  SLA = Contract (e.g., ≥ 99.5% or refund) [External]        │
│  Error Budget = 100% - SLO%                                  │
│                                                              │
│  Golden Signals: Latency, Traffic, Errors, Saturation        │
│  RED Method: Rate, Errors, Duration (microservices)          │
│  USE Method: Utilization, Saturation, Errors (infra)         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

Once you've thoroughly studied this material and can answer all 30 questions correctly:

> **Reply with "Domain 1 Complete"** and I'll provide the same comprehensive guide for **Domain 2: Prometheus Fundamentals (20%)** covering Architecture, Data Model, Configuration, Metric Types, Storage, and more!

**Good luck with your revision! 💪**
