---
title: "Introduction"
description: "PCA exam overview, study plan, and revision checklist"
domain: 0
order: 0
---

# 🎯 PCA (Prometheus Certified Associate) Exam Preparation Guide

Congratulations on completing the KodeKloud course! Here's a comprehensive revision plan to help you clear the PCA exam in December.

---

## 📋 Exam Overview

| Detail | Info |
|--------|------|
| **Duration** | 90 minutes |
| **Questions** | 60 multiple choice |
| **Passing Score** | 75% |
| **Format** | Online, proctored |
| **Cost** | $250 (1 free retake) |
| **Validity** | 2 years |

---

## 📊 Exam Domain Weightage

```
┌─────────────────────────────────────────────────────┐
│ 1. Observability Concepts           -  18%          │
│ 2. Prometheus Fundamentals          -  20%          │
│ 3. PromQL                           -  28%  ⭐      │
│ 4. Instrumentation & Exporters      -  16%          │
│ 5. Dashboarding (Grafana)           -   8%          │
│ 6. Service Discovery                -   6%          │
│ 7. Alerting (Alertmanager)          -   4%          │
│ 8. Push Gateway                     -   -%          │
└─────────────────────────────────────────────────────┘
```

> **Key Insight:** PromQL alone is 28% — master it thoroughly!

---

## 📚 Study Material (Organized by Priority)

### 🥇 PRIMARY Resources (Must Do)

#### 1. **Official Prometheus Documentation**
- 🔗 https://prometheus.io/docs/introduction/overview/
- **Focus Areas:**
  - Architecture & Components
  - Configuration (`prometheus.yml`)
  - PromQL functions & operators
  - Service Discovery mechanisms
  - Alerting rules & Alertmanager
  - Storage & Data Model
  - Metric types (Counter, Gauge, Histogram, Summary)

#### 2. **CNCF PCA Exam Curriculum**
- 🔗 https://github.com/cncf/curriculum/blob/master/PCA_Curriculum.pdf
- **This is the official syllabus — align ALL your study to this**

#### 3. **KodeKloud PCA Course (Revision)**
- Go through the **practice tests** and **mock exams** again
- Focus on questions you got wrong previously

#### 4. **PromLabs - PromQL Cheat Sheet**
- 🔗 https://promlabs.com/promql-cheat-sheet/
- Excellent for quick revision of PromQL functions

---

### 🥈 SECONDARY Resources (Highly Recommended)

#### 5. **Prometheus: Up & Running (Book by Julien Pivotto - O'Reilly)**
- 2nd Edition (2023) — Updated and PCA-relevant
- Covers everything end-to-end
- Read chapters aligned with exam domains

#### 6. **PromLabs Training**
- 🔗 https://training.promlabs.com/
- **"Getting Started with PromQL"** — Free course by Julius Volz (Prometheus co-founder)
- Best resource specifically for PromQL mastery

#### 7. **YouTube Resources**
- **That DevOps Guy** — Prometheus tutorial series
- **TechWorld with Nana** — Prometheus monitoring overview
- **KodeKloud YouTube** — PCA-specific videos

---

### 🥉 PRACTICE & HANDS-ON (Critical)

#### 8. **Hands-On Lab Setup**
```bash
# Quick Docker setup for practice
docker run -d --name prometheus -p 9090:9090 prom/prometheus
docker run -d --name grafana -p 3000:3000 grafana/grafana
docker run -d --name node-exporter -p 9100:9100 prom/node-exporter
docker run -d --name alertmanager -p 9093:9093 prom/alertmanager
docker run -d --name pushgateway -p 9091:9091 prom/pushgateway
```

#### 9. **Practice Platforms**
- **KodeKloud Playground** — Spin up environments
- **PromLens** (https://promlens.com/) — PromQL query builder & analyzer
- **Killercoda** — Interactive Prometheus scenarios

---

## 📝 Domain-wise Revision Checklist

### Domain 1: Observability Concepts (18%)
```
□ Metrics vs Logs vs Traces
□ Push vs Pull model
□ What is observability vs monitoring
□ SLI, SLO, SLA concepts
□ Golden signals (Latency, Traffic, Errors, Saturation)
□ RED method (Rate, Errors, Duration)
□ USE method (Utilization, Saturation, Errors)
□ Why Prometheus uses pull model
□ Advantages/disadvantages of pull-based monitoring
```

### Domain 2: Prometheus Fundamentals (20%)
```
□ Prometheus Architecture (draw from memory!)
   - Prometheus Server (Retrieval, TSDB, HTTP Server)
   - Service Discovery
   - Pushgateway
   - Alertmanager
   - Exporters
   - Client Libraries
□ Data Model
   - Metric name
   - Labels (key-value pairs)
   - Samples (timestamp + value)
   - Time series notation: metric_name{label="value"}
□ Metric Types:
   - Counter (monotonically increasing) → rate(), increase()
   - Gauge (goes up and down) → can use directly
   - Histogram (buckets, _bucket, _sum, _count) → histogram_quantile()
   - Summary (quantiles, _sum, _count) → pre-calculated quantiles
□ prometheus.yml configuration
   - global (scrape_interval, evaluation_interval)
   - scrape_configs
   - alerting
   - rule_files
□ Storage
   - Local storage (TSDB)
   - Remote read/write
   - Retention (--storage.tsdb.retention.time)
   - WAL (Write-Ahead Log)
□ Exposition formats
□ Timestamps and staleness
```

### Domain 3: PromQL (28%) ⭐ MOST IMPORTANT
```
□ Selectors:
   - Instant vector: http_requests_total{method="GET"}
   - Range vector: http_requests_total[5m]
   - Label matchers: =, !=, =~, !~
□ Operators:
   - Arithmetic: +, -, *, /, %, ^
   - Comparison: ==, !=, >, <, >=, <=
   - Logical: and, or, unless
   - Vector matching: on(), ignoring(), group_left(), group_right()
□ Aggregation Operators:
   - sum, avg, min, max, count
   - stddev, stdvar
   - topk, bottomk
   - count_values
   - quantile
   - by() and without() clauses
□ Functions (CRITICAL):
   - rate() vs irate()
   - increase()
   - histogram_quantile()
   - predict_linear()
   - delta() vs idelta()
   - deriv()
   - abs(), ceil(), floor(), round()
   - time(), timestamp()
   - label_replace(), label_join()
   - absent(), absent_over_time()
   - changes(), resets()
   - sort(), sort_desc()
   - clamp(), clamp_min(), clamp_max()
   - vector(), scalar()
   - <aggregation>_over_time() functions
     (avg_over_time, sum_over_time, min_over_time, etc.)
□ Subqueries
□ Recording rules (naming conventions: level:metric:operations)
□ offset modifier
□ @ modifier
```

### Domain 4: Instrumentation & Exporters (16%)
```
□ Client Libraries:
   - Go, Python, Java, Ruby, .NET
   - How to instrument application code
   - When to use which metric type
□ Common Exporters:
   - Node Exporter (Linux metrics)
   - Blackbox Exporter (probing - HTTP, TCP, ICMP, DNS)
   - cAdvisor (container metrics)
   - MySQL Exporter
   - Custom exporters
□ Naming conventions:
   - snake_case
   - unit suffix (e.g., _seconds, _bytes, _total)
   - _total suffix for counters
   - Base units (seconds not milliseconds, bytes not megabytes)
□ Instrumentation best practices
□ /metrics endpoint format
```

### Domain 5: Dashboarding & Visualization (8%)
```
□ Grafana basics
   - Adding Prometheus as data source
   - Panel types (Graph, Stat, Gauge, Table, Heatmap)
   - Variables and templating
   - Dashboard JSON model
□ Prometheus native UI
   - Expression browser
   - /graph endpoint
   - Console templates
```

### Domain 6: Service Discovery (6%)
```
□ Static configs (static_configs)
□ File-based SD (file_sd_configs)
□ DNS-based SD
□ Kubernetes SD (kubernetes_sd_configs)
   - Roles: node, pod, service, endpoints, ingress
□ Consul SD
□ EC2 SD
□ Relabeling:
   - relabel_configs (before scrape)
   - metric_relabel_configs (after scrape)
   - Actions: replace, keep, drop, labelmap, labeldrop, labelkeep
   - __meta_* labels
   - __address__, __scheme__, __metrics_path__
```

### Domain 7: Alerting (4%)
```
□ Alerting rules syntax:
   - alert, expr, for, labels, annotations
□ Alertmanager:
   - Routing tree
   - Grouping (group_by)
   - Inhibition
   - Silencing
   - Receivers (email, Slack, PagerDuty, webhook)
   - repeat_interval, group_wait, group_interval
□ Alert states: Inactive → Pending → Firing
□ Template functions in annotations ({{ $value }}, {{ $labels }})
```

---

## 📅 6-Week Revision Plan (Nov - Dec)

```
Week 1 (Nov 1-7):    Observability Concepts + Prometheus Architecture
                      → Read official docs + Book chapters 1-4
                      
Week 2 (Nov 8-14):   Prometheus Configuration + Data Model + Storage
                      → Hands-on lab setup, practice configs
                      
Week 3 (Nov 15-21):  PromQL Deep Dive (Part 1)
                      → Selectors, operators, aggregations
                      → Complete PromLabs free course
                      
Week 4 (Nov 22-28):  PromQL Deep Dive (Part 2)
                      → Functions, recording rules, subqueries
                      → Practice 50+ PromQL queries hands-on
                      
Week 5 (Dec 1-7):    Exporters + Service Discovery + Alerting
                      → Configure node_exporter, blackbox_exporter
                      → Set up Alertmanager with routing
                      → Grafana dashboards
                      
Week 6 (Dec 8-14):   Mock Exams + Weak Area Review
                      → KodeKloud mock exams
                      → Revisit wrong answers
                      → Quick revision of all checklists
```

---

## 🔥 Quick Revision Flash Cards (Key Concepts)

```
Q: rate() vs irate()?
A: rate() = per-second average over range
   irate() = per-second instant rate (last 2 data points)
   Use rate() for alerts, irate() for graphs

Q: Histogram vs Summary?
A: Histogram: server-side quantile calculation, aggregatable
   Summary: client-side quantile calculation, NOT aggregatable

Q: Recording rule naming convention?
A: level:metric:operations
   Example: job:http_requests_total:rate5m

Q: What does absent() do?
A: Returns 1 if the metric doesn't exist (useful for dead-man alerts)

Q: relabel_configs vs metric_relabel_configs?
A: relabel_configs: applied BEFORE scrape (on targets)
   metric_relabel_configs: applied AFTER scrape (on metrics)

Q: Default scrape_interval?
A: 1 minute (60s)

Q: What port does Node Exporter use?
A: 9100

Q: Push vs Pull — when to use Pushgateway?
A: Short-lived/batch jobs that may not live long enough to be scraped
```

---

## ⚠️ Common Exam Pitfalls

1. **Don't confuse `rate()` with `increase()`** — rate gives per-second, increase gives total increase
2. **Counter resets** — `rate()` and `increase()` handle resets automatically
3. **`histogram_quantile()`** — first argument is quantile (0-1), not percentage
4. **Label matching in binary operations** — understand `on()`, `ignoring()`, `group_left()`, `group_right()`
5. **`absent()` vs `absent_over_time()`** — know when to use each
6. **Staleness** — a time series goes stale after 5 minutes of no new samples
7. **`for` duration in alerts** — how long condition must be true before firing

---

## 🔗 Quick Links Bookmark List

| Resource | URL |
|----------|-----|
| PCA Curriculum | https://github.com/cncf/curriculum |
| Prometheus Docs | https://prometheus.io/docs/ |
| PromQL Reference | https://prometheus.io/docs/prometheus/latest/querying/basics/ |
| PromLabs Training | https://training.promlabs.com/ |
| PromQL Cheat Sheet | https://promlabs.com/promql-cheat-sheet/ |
| Exam Registration | https://training.linuxfoundation.org/certification/prometheus-certified-associate/ |
| Killer.sh (if available) | Check for PCA simulator |

---

> **💡 Pro Tip:** The exam is **open book** (you can access official Prometheus docs during the exam), but you won't have time to look up everything. Aim to know 80% from memory and use docs only for syntax verification.

**Good luck with your PCA exam! 🚀**
