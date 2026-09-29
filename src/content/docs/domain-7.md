---
title: "Domain 7: Alerting & Alertmanager"
description: "Alerting Rules, Alert States, Alertmanager Routing, Grouping, Inhibition, Silencing, Receivers"
domain: 7
weight: 4
order: 7
---

# 📘 PCA EXAM — DOMAIN 7: ALERTING & ALERTMANAGER (4%)
## *Complete One-Stop Guide: Theory → Examples → Exam Questions*

> **🎉 This is the FINAL domain! After this, you'll have 100% exam coverage!**

---

## TABLE OF CONTENTS

```
7.1   Alerting Architecture Overview
7.2   Alerting Rules Syntax
7.3   Alert States (Inactive → Pending → Firing)
7.4   Alert Rule Examples (Common Patterns)
7.5   Alertmanager — Overview & Architecture
7.6   Alertmanager Configuration (alertmanager.yml)
7.7   Routing Tree (Deep Dive)
7.8   Grouping (group_by, group_wait, group_interval)
7.9   Receivers (Slack, Email, PagerDuty, Webhook)
7.10  Inhibition Rules
7.11  Silencing
7.12  Notification Templates
7.13  Alertmanager High Availability
7.14  Real-World Alerting Scenarios
7.15  EXAM-STYLE QUESTIONS (20 Questions with Answers)
```

---

---

## 7.1 📖 ALERTING ARCHITECTURE OVERVIEW

### The Complete Alerting Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROMETHEUS ALERTING FLOW                      │
│                                                                 │
│  Step 1: Prometheus evaluates alerting rules                    │
│          (every evaluation_interval, default 1m)                │
│                                                                 │
│  ┌──────────────────────────────────────────────┐               │
│  │  PROMETHEUS SERVER                            │               │
│  │                                               │               │
│  │  Rule Manager:                                │               │
│  │    Evaluates: up == 0                         │               │
│  │    Result: 3 targets are down                 │               │
│  │    State: PENDING (for: 5m not yet reached)   │               │
│  │    ... 5 minutes later ...                    │               │
│  │    State: FIRING 🔥                           │               │
│  │                                               │               │
│  │    ──── HTTP POST to Alertmanager ────►       │               │
│  └───────────────────────────────────────┬───────┘               │
│                                          │                       │
│  Step 2: Alertmanager receives alerts    │                       │
│                                          ▼                       │
│  ┌──────────────────────────────────────────────┐               │
│  │  ALERTMANAGER                                 │               │
│  │                                               │               │
│  │  1. Deduplication (same alert from replicas)  │               │
│  │  2. Grouping (group related alerts)           │               │
│  │  3. Inhibition (suppress dependent alerts)    │               │
│  │  4. Silencing (mute during maintenance)       │               │
│  │  5. Routing (send to correct receiver)        │               │
│  │  6. Notification (Slack, Email, PagerDuty)    │               │
│  │                                               │               │
│  └──────┬──────────┬──────────┬─────────────────┘               │
│         │          │          │                                  │
│         ▼          ▼          ▼                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │  Slack   │ │  Email   │ │ PagerDuty│                        │
│  │ #alerts  │ │ ops@co   │ │ on-call  │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

```
Prometheus Server:
  → Evaluates alerting rules (PromQL expressions)
  → Tracks alert states (Inactive, Pending, Firing)
  → Sends FIRING alerts to Alertmanager via HTTP API

Alertmanager (Separate Binary!):
  → Receives alerts from Prometheus
  → Groups, deduplicates, routes, and sends notifications
  → Manages silences and inhibition rules
  → Runs on port 9093 (default)
  → Has its own web UI at http://alertmanager:9093
```

---

---

## 7.2 📖 ALERTING RULES SYNTAX

### Complete Syntax

```yaml
# alerting_rules.yml
groups:
  - name: example_alerts
    interval: 30s  # Optional: override evaluation_interval for this group
    
    rules:
      - alert: <AlertName>              # Required: unique alert name
        expr: <PromQL Expression>       # Required: condition to evaluate
        for: <Duration>                 # Optional: how long condition must be true
        labels:                         # Optional: additional labels
          <label_name>: <label_value>
        annotations:                    # Optional: human-readable info
          <annotation_name>: <annotation_value>
```

### Detailed Breakdown

```yaml
- alert: InstanceDown                    # Alert name (CamelCase convention)
  expr: up == 0                          # PromQL: fires when target is down
  for: 5m                                # Must be true for 5 minutes
  labels:
    severity: critical                   # Added to the alert as a label
    team: infrastructure                 # Used for routing in Alertmanager
  annotations:
    summary: "Instance {{ $labels.instance }} is down"
    description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 5 minutes."
    runbook_url: "https://wiki.example.com/runbooks/instance-down"
```

### Template Variables in Annotations

```yaml
annotations:
  # $labels — access label values from the alerting expression
  summary: "Instance {{ $labels.instance }} is down"
  # If instance="app1:8080", result: "Instance app1:8080 is down"
  
  # $value — the value of the PromQL expression
  description: "CPU usage is {{ $value }}%"
  # If expr evaluates to 95.5, result: "CPU usage is 95.5%"
  
  # $externalLabels — access external_labels from prometheus.yml
  info: "Cluster: {{ $externalLabels.cluster }}"
  
  # Humanize functions
  description: "Memory usage: {{ $value | humanizePercentage }}"
  # Converts 0.85 to "85%"
  
  description: "Duration: {{ $value | humanizeDuration }}"
  # Converts 3661 to "1h 1m 1s"
```

### Configuration in prometheus.yml

```yaml
# prometheus.yml
rule_files:
  - "alerting_rules.yml"
  - "recording_rules.yml"
  - "/etc/prometheus/rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 'alertmanager1:9093'
            - 'alertmanager2:9093'
      scheme: http
      path_prefix: /
      timeout: 10s
      api_version: v2
```

---

---

## 7.3 📖 ALERT STATES (Inactive → Pending → Firing)

### The Three States

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  INACTIVE ──(expr becomes true)──► PENDING ──(for: X)──► FIRING
│     │                               │                       │
│     │                               │ (expr becomes false)  │
│     │                               ▼                       │
│     │◄────────────────────────── INACTIVE                    │
│     │                                                       │
│     │ (expr becomes false while FIRING)                     │
│     │◄───────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### State Details

#### 1. INACTIVE (Default)
```
→ The alert condition (expr) is FALSE
→ No alert is generated
→ This is the normal state for most alerts most of the time
→ Example: up == 1 → InstanceDown alert is INACTIVE
```

#### 2. PENDING
```
→ The alert condition (expr) has become TRUE
→ BUT the "for" duration has NOT yet elapsed
→ The alert is "waiting" to confirm the issue is persistent
→ If the condition becomes FALSE before "for" elapses → back to INACTIVE
→ If no "for" is specified → skips PENDING, goes directly to FIRING

Example:
  expr: up == 0
  for: 5m
  
  t=0:   up == 0 → TRUE → Alert enters PENDING
  t=2m:  up == 0 → still TRUE → still PENDING
  t=3m:  up == 1 → FALSE → Alert returns to INACTIVE (false alarm!)
  
  OR:
  t=0:   up == 0 → TRUE → PENDING
  t=5m:  up == 0 → still TRUE → Alert transitions to FIRING 🔥
```

#### 3. FIRING
```
→ The alert condition has been TRUE for the entire "for" duration
→ Prometheus sends the alert to Alertmanager
→ Alertmanager processes and routes the notification
→ The alert remains FIRING as long as the condition is TRUE
→ When the condition becomes FALSE → alert resolves → INACTIVE

Example:
  t=0:   up == 0 → PENDING
  t=5m:  up == 0 → FIRING 🔥 (sent to Alertmanager)
  t=10m: up == 0 → still FIRING (Alertmanager may re-notify)
  t=12m: up == 1 → RESOLVED → INACTIVE (resolution sent to Alertmanager)
```

### The `for` Duration

```yaml
# With "for" — prevents flapping alerts
- alert: HighCPU
  expr: cpu_usage > 90
  for: 10m  # CPU must be > 90% for 10 continuous minutes
  # Prevents alerts from brief CPU spikes

# Without "for" — fires immediately
- alert: ServiceDown
  expr: up == 0
  # No "for" → fires immediately when condition is true
  # Use for critical alerts that need instant notification
```

### 💡 Key Takeaway for Exam
> **Inactive** = condition is false (normal state)
> **Pending** = condition is true but `for` duration not yet elapsed
> **Firing** = condition true for entire `for` duration → sent to Alertmanager
> **No `for`** = skips Pending, fires immediately
> **Resolved** = condition becomes false while Firing → back to Inactive

---

---

## 7.4 📖 ALERT RULE EXAMPLES (Common Patterns)

### 1. Instance Down (Most Common)

```yaml
- alert: InstanceDown
  expr: up == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Instance {{ $labels.instance }} is down"
    description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 5 minutes."
```

### 2. High CPU Usage

```yaml
- alert: HighCPUUsage
  expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High CPU usage on {{ $labels.instance }}"
    description: "CPU usage is {{ $value | humanize }}% on {{ $labels.instance }}."
```

### 3. High Memory Usage

```yaml
- alert: HighMemoryUsage
  expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High memory usage on {{ $labels.instance }}"
    description: "Memory usage is {{ $value | humanize }}% on {{ $labels.instance }}."
```

### 4. Disk Space Running Out

```yaml
- alert: DiskSpaceLow
  expr: (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100 > 85
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "Low disk space on {{ $labels.instance }}"
    description: "Disk usage is {{ $value | humanize }}% on {{ $labels.instance }}."

- alert: DiskWillFillIn24Hours
  expr: predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24 * 3600) < 0
  for: 30m
  labels:
    severity: critical
  annotations:
    summary: "Disk will fill within 24 hours on {{ $labels.instance }}"
```

### 5. High HTTP Error Rate

```yaml
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)
    /
    sum(rate(http_requests_total[5m])) by (job)
    * 100 > 5
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate for {{ $labels.job }}"
    description: "Error rate is {{ $value | humanize }}% for job {{ $labels.job }}."
```

### 6. High Latency

```yaml
- alert: HighLatency
  expr: |
    histogram_quantile(0.99,
      sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job)
    ) > 1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High p99 latency for {{ $labels.job }}"
    description: "p99 latency is {{ $value | humanizeDuration }} for {{ $labels.job }}."
```

### 7. SSL Certificate Expiring

```yaml
- alert: SSLCertExpiringSoon
  expr: (probe_ssl_earliest_cert_expiry - time()) / 86400 < 30
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "SSL certificate expiring in {{ $value | humanize }} days"
    description: "SSL certificate for {{ $labels.instance }} expires in less than 30 days."
```

### 8. Dead Man's Switch (Watchdog)

```yaml
- alert: Watchdog
  expr: vector(1)
  labels:
    severity: none
  annotations:
    summary: "This alert should always be firing"
    description: "If this alert stops firing, the alerting pipeline is broken!"
  # This alert is ALWAYS firing (vector(1) = 1)
  # If you stop receiving this alert, Alertmanager or Prometheus is broken
```

---

---

## 7.5 📖 ALERTMANAGER — OVERVIEW & ARCHITECTURE

### What is Alertmanager?

**Alertmanager** is a **separate component** (not part of Prometheus server) that handles alerts sent by Prometheus. It deduplicates, groups, routes, and sends notifications.

### Key Facts

```
Binary:     alertmanager
Port:       9093 (default)
UI:         http://alertmanager:9093
Config:     alertmanager.yml
Maintainer: Prometheus Team
```

### Alertmanager Responsibilities

```
1. DEDUPLICATION:
   → Multiple Prometheus replicas may send the same alert
   → Alertmanager deduplicates based on alert fingerprint
   → Only one notification per unique alert

2. GROUPING:
   → Groups related alerts into a single notification
   → Example: 50 pods down → one notification "50 pods down in namespace X"
   → Prevents notification storms

3. INHIBITION:
   → Suppresses alerts when a "parent" alert is already firing
   → Example: If "Cluster Down" fires, inhibit "Node Down" alerts

4. SILENCING:
   → Temporarily mutes alerts matching specific matchers
   → Used during planned maintenance
   → Configured via Alertmanager UI or API

5. ROUTING:
   → Routes alerts to the correct receiver based on labels
   → Example: severity=critical → PagerDuty, severity=warning → Slack

6. NOTIFICATION:
   → Sends alerts via various channels
   → Supports: Email, Slack, PagerDuty, OpsGenie, Webhook, etc.
```

---

---

## 7.6 📖 ALERTMANAGER CONFIGURATION (alertmanager.yml)

### Complete Configuration Structure

```yaml
# alertmanager.yml

# ──────────────────────────────────────────────
# GLOBAL CONFIGURATION
# ──────────────────────────────────────────────
global:
  resolve_timeout: 5m          # Time to wait before declaring alert resolved
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager@example.com'
  smtp_auth_password: 'password'
  smtp_require_tls: true
  slack_api_url: 'https://hooks.slack.com/services/T00/B00/XXX'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

# ──────────────────────────────────────────────
# TEMPLATES
# ──────────────────────────────────────────────
templates:
  - '/etc/alertmanager/templates/*.tmpl'

# ──────────────────────────────────────────────
# ROUTING TREE
# ──────────────────────────────────────────────
route:
  receiver: 'default-receiver'       # Default receiver (catch-all)
  group_by: ['alertname', 'cluster'] # Group alerts by these labels
  group_wait: 30s                    # Wait before sending first notification
  group_interval: 5m                 # Wait before sending updated notification
  repeat_interval: 4h                # Wait before re-sending same alert
  
  routes:
    # Critical alerts → PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      group_wait: 10s                # Faster for critical
      repeat_interval: 1h            # Re-notify every hour
      
    # Warning alerts → Slack
    - match:
        severity: warning
      receiver: 'slack-warnings'
      repeat_interval: 4h
      
    # Database alerts → DB team
    - match_re:
        job: 'mysql|postgres|redis'
      receiver: 'db-team-slack'
      
    # Watchdog → dead man's switch (no notification)
    - match:
        alertname: Watchdog
      receiver: 'null'               # Drop/sink receiver

# ──────────────────────────────────────────────
# RECEIVERS
# ──────────────────────────────────────────────
receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'ops-team@example.com'
        send_resolved: true

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'your-pagerduty-integration-key'
        severity: '{{ .CommonLabels.severity }}'
        description: '{{ .CommonAnnotations.summary }}'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts-warning'
        title: '{{ .CommonLabels.alertname }}'
        text: '{{ .CommonAnnotations.description }}'
        send_resolved: true

  - name: 'db-team-slack'
    slack_configs:
      - channel: '#db-alerts'
        title: 'Database Alert: {{ .CommonLabels.alertname }}'

  - name: 'null'
    # Empty receiver — discards alerts (for Watchdog)

# ──────────────────────────────────────────────
# INHIBITION RULES
# ──────────────────────────────────────────────
inhibit_rules:
  # If "ClusterDown" fires, inhibit "NodeDown" alerts
  - source_match:
      alertname: ClusterDown
    target_match:
      alertname: NodeDown
    equal: ['cluster']
    
  # If "critical" fires, inhibit "warning" for same alertname
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: ['alertname', 'instance']
```

---

---

## 7.7 📖 ROUTING TREE (Deep Dive)

### How Routing Works

```
Alert arrives at Alertmanager
         │
         ▼
┌─────────────────────────┐
│   ROOT ROUTE            │
│   receiver: default     │
│   group_by: [alertname] │
│                         │
│   Does alert match any  │
│   child route?          │
│   ┌───┬───┬───┐        │
│   │   │   │   │        │
│   ▼   ▼   ▼   ▼        │
│  R1  R2  R3  R4        │
│ sev= sev= job= alert=  │
│ crit warn db   Watch   │
│   │   │   │   │        │
│   ▼   ▼   ▼   ▼        │
│  PD  Slack DB  null    │
└─────────────────────────┘

If NO child route matches → use ROOT route's receiver (default)
If a child route matches → use that route's receiver
If continue: true → also check sibling routes
```

### Route Matching

```yaml
route:
  receiver: 'default'
  routes:
    # Exact match
    - match:
        severity: critical
        team: backend
      receiver: 'backend-critical'
      # Alert must have BOTH severity=critical AND team=backend

    # Regex match
    - match_re:
        job: 'mysql|postgres|redis'
      receiver: 'db-team'
      # Alert job must match the regex

    # Continue to next route even if this matches
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true    # ← Also check next routes!
      
    - match:
        team: backend
      receiver: 'backend-slack'
      # With continue: true above, a critical backend alert
      # goes to BOTH pagerduty AND backend-slack
```

### The `continue` Flag

```yaml
# Without continue (default: false):
# First matching route wins, stops checking
routes:
  - match: {severity: critical}
    receiver: pagerduty      # ← Alert goes here, stops
  - match: {team: backend}
    receiver: backend-slack  # ← Never reached for critical alerts

# With continue: true:
# Keeps checking sibling routes after a match
routes:
  - match: {severity: critical}
    receiver: pagerduty
    continue: true           # ← Keep checking!
  - match: {team: backend}
    receiver: backend-slack  # ← Also reached if team=backend
  # Result: critical backend alert → BOTH pagerduty AND backend-slack
```

---

---

## 7.8 📖 GROUPING

### Why Grouping?

```
Problem: 100 pods go down simultaneously
  → Without grouping: 100 separate Slack messages! 🔔🔔🔔...
  → With grouping: 1 message "100 pods down in namespace production"

Grouping reduces notification noise by combining related alerts.
```

### Grouping Parameters

```yaml
route:
  group_by: ['alertname', 'cluster', 'namespace']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
```

#### `group_by` — What to Group On

```yaml
group_by: ['alertname', 'cluster']
# Alerts with the SAME alertname AND cluster are grouped together

# Example:
# Alert 1: {alertname="InstanceDown", cluster="prod", instance="app1"}
# Alert 2: {alertname="InstanceDown", cluster="prod", instance="app2"}
# Alert 3: {alertname="InstanceDown", cluster="staging", instance="app3"}
#
# Group 1: InstanceDown + prod → [app1, app2] (one notification)
# Group 2: InstanceDown + staging → [app3] (separate notification)

group_by: ['...']
# Special: group ALL alerts into a single group (use with caution!)
```

#### `group_wait` — Initial Wait

```yaml
group_wait: 30s
# When a new group of alerts is created, wait 30s before sending
# the first notification. This allows more alerts to accumulate
# in the group before notifying.

# Use case: 50 pods crash at the same time
# → Wait 30s → collect all 50 alerts → send ONE notification
# → Instead of sending 50 separate notifications
```

#### `group_interval` — Update Wait

```yaml
group_interval: 5m
# After the first notification, wait 5m before sending an UPDATE
# if new alerts have been added to the group.

# Use case: 
# t=0:   10 pods down → wait group_wait → notify "10 pods down"
# t=2m:  5 more pods down → added to group
# t=5m:  group_interval elapsed → notify "15 pods down" (update)
```

#### `repeat_interval` — Re-notification

```yaml
repeat_interval: 4h
# If an alert is still firing after 4 hours, re-send the notification.
# This ensures on-call engineers don't forget about ongoing issues.

# Use case:
# t=0:   Alert fires → notify
# t=4h:  Alert still firing → re-notify (reminder)
# t=8h:  Alert still firing → re-notify again
```

### Timing Diagram

```
Alert fires at t=0
    │
    ▼
t=0 ──── group_wait (30s) ────► First notification sent at t=30s
                                      │
New alerts added to group             │
    │                                 │
    ▼                                 ▼
t=5m ── group_interval (5m) ──► Update notification at t=5m30s
                                      │
Alert still firing                    │
    │                                 │
    ▼                                 ▼
t=4h ── repeat_interval (4h) ──► Re-notification at t=4h
                                      │
Alert resolves                        │
    │                                 │
    ▼                                 ▼
t=4h30m ──────────────────────► Resolution notification
```

---

---

## 7.9 📖 RECEIVERS

### Supported Receiver Types

| Receiver | Use Case | Config Key |
|----------|----------|------------|
| **Email** | General notifications | `email_configs` |
| **Slack** | Team chat notifications | `slack_configs` |
| **PagerDuty** | On-call escalation | `pagerduty_configs` |
| **OpsGenie** | On-call management | `opsgenie_configs` |
| **Webhook** | Custom integrations | `webhook_configs` |
| **VictorOps** | Incident management | `victorops_configs` |
| **Pushover** | Mobile push notifications | `pushover_configs` |
| **Telegram** | Telegram bot messages | `telegram_configs` |
| **Microsoft Teams** | Teams channel (via webhook) | `msteams_configs` |
| **SNS** | AWS SNS (SMS/Email) | `sns_configs` |

### Email Receiver

```yaml
receivers:
  - name: 'email-team'
    email_configs:
      - to: 'ops-team@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager@example.com'
        auth_password: 'password'
        require_tls: true
        send_resolved: true
        headers:
          subject: '[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}'
```

### Slack Receiver

```yaml
receivers:
  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T00/B00/XXX'
        channel: '#alerts'
        username: 'Prometheus Alertmanager'
        icon_emoji: ':fire:'
        title: '[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}'
        text: >-
          *Description:* {{ .CommonAnnotations.description }}
          *Severity:* {{ .CommonLabels.severity }}
          *Instance:* {{ .CommonLabels.instance }}
        send_resolved: true
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
```

### PagerDuty Receiver

```yaml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - routing_key: 'your-pagerduty-integration-key'
        severity: '{{ .CommonLabels.severity }}'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ template "pagerduty.default.description" . }}'
        send_resolved: true
```

### Webhook Receiver

```yaml
receivers:
  - name: 'custom-webhook'
    webhook_configs:
      - url: 'http://my-service:5001/alerts'
        send_resolved: true
        http_config:
          basic_auth:
            username: 'admin'
            password: 'secret'
```

### The `send_resolved` Flag

```yaml
send_resolved: true   # Send notification when alert resolves (back to normal)
send_resolved: false  # Only notify when alert fires (default for some receivers)

# Best practice: Enable for critical alerts so you know when the issue is fixed
```

---

---

## 7.10 📖 INHIBITION RULES

### What is Inhibition?

Inhibition **suppresses** (mutes) certain alerts when other related alerts are already firing. This prevents notification noise from cascading failures.

### Syntax

```yaml
inhibit_rules:
  - source_match:          # The "parent" alert (must be firing)
      alertname: ClusterDown
      severity: critical
    target_match:          # The "child" alert (will be suppressed)
      alertname: NodeDown
    equal: ['cluster']     # Labels that must match between source and target
```

### How It Works

```
Example:
  Source alert: {alertname="ClusterDown", cluster="prod-us-east"}
  Target alert: {alertname="NodeDown", cluster="prod-us-east", instance="node1"}
  
  Rule:
    source_match: {alertname: ClusterDown}
    target_match: {alertname: NodeDown}
    equal: [cluster]
  
  Result:
    → ClusterDown is FIRING for cluster="prod-us-east"
    → NodeDown for cluster="prod-us-east" is INHIBITED (suppressed)
    → NodeDown for cluster="prod-eu-west" is NOT inhibited (different cluster)
    → You only get ONE notification: "Cluster prod-us-east is down"
    → Instead of 50 notifications: "Cluster down" + 49× "Node down"
```

### Common Inhibition Patterns

```yaml
inhibit_rules:
  # 1. Critical suppresses Warning (same alert)
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: ['alertname', 'instance']

  # 2. Cluster down suppresses Node down
  - source_match:
      alertname: ClusterDown
    target_match:
      alertname: NodeDown
    equal: ['cluster']

  # 3. Node down suppresses Pod down
  - source_match:
      alertname: NodeDown
    target_match:
      alertname: PodDown
    equal: ['instance']

  # 4. Network partition suppresses service unreachable
  - source_match:
      alertname: NetworkPartition
    target_match_re:
      alertname: 'ServiceUnreachable|HighLatency'
    equal: ['datacenter']
```

### 💡 Key Takeaway for Exam
> Inhibition = Suppress child alerts when parent alert is firing
> `source_match` = the alert that must be firing (parent)
> `target_match` = the alert to suppress (child)
> `equal` = labels that must match between source and target
> Prevents notification cascades (cluster down → node down → pod down)

---

---

## 7.11 📖 SILENCING

### What is Silencing?

Silencing **temporarily mutes** alerts matching specific matchers. Unlike inhibition (which is config-based and permanent), silences are **temporary** and managed via the Alertmanager UI or API.

### Use Cases

```
✅ Planned maintenance windows
  → "We're upgrading the database tonight, mute DB alerts for 4 hours"

✅ Known issues being worked on
  → "We know about the disk space issue, muting until fix is deployed"

✅ Testing
  → "Muting alerts while testing new alerting rules"
```

### Creating a Silence (via Alertmanager UI)

```
1. Go to http://alertmanager:9093
2. Click "Silences" → "New Silence"
3. Configure:
   → Matchers: alertname="DiskSpaceLow", instance="db1:9100"
   → Starts at: 2024-11-15 22:00 UTC
   → Ends at: 2024-11-16 02:00 UTC
   → Created by: admin
   → Comment: "Planned disk expansion maintenance"
4. Click "Create"
```

### Creating a Silence (via API)

```bash
curl -X POST http://alertmanager:9093/api/v2/silences \
  -H 'Content-Type: application/json' \
  -d '{
    "matchers": [
      {"name": "alertname", "value": "DiskSpaceLow", "isRegex": false},
      {"name": "instance", "value": "db1:9100", "isRegex": false}
    ],
    "startsAt": "2024-11-15T22:00:00Z",
    "endsAt": "2024-11-16T02:00:00Z",
    "createdBy": "admin",
    "comment": "Planned maintenance"
  }'
```

### Silence vs Inhibition

| Feature | Silence | Inhibition |
|---------|---------|------------|
| **Configuration** | UI/API (temporary) | alertmanager.yml (permanent) |
| **Duration** | Time-limited (start/end) | Always active |
| **Trigger** | Manual | Automatic (based on parent alert) |
| **Use case** | Maintenance windows | Cascading failure suppression |
| **Persistence** | Stored in Alertmanager | In config file |

---

---

## 7.12 📖 NOTIFICATION TEMPLATES

### Template Variables

```
.Status          → "firing" or "resolved"
.Alerts          → List of all alerts in the group
.Alerts.Firing   → Only firing alerts
.Alerts.Resolved → Only resolved alerts
.CommonLabels    → Labels common to ALL alerts in the group
.CommonAnnotations → Annotations common to ALL alerts
.ExternalURL     → Alertmanager URL
.GroupLabels     → Labels used for grouping
.Receiver        → Name of the receiver
```

### Example Template

```yaml
receivers:
  - name: 'slack-detailed'
    slack_configs:
      - channel: '#alerts'
        title: >-
          [{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}]
          {{ .CommonLabels.alertname }}
        text: >-
          {{ range .Alerts }}
          *Alert:* {{ .Labels.alertname }}
          *Severity:* {{ .Labels.severity }}
          *Instance:* {{ .Labels.instance }}
          *Description:* {{ .Annotations.description }}
          *Started:* {{ .StartsAt }}
          {{ end }}
        send_resolved: true
```

---

---

## 7.13 📖 ALERTMANAGER HIGH AVAILABILITY

### HA Setup

```
┌─────────────────┐     ┌─────────────────┐
│  Prometheus 1   │     │  Prometheus 2   │
│  (replica)      │     │  (replica)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │  Same alerts          │  Same alerts
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Alertmanager 1 │◄───►│  Alertmanager 2 │  ← Gossip protocol
│  :9093          │     │  :9093          │    (cluster peers)
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────┬───────────────┘
                 ▼
         Single notification (deduplicated!)
```

### Configuration

```bash
# Alertmanager 1
alertmanager \
  --cluster.listen-address=0.0.0.0:9094 \
  --cluster.peer=alertmanager2:9094

# Alertmanager 2
alertmanager \
  --cluster.listen-address=0.0.0.0:9094 \
  --cluster.peer=alertmanager1:9094
```

### Key Points

```
→ Alertmanager instances communicate via gossip protocol (port 9094)
→ They deduplicate alerts across replicas
→ Both Prometheus replicas send to BOTH Alertmanager instances
→ Only ONE notification is sent per unique alert
→ Silences are also synchronized across the cluster
```

---

---

## 7.14 📖 REAL-WORLD ALERTING SCENARIOS

### Scenario 1: Complete Alerting Pipeline

```yaml
# prometheus.yml
rule_files:
  - "alerts.yml"
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

# alerts.yml
groups:
  - name: infrastructure
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.instance }} is down"
          
      - alert: HighCPU
        expr: 100 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance) * 100 > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU on {{ $labels.instance }}"

# alertmanager.yml
route:
  receiver: 'default'
  group_by: ['alertname', 'instance']
  group_wait: 30s
  routes:
    - match: {severity: critical}
      receiver: 'pagerduty'
    - match: {severity: warning}
      receiver: 'slack'
receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@example.com'
  - name: 'pagerduty'
    pagerduty_configs:
      - routing_key: 'xxx'
  - name: 'slack'
    slack_configs:
      - channel: '#warnings'
```

---

---

## 7.15 📝 EXAM-STYLE QUESTIONS (20 Questions)

### Question 1
**What are the three states of a Prometheus alert?**

A) Active, Inactive, Resolved
B) Inactive, Pending, Firing
C) Open, Closed, Acknowledged
D) Warning, Critical, Resolved

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Prometheus alerts have three states: **Inactive** (condition is false, normal state), **Pending** (condition is true but the `for` duration hasn't elapsed yet), and **Firing** (condition has been true for the entire `for` duration, alert is sent to Alertmanager). When a Firing alert's condition becomes false, it transitions back to Inactive (resolved).
</details>

---

### Question 2
**What is the purpose of the `for` field in an alerting rule?**

A) It specifies how long the alert notification should be displayed
B) It defines how long the PromQL condition must be continuously true before the alert transitions from Pending to Firing
C) It sets the interval between alert evaluations
D) It defines the retention period for the alert

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `for` field specifies the duration that the alert condition must be continuously true before the alert transitions from **Pending** to **Firing**. This prevents flapping alerts caused by brief spikes. For example, `for: 5m` means the condition must be true for 5 continuous minutes. If the condition becomes false before the `for` duration elapses, the alert returns to Inactive. If `for` is omitted, the alert fires immediately.
</details>

---

### Question 3
**What is the default port for Alertmanager?**

A) 9090
B) 9093
C) 3000
D) 9100

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Alertmanager runs on port **9093** by default. Port 9090 is the Prometheus server, 3000 is Grafana, and 9100 is the Node Exporter.
</details>

---

### Question 4
**Is Alertmanager part of the Prometheus server?**

A) Yes, it is built into the Prometheus server binary
B) No, it is a separate component/binary that receives alerts from Prometheus
C) Yes, but it must be explicitly enabled in prometheus.yml
D) No, it is a Grafana plugin

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Alertmanager is a **separate component** with its own binary, configuration file (alertmanager.yml), and web UI (port 9093). It is NOT part of the Prometheus server. Prometheus evaluates alerting rules and sends firing alerts to Alertmanager via HTTP API. The connection is configured in the `alerting` section of prometheus.yml.
</details>

---

### Question 5
**What does the `group_by` configuration in Alertmanager do?**

A) It groups Prometheus scrape targets together
B) It groups alerts with the same label values into a single notification to reduce noise
C) It groups recording rules for faster evaluation
D) It groups Grafana dashboards

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`group_by` specifies which labels to use for grouping alerts. Alerts with the same values for the specified labels are combined into a single notification. For example, `group_by: ['alertname', 'cluster']` groups all alerts with the same alertname and cluster into one notification. This prevents notification storms — instead of 100 separate "PodDown" alerts, you get one "100 pods down in cluster X" notification.
</details>

---

### Question 6
**What is the difference between `group_wait` and `group_interval`?**

A) They are the same thing
B) `group_wait` is the initial wait before the first notification for a new group; `group_interval` is the wait before sending updates when new alerts are added to an existing group
C) `group_wait` is for critical alerts; `group_interval` is for warnings
D) `group_wait` controls evaluation frequency; `group_interval` controls notification frequency

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`group_wait` (default 30s) is the initial delay before sending the **first** notification for a newly created alert group. This allows time for related alerts to accumulate. `group_interval` (default 5m) is the delay before sending **subsequent** notifications when new alerts are added to an already-notified group. `repeat_interval` (default 4h) controls how often to re-send notifications for alerts that are still firing.
</details>

---

### Question 7
**What does the `repeat_interval` in Alertmanager control?**

A) How often Prometheus evaluates alerting rules
B) How often Alertmanager re-sends notifications for alerts that are still firing
C) How often Alertmanager checks for new silences
D) How often the Alertmanager cluster syncs state

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`repeat_interval` controls how often Alertmanager re-sends notifications for alerts that remain in the Firing state. For example, with `repeat_interval: 4h`, if an alert has been firing for 8 hours, the on-call engineer receives notifications at t=0, t=4h, and t=8h. This ensures ongoing issues aren't forgotten. The default is 4 hours.
</details>

---

### Question 8
**What is the purpose of inhibition rules in Alertmanager?**

A) To permanently delete alerts from the system
B) To suppress (mute) certain alerts when a related "parent" alert is already firing, preventing notification cascades
C) To delay alert notifications by a specified duration
D) To route alerts to different receivers

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Inhibition rules suppress "child" alerts when a "parent" alert is already firing. This prevents notification cascades during widespread failures. For example, if a "ClusterDown" alert fires, you can inhibit all "NodeDown" and "PodDown" alerts for that cluster, since they're all consequences of the same root cause. The `source_match` defines the parent alert, `target_match` defines the child alerts to suppress, and `equal` specifies which labels must match.
</details>

---

### Question 9
**What is the difference between silencing and inhibition in Alertmanager?**

A) They are the same thing with different names
B) Silencing is temporary and managed via UI/API (e.g., for maintenance); inhibition is permanent and configured in alertmanager.yml based on parent-child alert relationships
C) Silencing is for critical alerts; inhibition is for warnings
D) Silencing works in Prometheus; inhibition works in Grafana

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

**Silencing** is a temporary, manually created mute for alerts matching specific matchers. It has a start and end time and is typically used during planned maintenance. Silences are created via the Alertmanager UI or API. **Inhibition** is a permanent, config-based rule that automatically suppresses child alerts when a parent alert is firing. Inhibition is defined in alertmanager.yml and is always active.
</details>

---

### Question 10
**Which template variable would you use in an Alertmanager annotation to access the value of the PromQL expression that triggered the alert?**

A) `{{ .Labels.value }}`
B) `{{ $value }}`
C) `{{ .CommonLabels.value }}`
D) `{{ .Alerts.Value }}`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In Prometheus alerting rule annotations, `{{ $value }}` gives you the value of the PromQL expression that triggered the alert. For example, if `expr: cpu_usage > 90` evaluates to 95.5, then `{{ $value }}` in the annotation would be "95.5". `{{ $labels.xxx }}` accesses label values. Note: In Alertmanager notification templates (not Prometheus annotations), you use `.CommonLabels`, `.Alerts`, etc.
</details>

---

### Question 11
**What happens when an alerting rule has no `for` field?**

A) The alert never fires
B) The alert is evaluated but stays in Pending state forever
C) The alert fires immediately when the condition becomes true, skipping the Pending state
D) Prometheus returns an error

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

When the `for` field is omitted from an alerting rule, the alert transitions directly from Inactive to **Firing** as soon as the PromQL condition becomes true. It skips the Pending state entirely. This is useful for critical alerts that need immediate notification (e.g., service completely down). However, it can cause flapping alerts if the condition oscillates rapidly.
</details>

---

### Question 12
**Which section of prometheus.yml configures the connection to Alertmanager?**

A) `rule_files`
B) `scrape_configs`
C) `alerting`
D) `remote_write`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `alerting` section in prometheus.yml configures how Prometheus connects to Alertmanager. It specifies the Alertmanager target addresses, scheme, timeout, and API version. Example:
```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```
`rule_files` loads alerting/recording rules, `scrape_configs` defines scrape targets, and `remote_write` sends data to external storage.
</details>

---

### Question 13
**What does the `continue: true` flag do in an Alertmanager routing rule?**

A) It continues sending notifications even after the alert resolves
B) It tells Alertmanager to continue checking sibling routes after a match, instead of stopping at the first match
C) It continues evaluating the alerting rule even if Prometheus restarts
D) It continues the silence after it expires

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

By default, when an alert matches a route in the Alertmanager routing tree, it stops checking further sibling routes. Setting `continue: true` tells Alertmanager to continue checking subsequent sibling routes even after a match. This allows an alert to be sent to multiple receivers. For example, a critical alert could match both a PagerDuty route and a Slack route if `continue: true` is set on the first match.
</details>

---

### Question 14
**What is the `resolve_timeout` in Alertmanager's global configuration?**

A) How long to wait before sending the first notification
B) The time Alertmanager waits after the last alert notification before declaring the alert as resolved
C) How long silences last by default
D) The timeout for connecting to receivers

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`resolve_timeout` (default 5m) is the time Alertmanager waits after receiving the last alert notification from Prometheus before declaring the alert as resolved. If Prometheus stops sending an alert (because the condition became false), Alertmanager waits for `resolve_timeout` before sending a "resolved" notification. This prevents premature resolution notifications due to temporary network issues between Prometheus and Alertmanager.
</details>

---

### Question 15
**Which of the following is NOT a supported Alertmanager receiver type?**

A) Slack
B) PagerDuty
C) Grafana Dashboard
D) Webhook

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

**Grafana Dashboard** is NOT a supported Alertmanager receiver type. Supported receivers include: Email, Slack, PagerDuty, OpsGenie, Webhook, VictorOps, Pushover, Telegram, Microsoft Teams, SNS, and others. While Grafana has its own alerting system that can integrate with Prometheus, "Grafana Dashboard" is not a receiver type in Alertmanager.
</details>

---

### Question 16
**In an Alertmanager inhibition rule, what does the `equal` field specify?**

A) The labels that must have the same value in both the source and target alerts for the inhibition to apply
B) The labels that must be different between source and target
C) The exact alert names that should be inhibited
D) The severity levels that are considered equal

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

The `equal` field in an inhibition rule specifies a list of labels that must have **identical values** in both the source (parent) and target (child) alerts for the inhibition to take effect. For example, `equal: ['cluster']` means the inhibition only applies when the source and target alerts have the same `cluster` label value. This ensures that a "ClusterDown" alert for cluster-A only inhibits "NodeDown" alerts for cluster-A, not cluster-B.
</details>

---

### Question 17
**What is the purpose of the `send_resolved` flag in an Alertmanager receiver?**

A) It determines whether to send a notification when an alert transitions from Firing back to Inactive (resolved)
B) It determines whether to resolve DNS names in the receiver URL
C) It determines whether to resolve template variables in the notification
D) It determines whether to automatically resolve silences

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

`send_resolved: true` tells the receiver to send a notification when an alert is resolved (transitions from Firing back to Inactive). This lets the team know the issue has been fixed. For example, a Slack notification might say "[RESOLVED] InstanceDown - app1:8080 is back up." By default, `send_resolved` is false for some receivers and true for others. It's recommended to enable it for critical alerts.
</details>

---

### Question 18
**Which PromQL expression is commonly used for a "dead man's switch" (Watchdog) alert?**

A) `up == 0`
B) `absent(up)`
C) `vector(1)`
D) `rate(errors_total[5m]) > 0`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`vector(1)` always evaluates to 1, meaning the alert is **always firing**. This is used as a "dead man's switch" or Watchdog alert. The alert is sent to a receiver that expects to receive it regularly (e.g., every 5 minutes). If the Watchdog alert stops arriving, it means the entire alerting pipeline is broken (Prometheus is down, Alertmanager is down, or the notification channel is broken). This ensures you're alerted when the alerting system itself fails.
</details>

---

### Question 19
**How does Alertmanager deduplicate alerts in a high-availability setup?**

A) By comparing alert names only
B) By using a gossip protocol between Alertmanager instances to synchronize state and deduplicate based on alert fingerprints
C) By relying on Prometheus to send alerts to only one Alertmanager instance
D) By using a shared database

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In an HA setup, multiple Prometheus replicas send the same alerts to multiple Alertmanager instances. Alertmanager instances communicate via a **gossip protocol** (default port 9094) to synchronize their state. They deduplicate alerts based on alert fingerprints (hash of labels). This ensures that even though multiple copies of the same alert arrive, only **one notification** is sent to the receiver. Silences are also synchronized across the cluster.
</details>

---

### Question 20
**What is the correct order of the alerting pipeline?**

A) Alertmanager evaluates rules → Prometheus sends notifications → Grafana displays alerts
B) Prometheus evaluates alerting rules → Firing alerts sent to Alertmanager → Alertmanager groups, routes, and sends notifications to receivers
C) Grafana evaluates rules → Sends to Prometheus → Prometheus sends to Slack
D) Exporters generate alerts → Prometheus forwards to Grafana → Grafana notifies users

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The correct alerting pipeline is:
1. **Prometheus** evaluates alerting rules (PromQL expressions) at `evaluation_interval`
2. When an alert transitions to **Firing** (condition true for `for` duration), Prometheus sends it to **Alertmanager** via HTTP API
3. **Alertmanager** deduplicates, groups, applies inhibition/silencing, routes based on labels, and sends **notifications** to receivers (Slack, Email, PagerDuty, etc.)

Grafana is not part of the core alerting pipeline (though it has its own alerting feature). Exporters don't generate alerts — they only expose metrics.
</details>

---

---

## ✅ DOMAIN 7 REVISION SUMMARY CHEAT SHEET

```
┌──────────────────────────────────────────────────────────────────────┐
│              DOMAIN 7: ALERTING & ALERTMANAGER CHEAT SHEET           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ALERTING PIPELINE:                                                  │
│  Prometheus evaluates rules → Firing alerts → Alertmanager → Notify  │
│                                                                      │
│  ALERT STATES:                                                       │
│  Inactive → (expr true) → Pending → (for: X elapsed) → Firing 🔥    │
│  Firing → (expr false) → Resolved → Inactive                        │
│  No "for" field → Skips Pending, fires immediately                   │
│                                                                      │
│  ALERTING RULE SYNTAX:                                               │
│  - alert: AlertName                                                  │
│    expr: <PromQL>                                                    │
│    for: <duration>        (optional, prevents flapping)              │
│    labels: {severity: critical}                                      │
│    annotations: {summary: "...", description: "..."}                 │
│  Templates: {{ $labels.xxx }}, {{ $value }}, {{ $externalLabels }}   │
│                                                                      │
│  ALERTMANAGER:                                                       │
│  Separate binary, port 9093, config: alertmanager.yml                │
│  Responsibilities: Dedup, Group, Inhibit, Silence, Route, Notify     │
│                                                                      │
│  ROUTING:                                                            │
│  route:                                                              │
│    receiver: default                                                 │
│    group_by: [alertname, cluster]                                    │
│    group_wait: 30s        (initial wait for new group)               │
│    group_interval: 5m     (wait for updates to existing group)       │
│    repeat_interval: 4h    (re-notify if still firing)                │
│    routes:                                                           │
│      - match: {severity: critical} → receiver: pagerduty             │
│      - match: {severity: warning}  → receiver: slack                 │
│  continue: true → Check sibling routes after match                   │
│  match_re: → Regex matching                                          │
│                                                                      │
│  RECEIVERS:                                                          │
│  Email, Slack, PagerDuty, OpsGenie, Webhook, VictorOps, etc.        │
│  send_resolved: true → Notify when alert resolves                    │
│                                                                      │
│  INHIBITION:                                                         │
│  Suppress child alerts when parent is firing                         │
│  source_match (parent) → target_match (child)                        │
│  equal: [labels that must match]                                     │
│  Example: ClusterDown inhibits NodeDown                              │
│                                                                      │
│  SILENCING:                                                          │
│  Temporary mute via UI/API (start/end time)                          │
│  Use for: Maintenance windows, known issues                          │
│  Different from inhibition (permanent, config-based)                 │
│                                                                      │
│  HA SETUP:                                                           │
│  Multiple Alertmanager instances with gossip protocol (port 9094)    │
│  Deduplicates alerts across replicas                                 │
│  Silences synchronized across cluster                                │
│                                                                      │
│  WATCHDOG:                                                           │
│  expr: vector(1) → Always firing                                     │
│  If this alert stops → alerting pipeline is broken!                  │
│                                                                      │
│  CONFIG IN prometheus.yml:                                           │
│  rule_files: ["alerts.yml"]                                          │
│  alerting:                                                           │
│    alertmanagers:                                                    │
│      - static_configs:                                               │
│          - targets: ['alertmanager:9093']                            │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

---

## 🎉 CONGRATULATIONS! YOU'VE COMPLETED ALL 7 DOMAINS!

### Complete Exam Coverage Summary

| Domain | Topic | Weight | Status |
|--------|-------|--------|--------|
| 1 | Observability Concepts | 18% | ✅ Complete |
| 2 | Prometheus Fundamentals | 20% | ✅ Complete |
| 3 | PromQL | 28% | ✅ Complete |
| 4 | Instrumentation & Exporters | 16% | ✅ Complete |
| 5 | Dashboarding & Visualization | 8% | ✅ Complete |
| 6 | Service Discovery | 6% | ✅ Complete |
| 7 | Alerting & Alertmanager | 4% | ✅ Complete |
| | **TOTAL** | **100%** | **🎉 DONE!** |

### Final Exam Tips

```
1. PromQL is 28% — practice queries hands-on!
2. Know the 4 metric types cold (Counter, Gauge, Histogram, Summary)
3. Understand rate() vs irate() vs increase()
4. Know histogram_quantile() syntax perfectly
5. Remember: Histogram aggregatable ✅, Summary NOT ❌
6. Pull model advantages (failure detection, debugging, centralized config)
7. SLI = measure, SLO = target, SLA = contract
8. Golden Signals vs RED vs USE — know when to use each
9. relabel_configs (before) vs metric_relabel_configs (after)
10. Alert states: Inactive → Pending → Firing

📌 The exam is OPEN BOOK (official Prometheus docs allowed)
   But you won't have time to look up everything!
   Aim to know 80% from memory.

⏰ 90 minutes, 60 questions = 1.5 min per question
   Don't spend too long on any single question.

🎯 PASSING SCORE: 75% (45 out of 60 correct)
```

**Best of luck with your PCA exam in December! You've got this! 🚀🏆**
