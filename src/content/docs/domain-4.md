---
title: "Domain 4: Instrumentation & Exporters"
description: "Client Libraries, Node Exporter, Blackbox Exporter, cAdvisor, Metric Naming, Pushgateway"
domain: 4
weight: 16
order: 4
---

# 📘 PCA EXAM — DOMAIN 4: INSTRUMENTATION & EXPORTERS (16%)
## *Complete One-Stop Guide: Theory → Examples → Exam Questions*

---

## TABLE OF CONTENTS

```
4.1   What is Instrumentation?
4.2   Instrumentation Approaches
4.3   Prometheus Client Libraries (Overview)
4.4   Instrumenting with Go Client Library
4.5   Instrumenting with Python Client Library
4.6   Instrumenting with Java Client Library
4.7   Instrumentation Best Practices
4.8   Metric Naming Conventions (Deep Dive)
4.9   Base Units & Suffixes
4.10  Choosing the Right Metric Type (Decision Guide)
4.11  What are Exporters?
4.12  Node Exporter (Deep Dive)
4.13  Blackbox Exporter (Deep Dive)
4.14  cAdvisor (Container Metrics)
4.15  Database Exporters (MySQL, PostgreSQL, Redis)
4.16  Other Common Exporters
4.17  Custom Exporters
4.18  Pushgateway — Detailed Usage
4.19  Exposition Format Deep Dive
4.20  Real-World Instrumentation Scenarios
4.21  EXAM-STYLE QUESTIONS (30 Questions with Answers)
```

---

---

## 4.1 📖 WHAT IS INSTRUMENTATION?

### Definition

**Instrumentation** is the process of **adding monitoring code to your application** so that it exposes metrics about its internal behavior, performance, and health.

```
Think of it as: Installing sensors inside a car engine to measure
temperature, oil pressure, RPM, and fuel flow — instead of just
looking at the speedometer from outside.
```

### Why Instrumentation Matters

```
Without Instrumentation (Black-Box only):
  → "The website is slow" ← That's all you know
  → You have to SSH into servers, read logs, guess the problem

With Instrumentation (White-Box):
  → "The /api/checkout endpoint has p99 latency of 3s"
  → "The database connection pool is at 95% capacity"
  → "The payment-service error rate spiked to 12%"
  → "The cache hit ratio dropped from 95% to 40%"
  → You know EXACTLY where the problem is!
```

### What Gets Instrumented?

```
┌─────────────────────────────────────────────────────┐
│              INSTRUMENTATION LAYERS                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Application Layer:                                 │
│    → Request counts, latencies, error rates         │
│    → Business metrics (signups, purchases)          │
│    → Queue depths, processing times                 │
│    → Cache hit/miss ratios                          │
│                                                     │
│  Runtime Layer:                                     │
│    → Garbage collection pauses                      │
│    → Thread/goroutine counts                        │
│    → Memory allocation rates                        │
│    → Heap usage                                     │
│                                                     │
│  Infrastructure Layer (via Exporters):              │
│    → CPU, memory, disk, network                     │
│    → Container metrics                              │
│    → Database performance                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

---

## 4.2 📖 INSTRUMENTATION APPROACHES

### Approach 1: Library Instrumentation (Most Common)

```
You add a Prometheus client library to your application code.
The library provides APIs to create and update metrics.
The library automatically exposes a /metrics HTTP endpoint.

Flow:
  Your Code → Client Library → /metrics endpoint → Prometheus scrapes

Example:
  import prometheus_client  # Python
  counter = Counter('requests_total', 'Total requests')
  counter.inc()  # Increment on each request
  # Library auto-exposes at http://localhost:8000/metrics
```

### Approach 2: Exporter (Third-Party Systems)

```
For systems you don't control (MySQL, Redis, Linux kernel),
you use a separate exporter process.

Flow:
  Third-Party System → Exporter → /metrics endpoint → Prometheus scrapes

Example:
  MySQL Database → MySQL Exporter (port 9104) → Prometheus scrapes
  Linux Kernel   → Node Exporter (port 9100)   → Prometheus scrapes
```

### Approach 3: Service Mesh / Sidecar (Advanced)

```
In Kubernetes with Istio/Linkerd, the sidecar proxy automatically
captures metrics without any code changes.

Flow:
  App → Envoy Sidecar (auto-instruments) → /metrics → Prometheus

Limitation: Only captures network-level metrics (latency, errors, traffic)
            Cannot capture business logic metrics
```

### Approach 4: Pushgateway (Batch Jobs)

```
For short-lived jobs that can't be scraped.

Flow:
  Cron Job → Push metrics → Pushgateway → Prometheus scrapes Pushgateway
```

---

---

## 4.3 📖 PROMETHEUS CLIENT LIBRARIES (Overview)

### Official Client Libraries

| Language | Library | Maturity | Maintainer |
|----------|---------|----------|------------|
| **Go** | `client_golang` | ⭐⭐⭐⭐⭐ Most mature | Prometheus Team |
| **Python** | `prometheus_client` | ⭐⭐⭐⭐ | Prometheus Team |
| **Java** | `simpleclient` / `client_java` | ⭐⭐⭐⭐ | Prometheus Team |
| **Ruby** | `prometheus-client` | ⭐⭐⭐ | Prometheus Team |

### Community Client Libraries

| Language | Library | Notes |
|----------|---------|-------|
| .NET/C# | `prometheus-net` | Very popular, well-maintained |
| Rust | `prometheus` crate | Good for Rust ecosystem |
| Node.js | `prom-client` | Most popular for Node |
| PHP | `promphp/prometheus_client_php` | Community maintained |
| C++ | `prometheus-cpp` | Community maintained |
| Bash | `prometheus-bash-exporter` | For shell scripts |

### What All Client Libraries Provide

```
Every Prometheus client library provides:

1. Metric Types:
   → Counter, Gauge, Histogram, Summary

2. Registry:
   → Central place where all metrics are registered
   → Default registry is created automatically
   → Custom registries for isolation

3. HTTP Handler:
   → Exposes /metrics endpoint in the correct exposition format
   → Handles content negotiation

4. Default Metrics:
   → Process metrics (CPU, memory, file descriptors)
   → Runtime metrics (GC, threads, goroutines)
   → These are collected automatically!

5. Label Support:
   → Create metric families with label dimensions
   → Validate label names and values
```

---

---

## 4.4 📖 INSTRUMENTING WITH GO CLIENT LIBRARY

Go is the language Prometheus is written in, so its client library is the most mature.

### Installation

```bash
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promhttp
```

### Complete Example: Web Server Instrumentation

```go
package main

import (
    "net/http"
    "time"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// ─── STEP 1: Define Metrics ───

// Counter: Total HTTP requests
var httpRequestsTotal = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Namespace: "myapp",
        Name:      "http_requests_total",
        Help:      "Total number of HTTP requests",
    },
    []string{"method", "endpoint", "status"},  // Label names
)

// Gauge: Currently active requests
var activeRequests = prometheus.NewGauge(
    prometheus.GaugeOpts{
        Namespace: "myapp",
        Name:      "active_requests",
        Help:      "Number of currently active requests",
    },
)

// Histogram: Request duration
var requestDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Namespace: "myapp",
        Name:      "http_request_duration_seconds",
        Help:      "HTTP request duration in seconds",
        Buckets:   []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
    },
    []string{"method", "endpoint"},
)

// ─── STEP 2: Register Metrics ───

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(activeRequests)
    prometheus.MustRegister(requestDuration)
}

// ─── STEP 3: Use Metrics in Handlers ───

func helloHandler(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    activeRequests.Inc()            // Gauge: increment
    defer activeRequests.Dec()      // Gauge: decrement when done

    // ... do work ...
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("Hello, World!"))

    duration := time.Since(start).Seconds()
    
    // Counter: increment with labels
    httpRequestsTotal.WithLabelValues(r.Method, "/hello", "200").Inc()
    
    // Histogram: observe duration
    requestDuration.WithLabelValues(r.Method, "/hello").Observe(duration)
}

// ─── STEP 4: Expose /metrics Endpoint ───

func main() {
    http.HandleFunc("/hello", helloHandler)
    http.Handle("/metrics", promhttp.Handler())  // Auto /metrics!
    http.ListenAndServe(":8080", nil)
}
```

### What the /metrics Endpoint Returns

```bash
$ curl http://localhost:8080/metrics

# HELP myapp_http_requests_total Total number of HTTP requests.
# TYPE myapp_http_requests_total counter
myapp_http_requests_total{endpoint="/hello",method="GET",status="200"} 42

# HELP myapp_active_requests Number of currently active requests.
# TYPE myapp_active_requests gauge
myapp_active_requests 3

# HELP myapp_http_request_duration_seconds HTTP request duration in seconds.
# TYPE myapp_http_request_duration_seconds histogram
myapp_http_request_duration_seconds_bucket{endpoint="/hello",method="GET",le="0.01"} 10
myapp_http_request_duration_seconds_bucket{endpoint="/hello",method="GET",le="0.05"} 25
myapp_http_request_duration_seconds_bucket{endpoint="/hello",method="GET",le="0.1"} 35
myapp_http_request_duration_seconds_bucket{endpoint="/hello",method="GET",le="0.25"} 40
myapp_http_request_duration_seconds_bucket{endpoint="/hello",method="GET",le="0.5"} 41
myapp_http_request_duration_seconds_bucket{endpoint="/hello",method="GET",le="1"} 42
myapp_http_request_duration_seconds_bucket{endpoint="/hello",method="GET",le="+Inf"} 42
myapp_http_request_duration_seconds_sum{endpoint="/hello",method="GET"} 3.456
myapp_http_request_duration_seconds_count{endpoint="/hello",method="GET"} 42

# Default Go runtime metrics (automatically included!)
# HELP go_goroutines Number of goroutines that currently exist.
# TYPE go_goroutines gauge
go_goroutines 15

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 25600000
```

---

---

## 4.5 📖 INSTRUMENTING WITH PYTHON CLIENT LIBRARY

### Installation

```bash
pip install prometheus_client
```

### Complete Example

```python
from prometheus_client import (
    Counter, Gauge, Histogram, Summary,
    start_http_server, generate_latest
)
import time
import random

# ─── STEP 1: Define Metrics ───

# Counter
REQUESTS = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# Gauge
ACTIVE_CONNECTIONS = Gauge(
    'active_connections',
    'Number of active database connections'
)

# Histogram
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Summary
RESPONSE_SIZE = Summary(
    'http_response_size_bytes',
    'HTTP response size in bytes',
    ['endpoint']
)

# ─── STEP 2: Use Metrics ───

def handle_request(method, endpoint):
    start = time.time()
    
    # Simulate work
    time.sleep(random.uniform(0.01, 0.5))
    
    duration = time.time() - start
    
    # Update metrics
    REQUESTS.labels(method=method, endpoint=endpoint, status='200').inc()
    REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)
    RESPONSE_SIZE.labels(endpoint=endpoint).observe(random.randint(100, 5000))
    
    return "OK"

# ─── STEP 3: Start Metrics Server ───

if __name__ == '__main__':
    # Start HTTP server for /metrics on port 8000
    start_http_server(8000)
    print("Metrics available at http://localhost:8000/metrics")
    
    # Simulate some requests
    while True:
        handle_request('GET', '/api/users')
        ACTIVE_CONNECTIONS.set(random.randint(5, 50))
        time.sleep(1)
```

### Flask Integration Example

```python
from flask import Flask, request
from prometheus_client import Counter, Histogram, generate_latest
import time

app = Flask(__name__)

REQUESTS = Counter('flask_requests_total', 'Total Flask requests', 
                   ['method', 'endpoint', 'status'])
LATENCY = Histogram('flask_request_duration_seconds', 'Request latency',
                    ['method', 'endpoint'])

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    latency = time.time() - request.start_time
    REQUESTS.labels(
        method=request.method,
        endpoint=request.path,
        status=response.status_code
    ).inc()
    LATENCY.labels(
        method=request.method,
        endpoint=request.path
    ).observe(latency)
    return response

@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': 'text/plain'}

@app.route('/hello')
def hello():
    return "Hello, World!"

if __name__ == '__main__':
    app.run(port=5000)
```

---

---

## 4.6 📖 INSTRUMENTING WITH JAVA CLIENT LIBRARY

### Maven Dependency

```xml
<dependency>
    <groupId>io.prometheus</groupId>
    <artifactId>simpleclient</artifactId>
    <version>0.16.0</version>
</dependency>
<dependency>
    <groupId>io.prometheus</groupId>
    <artifactId>simpleclient_httpserver</artifactId>
    <version>0.16.0</version>
</dependency>
```

### Complete Example

```java
import io.prometheus.client.Counter;
import io.prometheus.client.Gauge;
import io.prometheus.client.Histogram;
import io.prometheus.client.exporter.HTTPServer;

public class MyApp {

    // ─── Define Metrics ───
    
    static final Counter requests = Counter.build()
        .name("http_requests_total")
        .help("Total HTTP requests")
        .labelNames("method", "status")
        .register();

    static final Gauge activeRequests = Gauge.build()
        .name("active_requests")
        .help("Currently active requests")
        .register();

    static final Histogram requestLatency = Histogram.build()
        .name("http_request_duration_seconds")
        .help("Request latency in seconds")
        .buckets(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0)
        .labelNames("method")
        .register();

    public static void main(String[] args) throws Exception {
        // Start metrics HTTP server on port 9090
        HTTPServer server = new HTTPServer(9090);
        
        // Simulate handling a request
        handleRequest("GET");
    }

    static void handleRequest(String method) {
        activeRequests.inc();
        Histogram.Timer timer = requestLatency.labels(method).startTimer();
        
        try {
            // ... process request ...
            requests.labels(method, "200").inc();
        } finally {
            timer.observeDuration();  // Record latency
            activeRequests.dec();
        }
    }
}
```

### Spring Boot Integration (Micrometer)

```java
// Spring Boot 2+ uses Micrometer as the metrics facade
// Add dependency: spring-boot-starter-actuator + micrometer-registry-prometheus

// application.yml:
// management:
//   endpoints:
//     web:
//       exposure:
//         include: prometheus
//   metrics:
//     export:
//       prometheus:
//         enabled: true

// Metrics auto-exposed at: /actuator/prometheus

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    private final Counter ordersCounter;
    
    public OrderService(MeterRegistry registry) {
        ordersCounter = Counter.builder("orders_total")
            .description("Total orders placed")
            .tag("type", "online")
            .register(registry);
    }
    
    public void placeOrder() {
        ordersCounter.increment();
        // ... process order
    }
}
```

---

---

## 4.7 📖 INSTRUMENTATION BEST PRACTICES

### ✅ DO: Instrument at the Right Level

```
Good: Instrument at the application/endpoint level
  → http_requests_total{method="GET", endpoint="/api/users", status="200"}
  → http_request_duration_seconds{method="GET", endpoint="/api/users"}

Bad: Instrument at too low a level (every function call)
  → myapp_function_doSomething_duration_seconds  ← Too granular!
  → Creates too many time series, adds overhead
```

### ✅ DO: Use Labels Wisely (Avoid High Cardinality!)

```
Good: Low cardinality labels (bounded set of values)
  → method: GET, POST, PUT, DELETE (4 values)
  → status: 200, 404, 500 (limited values)
  → endpoint: /api/users, /api/orders (bounded)

BAD: High cardinality labels (unbounded values!)
  → user_id: "user_12345"  ← Millions of users!
  → session_id: "abc123"   ← Unique per session!
  → request_id: "xyz789"   ← Unique per request!
  → email: "user@email.com" ← Unbounded!
  
  Why it's bad:
    Each unique label combination = a new time series
    1M users × 10 endpoints × 5 methods = 50M time series!
    → Prometheus will run out of memory!
```

### ✅ DO: Use Base Units

```
Good:
  → http_request_duration_seconds (seconds, not milliseconds)
  → process_memory_bytes (bytes, not megabytes)
  → network_transmit_bytes_total (bytes)

Bad:
  → http_request_duration_milliseconds  ← Wrong unit!
  → process_memory_megabytes            ← Wrong unit!
```

### ✅ DO: Use the Right Metric Type

```
Counting events?          → Counter
Measuring current state?  → Gauge
Measuring distributions?  → Histogram (prefer over Summary)
Pre-computed quantiles?   → Summary (single instance only)
```

### ✅ DO: Provide HELP Strings

```
Good:
  Counter('http_requests_total', 'Total number of HTTP requests processed')
  
Bad:
  Counter('http_requests_total', '')  ← No help text!
```

### ✅ DO: Use Consistent Naming

```
Good:
  myapp_http_requests_total
  myapp_http_request_duration_seconds
  myapp_active_connections
  
Bad:
  myapp_requests        ← Missing _total suffix for counter
  myappHttpLatency      ← camelCase, missing unit
  my-app-errors         ← Hyphens not allowed
```

### ❌ DON'T: Put Rates in Metric Names

```
Bad:
  http_requests_per_second  ← Don't pre-calculate rates!
  
Good:
  http_requests_total       ← Let Prometheus calculate rates with rate()
  
Why: Prometheus is designed to store raw counters and compute rates at query time.
     Pre-computing rates loses information and makes aggregation impossible.
```

### ❌ DON'T: Create Metrics Dynamically Based on Unbounded Input

```
Bad:
  for url in all_urls_visited:
      Counter(f'requests_{url}_total', ...).inc()
  → Creates a new metric for every URL ever visited!
  
Good:
  Counter('requests_total', ..., ['url']).labels(url=sanitize(url)).inc()
  → Use labels with bounded values instead
```

### 💡 Key Takeaway for Exam
> **Low cardinality labels only** (no user_id, session_id, request_id)
> **Base units** (seconds, bytes)
> **_total suffix** for counters
> **HELP strings** always
> **Don't pre-compute rates** — store counters, use `rate()` in PromQL
> **Histogram over Summary** for distributed systems

---

---

## 4.8 📖 METRIC NAMING CONVENTIONS (Deep Dive)

### The Full Naming Pattern

```
[<namespace>_]<subsystem>_<name>_<unit>[_<suffix>]

namespace  → Application or organization name (optional)
subsystem  → Component within the application (optional)
name       → What is being measured (required)
unit       → Base unit (seconds, bytes, total, ratio) (recommended)
suffix     → _total, _bucket, _sum, _count, _info, _created (auto)
```

### Examples of Well-Named Metrics

```
✅ http_requests_total                    (subsystem_name_unit)
✅ node_cpu_seconds_total                 (namespace_subsystem_unit_suffix)
✅ process_resident_memory_bytes          (subsystem_name_unit)
✅ go_goroutines                          (namespace_name)
✅ jvm_memory_used_bytes                  (namespace_name_unit)
✅ mysql_global_status_queries_total      (namespace_subsystem_name_suffix)
✅ http_request_duration_seconds          (subsystem_name_unit)
✅ app_build_info                         (namespace_name_suffix)
```

### Naming Rules (Exam Critical!)

```
1. MUST match regex: [a-zA-Z_:][a-zA-Z0-9_:]*
   → Start with letter, underscore, or colon
   → Only letters, digits, underscores, colons

2. MUST use snake_case
   ❌ httpRequestsTotal    (camelCase)
   ❌ http-requests-total  (kebab-case)
   ❌ HTTP_REQUESTS        (UPPER_CASE)

3. MUST use base units
   → seconds (not ms, not minutes)
   → bytes (not KB, not MB)
   → celsius (not fahrenheit)
   → ratio (0 to 1, not percentage 0 to 100)

4. SHOULD include unit in name
   ✅ http_request_duration_seconds
   ✅ node_memory_MemTotal_bytes

5. MUST use _total suffix for counters
   ✅ http_requests_total
   ❌ http_requests (ambiguous — is it a counter or gauge?)

6. MUST NOT include metric type in name
   ❌ http_requests_counter_total  (redundant!)
   ❌ cpu_usage_gauge              (redundant!)

7. Colons (:) are RESERVED for recording rules
   ❌ http:requests:total  (in raw instrumentation)
   ✅ job:http_requests_total:rate5m  (in recording rules)

8. Labels starting with __ are RESERVED
   ❌ __custom_label  (reserved for internal use)
   ✅ custom_label    (fine)
```

---

---

## 4.9 📖 BASE UNITS & SUFFIXES

### Standard Base Units

| Unit | Suffix | Example |
|------|--------|---------|
| Seconds | `_seconds` | `http_request_duration_seconds` |
| Bytes | `_bytes` | `process_resident_memory_bytes` |
| Ratio (0-1) | `_ratio` | `go_memstats_alloc_ratio` |
| Celsius | `_celsius` | `node_hwmon_temp_celsius` |
| Meters | `_meters` | `altitude_meters` |
| Joules | `_joules` | `energy_consumed_joules` |
| Volts | `_volts` | `psu_voltage_volts` |
| Amperes | `_amperes` | `psu_current_amperes` |
| Grams | `_grams` | `weight_grams` |

### Standard Suffixes

| Suffix | Used For | Example |
|--------|----------|---------|
| `_total` | Counters | `http_requests_total` |
| `_bucket` | Histogram buckets (auto) | `http_request_duration_seconds_bucket` |
| `_sum` | Histogram/Summary sum (auto) | `http_request_duration_seconds_sum` |
| `_count` | Histogram/Summary count (auto) | `http_request_duration_seconds_count` |
| `_info` | Info metrics (gauge = 1) | `node_os_info` |
| `_created` | Creation timestamp | `process_start_time_seconds_created` |

### Info Metrics Pattern

```
# Info metrics are gauges that always have value 1
# They carry metadata as labels

node_os_info{os="linux", version="22.04", name="Ubuntu"} 1
app_build_info{version="1.2.3", commit="abc123", branch="main"} 1
jvm_info{version="17.0.1", vendor="OpenJDK"} 1

# Useful for joining with other metrics in PromQL:
  sum(rate(http_requests_total[5m])) by (instance)
  * on(instance) group_left(version)
  app_build_info
```

---

---

## 4.10 📖 CHOOSING THE RIGHT METRIC TYPE (Decision Guide)

```
START HERE: What are you measuring?
│
├─ "How many times did something happen?" (cumulative count)
│   └─ COUNTER ✅
│      Examples: requests, errors, bytes sent, tasks completed
│      PromQL: rate(), increase()
│
├─ "What is the current value right now?" (snapshot)
│   └─ GAUGE ✅
│      Examples: temperature, memory usage, active connections, queue size
│      PromQL: use directly, avg(), max(), min()
│
├─ "What is the distribution of values?" (latency, size)
│   │
│   ├─ Multiple instances? Need to aggregate?
│   │   └─ HISTOGRAM ✅
│   │      Examples: request latency across 10 servers
│   │      PromQL: histogram_quantile()
│   │
│   └─ Single instance? Need exact quantiles?
│       └─ SUMMARY ✅
│          Examples: request latency on a single server
│          PromQL: read quantile label directly
│
└─ "Is it a yes/no or metadata?"
    └─ GAUGE (value = 1) with info labels ✅
       Examples: app_build_info, node_os_info
```

---

---

## 4.11 📖 WHAT ARE EXPORTERS?

### Definition

An **exporter** is a standalone process that **collects metrics from a third-party system** and **exposes them in Prometheus format** on a `/metrics` endpoint.

```
Why exporters exist:
  → Many systems (MySQL, Linux, Redis) don't natively speak Prometheus format
  → Exporters act as translators/bridges
  → They query the third-party system's native metrics API
  → They convert the data to Prometheus exposition format
  → They expose it on an HTTP endpoint for Prometheus to scrape

Architecture:
  ┌───────────┐     ┌───────────────┐     ┌────────────┐
  │ Prometheus│────→│   Exporter    │────→│ 3rd Party  │
  │  Server   │scrape│  (Translator) │query│  System    │
  │           │←────│               │←────│            │
  │           │/metrics│              │data │ (MySQL,    │
  │           │      │  :9104        │     │  Linux,    │
  └───────────┘      └───────────────┘     │  Redis)    │
                                           └────────────┘
```

### Exporter vs Client Library

| Aspect | Client Library | Exporter |
|--------|---------------|----------|
| **Where it runs** | Inside your application | Separate process |
| **What it monitors** | Your application code | Third-party systems |
| **Code changes** | Yes (add instrumentation) | No (standalone) |
| **Examples** | Go/Python/Java client | Node Exporter, MySQL Exporter |
| **Port** | Same as your app (e.g., 8080) | Separate port (e.g., 9100) |

---

---

## 4.12 📖 NODE EXPORTER (Deep Dive)

### What is Node Exporter?

The **Node Exporter** is the most widely used Prometheus exporter. It exposes **hardware and OS-level metrics** for Linux/Unix systems.

### Key Facts

```
Port:       9100 (default)
Endpoint:   /metrics
Binary:     node_exporter
Maintainer: Prometheus Team (official)
OS Support: Linux (full), macOS, FreeBSD, OpenBSD (partial)
```

### Installation & Running

```bash
# Download
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xvfz node_exporter-*.tar.gz
cd node_exporter-*

# Run
./node_exporter

# Or as a systemd service:
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
[Service]
ExecStart=/usr/local/bin/node_exporter
[Install]
WantedBy=multi-user.target
```

### Key Metrics Exposed

```bash
$ curl http://localhost:9100/metrics | head -50

# ─── CPU ───
node_cpu_seconds_total{cpu="0", mode="idle"} 78345.23
node_cpu_seconds_total{cpu="0", mode="user"} 12345.67
node_cpu_seconds_total{cpu="0", mode="system"} 5678.90
node_cpu_seconds_total{cpu="0", mode="iowait"} 234.56
# Modes: idle, user, system, iowait, nice, irq, softirq, steal

# ─── MEMORY ───
node_memory_MemTotal_bytes 16777216000      # 16 GB total
node_memory_MemFree_bytes 2147483648        # 2 GB free
node_memory_MemAvailable_bytes 8589934592   # 8 GB available
node_memory_Buffers_bytes 536870912
node_memory_Cached_bytes 4294967296
node_memory_SwapTotal_bytes 2147483648
node_memory_SwapFree_bytes 1073741824

# ─── DISK ───
node_filesystem_size_bytes{mountpoint="/", fstype="ext4"} 107374182400
node_filesystem_avail_bytes{mountpoint="/", fstype="ext4"} 53687091200
node_filesystem_free_bytes{mountpoint="/", fstype="ext4"} 59055800320
node_disk_read_bytes_total{device="sda"} 9876543210
node_disk_written_bytes_total{device="sda"} 5432109876
node_disk_io_time_seconds_total{device="sda"} 12345.67

# ─── NETWORK ───
node_network_receive_bytes_total{device="eth0"} 9876543210
node_network_transmit_bytes_total{device="eth0"} 5432109876
node_network_receive_packets_total{device="eth0"} 12345678
node_network_receive_errs_total{device="eth0"} 0
node_network_transmit_errs_total{device="eth0"} 0

# ─── LOAD AVERAGE ───
node_load1 1.23
node_load5 0.98
node_load15 0.87

# ─── SYSTEM INFO ───
node_os_info{name="Ubuntu", version="22.04", id="ubuntu"} 1
node_uname_info{sysname="Linux", release="5.15.0", machine="x86_64"} 1
node_time_seconds 1699000000.123
node_boot_time_seconds 1698000000

# ─── FILE DESCRIPTORS ───
node_filefd_allocated 1024
node_filefd_maximum 65536
```

### Common PromQL Queries with Node Exporter

```promql
# CPU Usage % (per instance)
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory Usage %
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk Usage %
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100

# Network Receive Rate (bytes/sec)
rate(node_network_receive_bytes_total{device="eth0"}[5m])

# Disk I/O Utilization
rate(node_disk_io_time_seconds_total{device="sda"}[5m]) * 100

# Load Average vs CPU Count
node_load1 / count(node_cpu_seconds_total{mode="idle"}) by (instance)
```

### Collectors (Modules)

```
Node Exporter uses "collectors" to gather different types of metrics.
You can enable/disable collectors:

Enabled by default:
  → cpu, meminfo, diskstats, filesystem, netdev, loadavg, 
    time, uname, filefd, stat, vmstat, etc.

Disabled by default (enable with --collector.<name>):
  → systemd, processes, tcpstat, ntp, wifi, etc.

Example:
  ./node_exporter --collector.systemd --collector.processes
  ./node_exporter --no-collector.wifi  # Disable a collector
```

---

---

## 4.13 📖 BLACKBOX EXPORTER (Deep Dive)

### What is Blackbox Exporter?

The **Blackbox Exporter** performs **black-box probing** of endpoints over HTTP, HTTPS, DNS, TCP, and ICMP. It monitors from the **outside**, like a real user would.

### Key Facts

```
Port:       9115 (default)
Endpoint:   /probe (NOT /metrics for probing!)
Maintainer: Prometheus Team (official)
Protocols:  HTTP, HTTPS, DNS, TCP, ICMP
```

### How It Works (Different from other exporters!)

```
Normal Exporter:
  Prometheus → scrapes /metrics → Exporter → queries system

Blackbox Exporter:
  Prometheus → scrapes /probe?target=URL&module=http_2xx
             → Blackbox Exporter → probes the target URL
             → Returns probe results as metrics

The TARGET is passed as a URL parameter!
```

### Configuration (blackbox.yml)

```yaml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200, 201, 204, 301, 302]
      method: GET
      follow_redirects: true
      preferred_ip_protocol: "ip4"

  http_post_2xx:
    prober: http
    http:
      method: POST
      valid_status_codes: [200, 201]

  tcp_connect:
    prober: tcp
    timeout: 5s

  icmp_check:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"

  dns_udp:
    prober: dns
    dns:
      query_name: "example.com"
      query_type: "A"
      transport_protocol: "udp"
```

### Prometheus Configuration for Blackbox

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'blackbox-http'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com
          - https://prometheus.io
          - https://grafana.com
    relabel_configs:
      # Pass the target URL as a parameter
      - source_labels: [__address__]
        target_label: __param_target
      # Set the instance label to the target URL
      - source_labels: [__param_target]
        target_label: instance
      # Point to the actual Blackbox Exporter
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### Key Metrics Exposed

```
# Was the probe successful? (1 = yes, 0 = no)
probe_success{instance="https://example.com"} 1

# HTTP status code received
probe_http_status_code{instance="https://example.com"} 200

# Total probe duration
probe_duration_seconds{instance="https://example.com"} 0.234

# DNS resolution time
probe_dns_lookup_time_seconds{instance="https://example.com"} 0.012

# TCP connection time
probe_http_duration_seconds{phase="connect", instance="https://example.com"} 0.045

# TLS handshake time
probe_http_duration_seconds{phase="tls", instance="https://example.com"} 0.089

# Response time
probe_http_duration_seconds{phase="resolve", instance="https://example.com"} 0.012

# SSL certificate expiry (Unix timestamp)
probe_ssl_earliest_cert_expiry{instance="https://example.com"} 1735689600

# SSL certificate is valid?
probe_ssl_last_chain_expiry_timestamp_seconds 1735689600

# HTTP version
probe_http_version{instance="https://example.com"} 2

# Content length
probe_http_content_length{instance="https://example.com"} 1256
```

### Common PromQL Queries

```promql
# Which targets are down?
probe_success == 0

# SSL certificate expiring in less than 30 days?
(probe_ssl_earliest_cert_expiry - time()) / 86400 < 30

# Slow probes (> 2 seconds)
probe_duration_seconds > 2

# HTTP status code not 200
probe_http_status_code != 200
```

---

---

## 4.14 📖 cADVISOR (Container Metrics)

### What is cAdvisor?

**cAdvisor** (Container Advisor) provides **container-level resource usage and performance metrics**. It's built into the Kubelet in Kubernetes.

### Key Facts

```
Port:       8080 (standalone) or 10250 (Kubelet)
Endpoint:   /metrics
Maintainer: Google
Use case:   Docker/Kubernetes container metrics
```

### Key Metrics

```
# Container CPU usage
container_cpu_usage_seconds_total{container="web-app", pod="web-abc123"}

# Container memory usage
container_memory_usage_bytes{container="web-app"}
container_memory_working_set_bytes{container="web-app"}

# Container network
container_network_receive_bytes_total{container="web-app"}
container_network_transmit_bytes_total{container="web-app"}

# Container filesystem
container_fs_usage_bytes{container="web-app"}
container_fs_limit_bytes{container="web-app"}

# Container restarts
container_last_seen{container="web-app"}
```

### In Kubernetes

```
In Kubernetes, cAdvisor is embedded in the Kubelet.
You don't need to deploy it separately.

Metrics are available at:
  https://<node-ip>:10250/metrics/cadvisor

Prometheus typically scrapes these via the kubernetes_sd_configs
with role: node and the appropriate relabeling.
```

---

---

## 4.15 📖 DATABASE EXPORTERS

### MySQL Exporter

```
Port: 9104
Monitors: MySQL/MariaDB performance metrics

Key metrics:
  mysql_global_status_queries_total          # Total queries
  mysql_global_status_threads_connected      # Active connections
  mysql_global_status_slow_queries_total     # Slow queries
  mysql_global_status_connections_total      # Total connections
  mysql_global_status_bytes_received_total   # Bytes received
  mysql_global_status_bytes_sent_total       # Bytes sent
  mysql_global_variables_max_connections     # Max connections config
```

### PostgreSQL Exporter

```
Port: 9187
Monitors: PostgreSQL performance metrics

Key metrics:
  pg_stat_activity_count                     # Active connections
  pg_stat_database_tup_fetched               # Rows fetched
  pg_stat_database_tup_inserted              # Rows inserted
  pg_stat_database_numbackends               # Backend connections
  pg_database_size_bytes                     # Database size
  pg_stat_bgwriter_buffers_checkpoint        # Checkpoint buffers
```

### Redis Exporter

```
Port: 9121
Monitors: Redis performance metrics

Key metrics:
  redis_connected_clients                    # Connected clients
  redis_used_memory_bytes                    # Memory usage
  redis_commands_processed_total             # Total commands
  redis_keyspace_hits_total                  # Cache hits
  redis_keyspace_misses_total                # Cache misses
  redis_connected_slaves                     # Replication slaves
  redis_blocked_clients                      # Blocked clients
```

---

---

## 4.16 📖 OTHER COMMON EXPORTERS

| Exporter | Port | Monitors |
|----------|------|----------|
| **SNMP Exporter** | 9116 | Network devices (routers, switches) via SNMP |
| **JMX Exporter** | varies | Java applications via JMX |
| **Kafka Exporter** | 9308 | Apache Kafka topics, consumer groups |
| **Elasticsearch Exporter** | 9114 | Elasticsearch cluster health, indices |
| **MongoDB Exporter** | 9216 | MongoDB performance, replication |
| **Nginx Exporter** | 9113 | Nginx request rates, connections |
| **HAProxy Exporter** | 9101 | HAProxy backend/frontend stats |
| **Consul Exporter** | 9107 | HashiCorp Consul health, services |
| **CloudWatch Exporter** | 9106 | AWS CloudWatch metrics |
| **Stackdriver Exporter** | 9255 | GCP Stackdriver metrics |
| **Azure Exporter** | 9276 | Azure Monitor metrics |
| **StatsD Exporter** | 9125 | StatsD to Prometheus bridge |

---

---

## 4.17 📖 CUSTOM EXPORTERS

### When to Build a Custom Exporter

```
Build a custom exporter when:
  ✅ No existing exporter for your system
  ✅ You need metrics from a proprietary API
  ✅ You need to aggregate data from multiple sources
  ✅ You need custom business logic in metric collection

Don't build when:
  ❌ An existing exporter already covers your needs
  ❌ You can instrument the application directly with a client library
  ❌ The data is better suited for logs or traces
```

### Custom Exporter Architecture

```
┌─────────────────────────────────────────────┐
│           CUSTOM EXPORTER                    │
│                                             │
│  1. Connect to target system                │
│     (API, database, file, etc.)             │
│                                             │
│  2. Collect raw data                        │
│     (query API, parse logs, etc.)           │
│                                             │
│  3. Convert to Prometheus metrics           │
│     (Counter, Gauge, Histogram)             │
│                                             │
│  4. Expose /metrics endpoint                │
│     (HTTP server on a port)                 │
│                                             │
│  5. Prometheus scrapes the endpoint         │
└─────────────────────────────────────────────┘
```

### Simple Custom Exporter Example (Python)

```python
from prometheus_client import start_http_server, Gauge
import requests
import time

# Define metrics
API_RESPONSE_TIME = Gauge(
    'external_api_response_time_seconds',
    'Response time of external API',
    ['endpoint']
)

API_STATUS = Gauge(
    'external_api_up',
    'Whether the external API is reachable',
    ['endpoint']
)

def collect_metrics():
    """Collect metrics from external API"""
    endpoints = ['/users', '/orders', '/products']
    
    for endpoint in endpoints:
        try:
            start = time.time()
            response = requests.get(f'https://api.example.com{endpoint}')
            duration = time.time() - start
            
            API_RESPONSE_TIME.labels(endpoint=endpoint).set(duration)
            API_STATUS.labels(endpoint=endpoint).set(
                1 if response.status_code == 200 else 0
            )
        except Exception:
            API_STATUS.labels(endpoint=endpoint).set(0)

if __name__ == '__main__':
    start_http_server(9200)
    print("Custom exporter running on port 9200")
    
    while True:
        collect_metrics()
        time.sleep(30)  # Collect every 30 seconds
```

---

---

## 4.18 📖 PUSHGATEWAY — DETAILED USAGE

### When to Use Pushgateway

```
✅ USE for:
  → Cron jobs that run for seconds (shorter than scrape interval)
  → CI/CD pipeline stages
  → Serverless functions (AWS Lambda, etc.)
  → Batch processing jobs
  → Any job that may not be alive when Prometheus scrapes

❌ DON'T USE for:
  → Long-running services (use direct scraping!)
  → Replacing the pull model entirely
  → Pushing metrics from behind firewalls (use remote_write)
  → High-frequency metrics (use client library + scraping)
```

### How It Works

```
Flow:
  1. Batch job runs and completes
  2. Job pushes metrics to Pushgateway via HTTP POST/PUT
  3. Pushgateway stores the metrics
  4. Prometheus scrapes Pushgateway at regular intervals
  5. Pushgateway metrics appear in Prometheus with original labels

⚠️ Important: Pushgateway remembers the LAST pushed value forever!
   If a job stops pushing, the old value persists.
   You need to explicitly DELETE metrics when a job is done.
```

### Pushing Metrics (Examples)

```bash
# Push a single metric (bash)
echo "backup_duration_seconds 45.2" | \
  curl --data-binary @- http://pushgateway:9091/metrics/job/backup

# Push with instance label
echo "backup_duration_seconds 45.2" | \
  curl --data-binary @- http://pushgateway:9091/metrics/job/backup/instance/server1

# Push multiple metrics
cat <<EOF | curl --data-binary @- http://pushgateway:9091/metrics/job/backup
# TYPE backup_duration_seconds gauge
backup_duration_seconds 45.2
# TYPE backup_files_total counter
backup_files_total 1234
# TYPE backup_size_bytes gauge
backup_size_bytes 5368709120
EOF

# DELETE metrics when job is done
curl -X DELETE http://pushgateway:9091/metrics/job/backup/instance/server1
```

### Python Pushgateway Example

```python
from prometheus_client import CollectorRegistry, Gauge, push_to_gateway

registry = CollectorRegistry()

duration = Gauge(
    'batch_job_duration_seconds',
    'Duration of batch job',
    registry=registry
)

records = Gauge(
    'batch_job_records_processed',
    'Number of records processed',
    registry=registry
)

# Do the batch work
duration.set(45.2)
records.set(10000)

# Push to Pushgateway
push_to_gateway(
    'pushgateway:9091',
    job='daily_etl',
    registry=registry,
    grouping_key={'instance': 'etl-server-1'}
)
```

### Prometheus Configuration for Pushgateway

```yaml
scrape_configs:
  - job_name: 'pushgateway'
    honor_labels: true    # ⚠️ CRITICAL! Preserves job/instance from push
    static_configs:
      - targets: ['pushgateway:9091']
```

### 💡 Key Takeaway for Exam
> Pushgateway is **ONLY for short-lived batch jobs**
> **honor_labels: true** is required in Prometheus config
> Pushgateway **remembers last value** until explicitly deleted
> Push via HTTP POST/PUT to `/metrics/job/<jobname>`
> Delete via HTTP DELETE when job completes

---

---

## 4.19 📖 EXPOSITION FORMAT DEEP DIVE

### Complete Format Specification

```
# Lines starting with # are comments
# Special comment lines: HELP and TYPE

# HELP <metric_name> <description>
# TYPE <metric_name> <type>
# <metric_name>{<label_name>="<label_value>",...} <value> [<timestamp_ms>]

# ─── Full Example ───

# HELP http_requests_total The total number of HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="post",code="200"} 1027 1395066363000
http_requests_total{method="post",code="400"} 3 1395066363000

# HELP http_request_duration_seconds A histogram of request duration.
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.05"} 24054
http_request_duration_seconds_bucket{le="0.1"} 33444
http_request_duration_seconds_bucket{le="0.2"} 100392
http_request_duration_seconds_bucket{le="0.5"} 129389
http_request_duration_seconds_bucket{le="1"} 133988
http_request_duration_seconds_bucket{le="+Inf"} 144320
http_request_duration_seconds_sum 53423
http_request_duration_seconds_count 144320

# HELP temperature_celsius Current temperature.
# TYPE temperature_celsius gauge
temperature_celsius{location="outside"} 27.3
temperature_celsius{location="inside"} 22.1
```

### Format Rules (Exam Critical!)

```
1. Encoding: UTF-8
2. Content-Type: text/plain; version=0.0.4; charset=utf-8
3. Lines ending: \n (Unix-style)
4. Metric names: [a-zA-Z_:][a-zA-Z0-9_:]*
5. Label names: [a-zA-Z_][a-zA-Z0-9_]*
6. Label values: any UTF-8 string, must be in double quotes
7. Special characters in label values must be escaped:
   → \" for double quote
   → \\ for backslash
   → \n for newline
8. Value: float64 (can be NaN, +Inf, -Inf)
9. Timestamp: optional, Unix epoch in milliseconds
10. Empty lines are allowed and ignored
11. HELP and TYPE lines are optional but recommended
12. TYPE must be one of: counter, gauge, histogram, summary, untyped
13. The _bucket, _sum, _count suffixes are auto-generated for histograms
```

---

---

## 4.20 📖 REAL-WORLD INSTRUMENTATION SCENARIOS

### Scenario 1: E-Commerce Checkout Service

```python
# What to instrument:

# 1. Request rate (Counter)
checkout_requests_total = Counter(
    'checkout_requests_total',
    'Total checkout requests',
    ['payment_method', 'status']  # visa, paypal, crypto | success, failed
)

# 2. Checkout duration (Histogram)
checkout_duration = Histogram(
    'checkout_duration_seconds',
    'Time to complete checkout',
    ['payment_method'],
    buckets=[0.5, 1, 2, 5, 10, 30]
)

# 3. Cart value (Histogram)
cart_value = Histogram(
    'checkout_cart_value_dollars',
    'Value of cart at checkout',
    buckets=[10, 25, 50, 100, 250, 500, 1000]
)

# 4. Active checkouts (Gauge)
active_checkouts = Gauge(
    'active_checkouts',
    'Currently in-progress checkouts'
)

# 5. Payment gateway latency (Histogram)
payment_gateway_latency = Histogram(
    'payment_gateway_duration_seconds',
    'Payment gateway response time',
    ['gateway']  # stripe, paypal
)
```

### Scenario 2: Batch Data Pipeline

```bash
#!/bin/bash
# daily_etl.sh — Runs as a cron job at 2 AM

START=$(date +%s)

# ... run ETL pipeline ...
RECORDS_PROCESSED=1500000
ERRORS=23

END=$(date +%s)
DURATION=$((END - START))

# Push metrics to Pushgateway (job is short-lived!)
cat <<EOF | curl --data-binary @- http://pushgateway:9091/metrics/job/daily_etl/instance/etl-server-1
# TYPE etl_duration_seconds gauge
etl_duration_seconds $DURATION
# TYPE etl_records_processed gauge
etl_records_processed $RECORDS_PROCESSED
# TYPE etl_errors_total gauge
etl_errors_total $ERRORS
EOF
```

---

---

## 4.21 📝 EXAM-STYLE QUESTIONS (30 Questions)

### Question 1
**What is the primary purpose of instrumentation in the context of Prometheus?**

A) To monitor network traffic between servers
B) To add monitoring code to an application so it exposes internal metrics for Prometheus to scrape
C) To configure Prometheus alerting rules
D) To set up Grafana dashboards

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Instrumentation is the process of adding monitoring code (using a Prometheus client library) to your application so that it exposes metrics about its internal behavior via a `/metrics` endpoint. Prometheus then scrapes this endpoint to collect the metrics. It's a white-box monitoring approach that provides deep visibility into application internals.
</details>

---

### Question 2
**Which of the following is NOT an official Prometheus client library?**

A) Go (`client_golang`)
B) Python (`prometheus_client`)
C) Java (`simpleclient`)
D) PHP (`prometheus-php-official`)

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: D**

The official Prometheus client libraries maintained by the Prometheus team are for Go, Python, Java, and Ruby. PHP has community-maintained libraries but no official one. Other community libraries exist for .NET, Node.js, Rust, C++, etc.
</details>

---

### Question 3
**What is the key difference between a client library and an exporter?**

A) Client libraries are for infrastructure; exporters are for applications
B) Client libraries run inside the application code; exporters are separate processes that monitor third-party systems
C) Exporters use the push model; client libraries use the pull model
D) There is no difference; they are the same thing

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

A client library is embedded in your application code and instruments it from within (e.g., adding counters for HTTP requests). An exporter is a standalone process that collects metrics from a third-party system (e.g., MySQL, Linux kernel) and exposes them in Prometheus format. Both expose a `/metrics` endpoint for Prometheus to scrape.
</details>

---

### Question 4
**Which metric type should you use to track the current number of active user sessions?**

A) Counter
B) Gauge
C) Histogram
D) Summary

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Active user sessions is a value that goes up (user logs in) and down (user logs out). This is the classic use case for a **Gauge**. Counters only go up, and Histograms/Summaries are for distributions of observations (like latency).
</details>

---

### Question 5
**Why should you avoid using high-cardinality labels like `user_id` in Prometheus metrics?**

A) Because Prometheus doesn't support string label values
B) Because each unique label combination creates a new time series, which can cause memory exhaustion
C) Because high-cardinality labels slow down the scrape process
D) Because Grafana cannot display high-cardinality labels

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In Prometheus, every unique combination of metric name + label values creates a separate time series. If you use `user_id` as a label with 1 million users, you create 1 million time series per metric. This consumes massive amounts of memory and can crash Prometheus. Labels should have a bounded, low-cardinality set of values (e.g., method, status, endpoint).
</details>

---

### Question 6
**What is the default port for the Node Exporter?**

A) 9090
B) 9100
C) 9115
D) 8080

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The Node Exporter runs on port **9100** by default. Port 9090 is the Prometheus server default. Port 9115 is the Blackbox Exporter default. Port 8080 is commonly used by cAdvisor (standalone) or application servers.
</details>

---

### Question 7
**Which exporter would you use to monitor the availability and response time of external websites?**

A) Node Exporter
B) cAdvisor
C) Blackbox Exporter
D) MySQL Exporter

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The **Blackbox Exporter** is designed for black-box probing of endpoints over HTTP, HTTPS, DNS, TCP, and ICMP. It checks if websites are reachable, measures response times, validates SSL certificates, and checks HTTP status codes. Node Exporter monitors Linux system metrics, cAdvisor monitors containers, and MySQL Exporter monitors databases.
</details>

---

### Question 8
**What is the correct naming convention for a counter metric tracking total HTTP requests?**

A) `http_requests_counter`
B) `httpRequestsTotal`
C) `http_requests_total`
D) `http-requests-total`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Prometheus naming conventions require: snake_case (no camelCase or hyphens), the `_total` suffix for counters, and no metric type in the name. `http_requests_total` follows all rules. Option A includes "counter" in the name (redundant). Option B is camelCase. Option D uses hyphens (invalid).
</details>

---

### Question 9
**Which base unit should you use for measuring request duration in Prometheus?**

A) Milliseconds
B) Microseconds
C) Seconds
D) Minutes

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Prometheus convention requires **base units**. For time/duration, the base unit is **seconds**. The metric name should include the unit: `http_request_duration_seconds`. Even if your application measures in milliseconds internally, convert to seconds before exposing the metric. This ensures consistency across all Prometheus metrics and tools.
</details>

---

### Question 10
**What does the Blackbox Exporter's `/probe` endpoint do?**

A) Returns the Blackbox Exporter's own health metrics
B) Probes a target specified via URL parameters and returns the probe results as Prometheus metrics
C) Lists all configured probe modules
D) Returns the configuration of the Blackbox Exporter

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The Blackbox Exporter works differently from other exporters. Instead of exposing static metrics on `/metrics`, it probes targets on demand via the `/probe` endpoint. You pass the target and module as URL parameters: `/probe?target=https://example.com&module=http_2xx`. The exporter then performs the probe and returns the results (success, duration, status code, SSL expiry, etc.) as Prometheus metrics.
</details>

---

### Question 11
**Which of the following is a valid use case for the Pushgateway?**

A) Monitoring a long-running web application
B) Collecting metrics from a cron job that runs for 10 seconds every hour
C) Replacing the pull model for all monitoring targets
D) Pushing metrics from behind a corporate firewall

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The Pushgateway is specifically designed for **short-lived batch jobs** that may complete before Prometheus can scrape them. A cron job running for 10 seconds is a perfect use case — the job pushes its metrics to the Pushgateway before exiting, and Prometheus scrapes the Pushgateway later. Long-running services should be scraped directly (A). Pushgateway should not replace the pull model (C) or be used for firewall traversal (D — use remote_write).
</details>

---

### Question 12
**What configuration is essential when scraping the Pushgateway from Prometheus?**

A) `scrape_interval: 5s`
B) `honor_labels: true`
C) `scheme: https`
D) `metrics_path: /probe`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`honor_labels: true` is **essential** when scraping the Pushgateway. Without it, Prometheus would overwrite the `job` and `instance` labels from the pushed metrics with the Pushgateway's own job/instance labels. With `honor_labels: true`, the original labels from the batch job are preserved, allowing you to distinguish metrics from different jobs and instances.
</details>

---

### Question 13
**What does the `node_cpu_seconds_total` metric from Node Exporter represent?**

A) Current CPU usage percentage
B) Total CPU time consumed since boot, broken down by CPU and mode
C) Number of CPU cores
D) CPU temperature

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`node_cpu_seconds_total` is a **counter** that tracks the total CPU time (in seconds) consumed since the system booted, broken down by `cpu` (core number) and `mode` (idle, user, system, iowait, nice, irq, softirq, steal). To get CPU usage percentage, you need to calculate: `100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`.
</details>

---

### Question 14
**Which metric type is most appropriate for measuring the distribution of HTTP request latencies across multiple application instances?**

A) Counter
B) Gauge
C) Histogram
D) Summary

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

A **Histogram** is the best choice for measuring latency distributions across multiple instances because histogram buckets are **aggregatable**. You can sum the bucket counts from all instances and then calculate quantiles using `histogram_quantile()`. A Summary pre-calculates quantiles on each instance, and you cannot meaningfully aggregate percentiles across instances (averaging p99 values is mathematically invalid).
</details>

---

### Question 15
**What is the purpose of the `# HELP` line in the Prometheus exposition format?**

A) It defines the metric type
B) It provides a human-readable description of the metric
C) It specifies the scrape interval
D) It defines the label names

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `# HELP` line provides a human-readable description of the metric. For example: `# HELP http_requests_total The total number of HTTP requests.` It's optional but strongly recommended. The `# TYPE` line defines the metric type (counter, gauge, etc.). HELP and TYPE lines are comment lines in the exposition format.
</details>

---

### Question 16
**Which of the following metric names is INVALID according to Prometheus naming conventions?**

A) `process_resident_memory_bytes`
B) `http_request_duration_seconds`
C) `my-app_requests_total`
D) `node_cpu_seconds_total`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`my-app_requests_total` is invalid because it contains a **hyphen** (`-`). Prometheus metric names must match the regex `[a-zA-Z_:][a-zA-Z0-9_:]*`, which only allows letters, digits, underscores, and colons. The correct name would be `my_app_requests_total` (using an underscore instead of a hyphen).
</details>

---

### Question 17
**What does cAdvisor primarily monitor?**

A) Network switch performance via SNMP
B) Container resource usage (CPU, memory, network, disk)
C) Database query performance
D) SSL certificate expiry

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

cAdvisor (Container Advisor) provides **container-level resource usage and performance metrics** including CPU usage, memory usage, network I/O, and filesystem usage for Docker/Kubernetes containers. In Kubernetes, cAdvisor is embedded in the Kubelet and doesn't need separate deployment.
</details>

---

### Question 18
**Which of the following is a best practice for Prometheus instrumentation?**

A) Pre-calculate rates in your application and expose them as gauges
B) Use user_id as a label for detailed per-user monitoring
C) Store raw counters and let Prometheus calculate rates at query time using `rate()`
D) Create a separate metric name for each HTTP endpoint

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The Prometheus best practice is to store **raw counters** and let Prometheus calculate rates at query time using `rate()`, `increase()`, etc. Pre-calculating rates (A) loses information and makes aggregation impossible. Using `user_id` as a label (B) causes high cardinality and memory issues. Creating separate metric names per endpoint (D) is an anti-pattern — use a single metric with an `endpoint` label instead.
</details>

---

### Question 19
**What is the default port for the Blackbox Exporter?**

A) 9100
B) 9090
C) 9115
D) 9121

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The Blackbox Exporter runs on port **9115** by default. 9100 is Node Exporter, 9090 is Prometheus server, and 9121 is Redis Exporter.
</details>

---

### Question 20
**Which exporter would you use to monitor a MySQL database?**

A) Node Exporter
B) MySQL Exporter (mysqld_exporter)
C) Blackbox Exporter
D) cAdvisor

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The **MySQL Exporter** (officially `mysqld_exporter`) is the dedicated exporter for MySQL/MariaDB databases. It connects to MySQL and exposes metrics like query counts, connection counts, slow queries, replication status, InnoDB metrics, etc., on port 9104. Node Exporter monitors the OS, Blackbox probes endpoints, and cAdvisor monitors containers.
</details>

---

### Question 21
**What happens to Pushgateway metrics when the batch job that pushed them finishes?**

A) They are automatically deleted after the scrape interval
B) They persist indefinitely until explicitly deleted via the API
C) They expire after 5 minutes
D) They are converted to counters

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Pushgateway metrics **persist indefinitely** until explicitly deleted. This is a common gotcha — if a batch job stops running, its last pushed metrics will continue to appear in Prometheus as if they were current. You should explicitly delete metrics via `curl -X DELETE http://pushgateway:9091/metrics/job/<jobname>` when a job completes, or use the `push_to_gateway` function with appropriate settings.
</details>

---

### Question 22
**Which of the following is the correct content type for the Prometheus exposition format?**

A) `application/json`
B) `text/plain; version=0.0.4`
C) `application/xml`
D) `text/csv`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The Prometheus exposition format uses the content type `text/plain; version=0.0.4; charset=utf-8`. The newer OpenMetrics format uses `application/openmetrics-text`. JSON, XML, and CSV are not used for Prometheus metric exposition.
</details>

---

### Question 23
**What is the `_total` suffix used for in Prometheus metric naming?**

A) It indicates a gauge metric
B) It indicates a histogram metric
C) It indicates a counter metric
D) It indicates the sum of all metrics

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `_total` suffix is the naming convention for **counter** metrics in Prometheus. It indicates that the metric represents a cumulative count that only increases (or resets on restart). Examples: `http_requests_total`, `node_cpu_seconds_total`, `process_network_transmit_bytes_total`. This convention helps users immediately identify the metric type.
</details>

---

### Question 24
**Which of the following labels would cause high cardinality issues in Prometheus?**

A) `method`

---

# 📘 PCA EXAM — DOMAIN 4: INSTRUMENTATION & EXPORTERS (Continued)
## *Questions 24–30 + Summary Cheat Sheet*

---

### Question 24 (Complete Answer)
**Which of the following labels would cause high cardinality issues in Prometheus?**

A) `method` (GET, POST, PUT, DELETE)
B) `status` (200, 404, 500)
C) `user_id` (unique per user, millions of values)
D) `endpoint` (/api/users, /api/orders)

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`user_id` would cause **high cardinality** issues because each unique user creates a new time series. With millions of users, this could create millions of time series per metric, exhausting Prometheus memory. Labels should have a **bounded, low-cardinality** set of values. `method` (4-5 values), `status` (limited HTTP codes), and `endpoint` (bounded set of routes) are all acceptable low-cardinality labels.
</details>

---

### Question 25
**What is the purpose of the `# TYPE` line in the Prometheus exposition format?**

A) It specifies the data type of the label values
B) It declares the metric type (counter, gauge, histogram, summary, or untyped)
C) It defines the scrape interval for the metric
D) It specifies the unit of measurement

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `# TYPE` line declares the metric type so Prometheus knows how to handle the metric. Valid types are: `counter`, `gauge`, `histogram`, `summary`, and `untyped`. For example: `# TYPE http_requests_total counter`. While optional, it's strongly recommended because it helps Prometheus validate the data and enables proper handling (e.g., knowing a counter can be used with `rate()`).
</details>

---

### Question 26
**Which of the following is NOT a valid Prometheus metric type in the exposition format?**

A) counter
B) gauge
C) histogram
D) timer

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: D**

The valid Prometheus metric types in the exposition format are: `counter`, `gauge`, `histogram`, `summary`, and `untyped`. **"timer"** is NOT a valid Prometheus type. Some other monitoring systems (StatsD, Dropwizard) have a timer type, but in Prometheus, you would use a Histogram or Summary to track durations/timers.
</details>

---

### Question 27
**What is the recommended approach for monitoring a third-party system like Redis that doesn't natively expose Prometheus metrics?**

A) Instrument the Redis source code with a Prometheus client library
B) Use a dedicated Redis Exporter that queries Redis and exposes metrics in Prometheus format
C) Use the Blackbox Exporter to probe Redis
D) Use the Pushgateway to push Redis metrics

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

For third-party systems you don't control (like Redis, MySQL, Linux), the recommended approach is to use a **dedicated exporter**. The Redis Exporter connects to Redis, queries its `INFO` command and other stats, translates the data into Prometheus format, and exposes it on port 9121 for Prometheus to scrape. You can't modify Redis source code (A), Blackbox only does external probing (C), and Pushgateway is for batch jobs (D).
</details>

---

### Question 28
**Which Node Exporter metric would you use to calculate disk usage percentage?**

A) `node_disk_read_bytes_total` and `node_disk_written_bytes_total`
B) `node_filesystem_size_bytes` and `node_filesystem_avail_bytes`
C) `node_disk_io_time_seconds_total`
D) `node_memory_MemTotal_bytes` and `node_memory_MemAvailable_bytes`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Disk usage percentage is calculated using `node_filesystem_size_bytes` (total disk size) and `node_filesystem_avail_bytes` (available space):
```promql
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100
```
Option A gives disk I/O throughput. Option C gives disk I/O utilization time. Option D is for memory, not disk.
</details>

---

### Question 29
**What is the key difference between white-box and black-box monitoring in the context of Prometheus instrumentation?**

A) White-box uses counters; black-box uses gauges
B) White-box monitors from inside the application using client libraries; black-box monitors from outside using probes like the Blackbox Exporter
C) White-box is for Linux servers; black-box is for cloud services
D) White-box uses the push model; black-box uses the pull model

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

**White-box monitoring** involves instrumenting the application from within using client libraries, exposing internal metrics like request rates, error rates, queue depths, and connection pool usage. **Black-box monitoring** observes the system from the outside, like a real user, using tools like the Blackbox Exporter to probe endpoints for availability, response time, and SSL certificate validity. Both approaches are complementary and should be used together.
</details>

---

### Question 30
**Which of the following statements about Prometheus client libraries is TRUE?**

A) Client libraries only support the Counter metric type
B) Client libraries automatically expose a `/metrics` endpoint and collect default process/runtime metrics
C) Client libraries use the push model to send metrics to Prometheus
D) Client libraries can only be used with Go applications

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Prometheus client libraries automatically:
1. Expose a `/metrics` HTTP endpoint in the correct exposition format
2. Collect default process metrics (CPU, memory, file descriptors)
3. Collect runtime metrics (GC pauses, goroutines/threads, heap usage)

They support ALL four metric types (Counter, Gauge, Histogram, Summary) — not just counters (A). They work with the pull model (Prometheus scrapes the `/metrics` endpoint), not push (C). Official libraries exist for Go, Python, Java, and Ruby, with community libraries for many more languages (D is wrong).
</details>

---

---

## ✅ DOMAIN 4 REVISION SUMMARY CHEAT SHEET

```
┌──────────────────────────────────────────────────────────────────────┐
│              DOMAIN 4: INSTRUMENTATION & EXPORTERS CHEAT SHEET       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  INSTRUMENTATION = Adding monitoring code to expose internal metrics │
│  Client Library = Inside app code (Go, Python, Java, Ruby)          │
│  Exporter = Separate process for 3rd-party systems                   │
│                                                                      │
│  CLIENT LIBRARIES:                                                   │
│  Official: Go (most mature), Python, Java, Ruby                      │
│  Community: .NET, Node.js, Rust, C++, PHP                            │
│  Auto-provide: /metrics endpoint + process/runtime metrics           │
│  Support: Counter, Gauge, Histogram, Summary                         │
│                                                                      │
│  NAMING CONVENTIONS:                                                 │
│  ✅ snake_case (no hyphens, no camelCase)                            │
│  ✅ Base units: seconds, bytes, celsius, ratio                       │
│  ✅ _total suffix for counters                                       │
│  ✅ Include unit in name: _seconds, _bytes                           │
│  ❌ No type in name (not _counter, not _gauge)                       │
│  ❌ No colons (:) in raw metrics (reserved for recording rules)      │
│  ❌ No __ prefix labels (reserved for internal use)                  │
│                                                                      │
│  BEST PRACTICES:                                                     │
│  ✅ Low cardinality labels (method, status, endpoint)                │
│  ❌ High cardinality labels (user_id, session_id, request_id)        │
│  ✅ Store raw counters, use rate() in PromQL                         │
│  ❌ Don't pre-calculate rates in application                         │
│  ✅ Always provide HELP strings                                      │
│  ✅ Histogram > Summary for distributed systems                      │
│                                                                      │
│  METRIC TYPE DECISION:                                               │
│  Counting events?        → Counter (_total suffix)                   │
│  Current state?          → Gauge                                     │
│  Distribution (multi)?   → Histogram (aggregatable ✅)               │
│  Distribution (single)?  → Summary (not aggregatable ❌)             │
│                                                                      │
│  COMMON EXPORTERS:                                                   │
│  ┌──────────────────┬──────┬─────────────────────────────┐           │
│  │ Node Exporter    │ 9100 │ Linux CPU, mem, disk, net   │           │
│  │ Blackbox Exporter│ 9115 │ HTTP/TCP/ICMP/DNS probing   │           │
│  │ cAdvisor         │ 8080 │ Container metrics            │           │
│  │ MySQL Exporter   │ 9104 │ MySQL/MariaDB                │           │
│  │ PostgreSQL       │ 9187 │ PostgreSQL                   │           │
│  │ Redis Exporter   │ 9121 │ Redis                        │           │
│  │ SNMP Exporter    │ 9116 │ Network devices              │           │
│  │ JMX Exporter     │ var  │ Java JMX                     │           │
│  │ Kafka Exporter   │ 9308 │ Apache Kafka                 │           │
│  └──────────────────┴──────┴─────────────────────────────┘           │
│                                                                      │
│  NODE EXPORTER:                                                      │
│  Port 9100, Linux system metrics                                     │
│  Key metrics: node_cpu_seconds_total, node_memory_*_bytes,           │
│  node_filesystem_*_bytes, node_network_*_bytes_total, node_load*     │
│  Collectors can be enabled/disabled via flags                        │
│                                                                      │
│  BLACKBOX EXPORTER:                                                  │
│  Port 9115, /probe endpoint (NOT /metrics!)                          │
│  Probes: HTTP, HTTPS, TCP, ICMP, DNS                                 │
│  Target passed as URL param: /probe?target=URL&module=http_2xx       │
│  Key metrics: probe_success, probe_duration_seconds,                 │
│  probe_http_status_code, probe_ssl_earliest_cert_expiry              │
│  Requires relabeling in prometheus.yml                               │
│                                                                      │
│  PUSHGATEWAY:                                                        │
│  Port 9091, ONLY for short-lived batch jobs                          │
│  Push via HTTP POST/PUT to /metrics/job/<name>                       │
│  Delete via HTTP DELETE when done                                    │
│  ⚠️ Metrics persist until explicitly deleted!                        │
│  ⚠️ honor_labels: true required in Prometheus config                 │
│  ❌ NOT for long-running services                                    │
│  ❌ NOT for firewall traversal (use remote_write)                    │
│                                                                      │
│  EXPOSITION FORMAT:                                                  │
│  Content-Type: text/plain; version=0.0.4                             │
│  # HELP <name> <description>                                         │
│  # TYPE <name> <counter|gauge|histogram|summary|untyped>             │
│  <name>{labels} <value> [<timestamp>]                                │
│  UTF-8, label values in double quotes, escape \" \\ \n              │
│                                                                      │
│  INFO METRICS: gauge = 1 with metadata labels                        │
│  Example: app_build_info{version="1.2", commit="abc"} 1             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

You've now completed **Domain 4 (16%)**! Combined with Domains 1-3, you've covered **82% of the exam**! 🎉

> **Reply with "Domain 4 Complete"** and I'll provide the guides for the remaining three domains:
> 
> **Domain 5: Dashboarding & Visualization (8%)**
> - Grafana fundamentals, data sources, panel types, variables, templating
> 
> **Domain 6: Service Discovery (6%)**
> - Static, File, DNS, Kubernetes, Consul, EC2 SD + Relabeling deep dive
> 
> **Domain 7: Alerting & Alertmanager (4%)**
> - Alerting rules, Alertmanager config, routing, grouping, silencing, inhibition
> 
> These three domains together are only 18%, so I can cover them more concisely or combine them into one comprehensive guide — your choice! 🚀
