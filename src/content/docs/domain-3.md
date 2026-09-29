---
title: "Domain 3: PromQL"
description: "Selectors, Operators, Functions, Aggregations, Subqueries, Recording Rules — the most important domain at 28%"
domain: 3
weight: 28
order: 3
---

# 📘 PCA EXAM — DOMAIN 3: PromQL (28%) ⭐ MOST IMPORTANT
## *Complete One-Stop Guide: Theory → Examples → Exam Questions*

> **This domain alone is 28% of the exam. Master it thoroughly!**

---

## TABLE OF CONTENTS

```
3.1   PromQL Data Types
3.2   Selectors (Instant & Range Vectors)
3.3   Label Matchers (=, !=, =~, !~)
3.4   Time Durations
3.5   The offset Modifier
3.6   The @ Modifier
3.7   Arithmetic Operators
3.8   Comparison Operators
3.9   Logical / Set Operators (and, or, unless)
3.10  Vector Matching (on, ignoring, group_left, group_right)
3.11  Aggregation Operators (sum, avg, min, max, count, etc.)
3.12  by() and without() Clauses
3.13  Functions: rate(), irate(), increase()
3.14  Functions: histogram_quantile()
3.15  Functions: delta(), idelta(), deriv(), predict_linear()
3.16  Functions: Math (abs, ceil, floor, round, clamp, etc.)
3.17  Functions: Time (time, timestamp, day_of_*, hour, etc.)
3.18  Functions: Label (label_replace, label_join)
3.19  Functions: absent(), absent_over_time()
3.20  Functions: changes(), resets()
3.21  Functions: sort(), sort_desc()
3.22  Functions: vector(), scalar()
3.23  Functions: *_over_time() Aggregations
3.24  Subqueries
3.25  Recording Rules
3.26  Common PromQL Patterns & Recipes
3.27  EXAM-STYLE QUESTIONS (35 Questions with Answers)
```

---

---

## 3.1 📖 PromQL DATA TYPES

PromQL has exactly **four** data types. Every expression evaluates to one of these.

### Type 1: Instant Vector

**Definition:** A set of time series, each containing a **single sample** at the same point in time.

```
Think of it as: "Give me the LATEST value of each matching time series RIGHT NOW"

Example:
  http_requests_total{method="GET"}
  
  Result (at time T):
    http_requests_total{method="GET", status="200", instance="app1:8080"} → 15432
    http_requests_total{method="GET", status="200", instance="app2:8080"} → 12345
    http_requests_total{method="GET", status="404", instance="app1:8080"} → 234
  
  → 3 time series, each with ONE value at time T
  → This is an INSTANT VECTOR
```

**Key Point:** When you type a query in the Prometheus UI and hit "Execute", you get an instant vector.

---

### Type 2: Range Vector

**Definition:** A set of time series, each containing a **range of samples** over a specified time window.

```
Think of it as: "Give me ALL values of each matching time series over the LAST 5 MINUTES"

Example:
  http_requests_total{method="GET"}[5m]
  
  Result:
    http_requests_total{method="GET", status="200", instance="app1:8080"} →
      @T-5m: 15000
      @T-4m: 15100
      @T-3m: 15200
      @T-2m: 15300
      @T-1m: 15400
      @T:    15432
  
  → 3 time series, each with MULTIPLE values over [T-5m, T]
  → This is a RANGE VECTOR
```

**Key Point:** Range vectors CANNOT be graphed directly or displayed as a table. They are used as **input to functions** like `rate()`, `increase()`, `avg_over_time()`, etc.

```promql
# ✅ Valid: range vector inside a function
rate(http_requests_total[5m])

# ❌ Invalid: range vector alone in a graph
http_requests_total[5m]  # Can't graph this directly!
```

---

### Type 3: Scalar

**Definition:** A single numeric floating-point value.

```
Examples:
  42
  3.14
  1 + 2          # evaluates to scalar 3
  time()          # returns current Unix timestamp as scalar
  vector(1)       # converts scalar 1 to an instant vector
```

---

### Type 4: String

**Definition:** A simple string value. Currently unused in PromQL but reserved for future use.

```
Example:
  "hello world"
  
  Note: Strings are rarely used in PromQL expressions.
  They appear in function arguments like label_replace().
```

---

### Quick Reference Table

| Type | Description | Example | Can Graph? |
|------|-------------|---------|------------|
| **Instant Vector** | Set of series, 1 sample each | `up` | ✅ Yes |
| **Range Vector** | Set of series, many samples | `up[5m]` | ❌ No (use in functions) |
| **Scalar** | Single number | `42` | ✅ Yes (flat line) |
| **String** | Text value | `"hello"` | ❌ No |

### 💡 Key Takeaway for Exam
> **Instant Vector** = one value per series (graphable)
> **Range Vector** = many values per series over a time window (NOT graphable, used inside functions)
> **Scalar** = single number
> Range vectors are created by adding `[duration]` to a selector

---

---

## 3.2 📖 SELECTORS (Instant & Range Vectors)

### Instant Vector Selectors

```promql
# Select ALL time series with this metric name
http_requests_total

# Select with specific label value
http_requests_total{method="GET"}

# Select with multiple label conditions
http_requests_total{method="GET", status="200"}

# Select ALL metrics (careful — returns everything!)
{__name__=~".+"}

# Select by job
up{job="web-app"}

# Select by instance
node_cpu_seconds_total{instance="server1:9100"}
```

### Range Vector Selectors

```promql
# Add [duration] to create a range vector
http_requests_total[5m]
http_requests_total{method="GET"}[1h]
node_cpu_seconds_total{mode="idle"}[30s]
up[1d]

# The duration specifies how far back to look from the evaluation time
# [5m] = all samples from (now - 5 minutes) to now
```

### Visual Difference

```
Instant Vector: http_requests_total{method="GET"}
  
  Time →  ──────────────────────────────►
  Value:                              ●  ← Only the LATEST point
  
  
Range Vector: http_requests_total{method="GET"}[5m]
  
  Time →  ──────────────────────────────►
  Value:        ●  ●  ●  ●  ●  ●  ●  ●  ← ALL points in [5m] window
                ◄─────── 5 min ────────►
```

---

---

## 3.3 📖 LABEL MATCHERS

Prometheus supports **four** label matching operators:

### 1. `=` (Equal)

```promql
# Exact match
http_requests_total{method="GET"}
# Matches: method="GET"
# Does NOT match: method="POST", method="get" (case-sensitive!)
```

### 2. `!=` (Not Equal)

```promql
# Exclude specific value
http_requests_total{method!="GET"}
# Matches: method="POST", method="PUT", method="DELETE"
# Does NOT match: method="GET"

# Can also match series that DON'T have the label at all
http_requests_total{status!="500"}
```

### 3. `=~` (Regex Match)

```promql
# Regular expression match (anchored, full match)
http_requests_total{method=~"GET|POST"}
# Matches: method="GET" OR method="POST"

http_requests_total{status=~"2.."}
# Matches: status="200", "201", "204", etc. (any 2xx)

http_requests_total{status=~"5.."}
# Matches: status="500", "502", "503", etc. (any 5xx)

http_requests_total{instance=~"app[1-3]:.*"}
# Matches: instance="app1:8080", "app2:8080", "app3:9090"

http_requests_total{job=~".+"}
# Matches: any series that HAS a job label (non-empty)

⚠️ IMPORTANT: Regex is fully anchored!
  method=~"GET" is the same as method=~"^GET$"
  It matches "GET" exactly, NOT "GETTER" or "MYGET"
  To match partial: method=~".*GET.*"
```

### 4. `!~` (Regex Not Match)

```promql
# Exclude by regex
http_requests_total{method!~"GET|POST"}
# Matches: method="PUT", "DELETE", "PATCH"
# Does NOT match: method="GET", method="POST"

http_requests_total{status!~"2.."}
# Matches: status="400", "404", "500", etc.
# Does NOT match: any 2xx status
```

### Combining Matchers

```promql
# Multiple matchers are ANDed together
http_requests_total{method="GET", status=~"2..", instance!="app3:8080"}
# Matches: GET requests with 2xx status, NOT from app3

# You can use the same label multiple times
http_requests_total{status=~"2..", status!="204"}
# Matches: 2xx status codes EXCEPT 204
```

### 💡 Key Takeaway for Exam
> `=` exact match, `!=` not equal
> `=~` regex match (fully anchored!), `!~` regex not match
> Regex is **case-sensitive** and **fully anchored** (implicit `^...$`)
> Multiple matchers are **ANDed** together
> `=~".+"` means "label exists and is non-empty"

---

---

## 3.4 📖 TIME DURATIONS

### Duration Format

```
Format: [number][unit]

Units:
  ms  → milliseconds
  s   → seconds
  m   → minutes
  h   → hours
  d   → days (24 hours)
  w   → weeks (7 days)
  y   → years (365 days)

Examples:
  30s    → 30 seconds
  5m     → 5 minutes
  1h     → 1 hour
  1h30m  → 1 hour 30 minutes (can combine!)
  7d     → 7 days
  2w     → 2 weeks
  1y     → 1 year
  500ms  → 500 milliseconds
```

### Where Durations Are Used

```promql
# Range vector selector
http_requests_total[5m]

# offset modifier
http_requests_total offset 1h

# Functions
rate(http_requests_total[5m])
increase(http_requests_total[1h])
avg_over_time(node_cpu_seconds_total[30m])

# Subqueries
rate(http_requests_total[5m])[1h:1m]
```

---

---

## 3.5 📖 THE `offset` MODIFIER

**Definition:** The `offset` modifier shifts the evaluation time of a query backward in time.

```promql
# Get the value from 5 minutes ago
http_requests_total offset 5m

# Get the rate from 1 hour ago (compared to 1h+5m ago)
rate(http_requests_total[5m] offset 1h)

# Compare current vs yesterday
# Current:
  sum(rate(http_requests_total[5m]))
# Yesterday:
  sum(rate(http_requests_total[5m] offset 1d))

# Week-over-week comparison
  sum(rate(http_requests_total[5m]))
  /
  sum(rate(http_requests_total[5m] offset 1w))
```

### How It Works Visually

```
Without offset:
  rate(http_requests_total[5m])
  Evaluates: [now-5m ... now]

With offset 1h:
  rate(http_requests_total[5m] offset 1h)
  Evaluates: [now-1h-5m ... now-1h]
  
  Time →  ──────────────────────────────────────────►
          ◄── 5m ──►                              now
          [rate window]
                    
                    ◄── 5m ──►
                    [offset window, 1h ago]
                    ◄──── 1h offset ────►
```

### 💡 Key Takeaway for Exam
> `offset` shifts the query backward in time
> Applied AFTER the range vector: `metric[5m] offset 1h`
> Useful for comparisons: current vs yesterday, week-over-week

---

---

## 3.6 📖 THE `@` MODIFIER

**Definition:** The `@` modifier sets the **evaluation timestamp** to a specific Unix timestamp. Unlike `offset` (relative), `@` is **absolute**.

```promql
# Evaluate at a specific Unix timestamp
http_requests_total @ 1699000000

# Evaluate at the start of the query range (useful in range queries)
http_requests_total @ start()

# Evaluate at the end of the query range
http_requests_total @ end()

# Combine with range vector
rate(http_requests_total[5m] @ 1699000000)
```

### `@` vs `offset`

| Feature | `offset` | `@` |
|---------|----------|-----|
| **Type** | Relative (backward from now) | Absolute (specific timestamp) |
| **Syntax** | `metric offset 5m` | `metric @ 1699000000` |
| **Use case** | "5 minutes ago" | "At exactly 2024-11-03 10:00:00 UTC" |
| **Dynamic?** | Yes (changes with evaluation time) | No (fixed point) |

### 💡 Key Takeaway for Exam
> `@` sets an absolute evaluation timestamp
> `@ start()` and `@ end()` are useful in range queries
> `offset` is relative, `@` is absolute

---

---

## 3.7 📖 ARITHMETIC OPERATORS

### Available Operators

```
+   Addition
-   Subtraction
*   Multiplication
/   Division
%   Modulo
^   Power (exponentiation)
```

### Usage Patterns

#### Pattern 1: Scalar ↔ Scalar
```promql
2 + 3          # Result: 5
10 / 3         # Result: 3.333...
2 ^ 10         # Result: 1024
```

#### Pattern 2: Vector ↔ Scalar
```promql
# Convert bytes to megabytes
node_memory_MemTotal_bytes / 1024 / 1024

# Convert seconds to milliseconds
http_request_duration_seconds * 1000

# Calculate percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

#### Pattern 3: Vector ↔ Vector
```promql
# Both vectors must have matching labels (or use on/ignoring)
# Calculate error percentage
  http_requests_total{status=~"5.."}
/ 
  http_requests_total
* 100

# Calculate bytes per request
  http_bytes_sent_total
/ 
  http_requests_total
```

### Operator Precedence (Highest to Lowest)

```
1. ^  (power)
2. *, /, %  (multiplication, division, modulo)
3. +, -  (addition, subtraction)

Use parentheses to override:
  (1 + 2) * 3  = 9   (not 7)
```

---

---

## 3.8 📖 COMPARISON OPERATORS

### Available Operators

```
==  Equal
!=  Not equal
>   Greater than
<   Less than
>=  Greater than or equal
<=  Less than or equal
```

### Behavior

**By default, comparison operators act as FILTERS on vectors:**

```promql
# Filter: only return series where value > 1000
http_requests_total > 1000

# Result: Only series with value > 1000 are returned
# Series with value ≤ 1000 are DROPPED from the result

# Filter: instances using more than 1GB of memory
process_resident_memory_bytes > 1073741824

# Filter: targets that are down
up == 0
```

### The `bool` Modifier

**To get 0/1 values instead of filtering, use `bool`:**

```promql
# Without bool: returns only series where condition is true (filter)
http_requests_total > 1000
# → Returns series with value > 1000, drops others

# With bool: returns 1 for true, 0 for false (keeps ALL series)
http_requests_total > bool 1000
# → Returns ALL series, but values are 1 (true) or 0 (false)

# Example: Create a "is_high_traffic" indicator
(http_requests_total > bool 10000) * 100
# → 100 if traffic > 10000, 0 otherwise
```

### 💡 Key Takeaway for Exam
> Comparison operators **filter** by default (drop non-matching series)
> Use `bool` modifier to get 0/1 values instead of filtering
> `up == 0` is the standard way to find down targets

---

---

## 3.9 📖 LOGICAL / SET OPERATORS

These operators work on **instant vectors** and perform set operations based on label matching.

### 1. `and` (Intersection)

```promql
# Return series from the LEFT vector that also exist in the RIGHT vector
# "Existence" is determined by matching labels

# Example: Find instances that have BOTH high CPU AND high memory
  (node_cpu_usage > 80)
and
  (node_memory_usage > 80)

# Result: Only instances where BOTH conditions are true
# The values come from the LEFT side

# Example: Find pods that are running AND have errors
  kube_pod_status_phase{phase="Running"}
and
  container_errors_total > 0
```

### 2. `or` (Union)

```promql
# Return all series from the LEFT vector, plus any series from the
# RIGHT vector that don't have matching labels in the LEFT

# Example: Get CPU metrics from both old and new monitoring
  node_cpu_seconds_total{job="new-nodes"}
or
  node_cpu_seconds_total{job="old-nodes"}

# Result: All series from new-nodes, plus any unique series from old-nodes
# LEFT side takes priority for matching labels
```

### 3. `unless` (Complement / Difference)

```promql
# Return series from the LEFT vector that do NOT have matching
# labels in the RIGHT vector

# Example: Get all targets EXCEPT those in the "test" job
  up
unless
  up{job="test"}

# Result: All "up" series except those with job="test"

# Example: Get all pods except those in "kube-system" namespace
  kube_pod_info
unless
  kube_pod_info{namespace="kube-system"}
```

### Visual Summary

```
Vector A: {app="web"}, {app="api"}, {app="db"}
Vector B: {app="api"}, {app="db"}, {app="cache"}

A and B    → {app="api"}, {app="db"}          (intersection)
A or B     → {app="web"}, {app="api"}, {app="db"}, {app="cache"}  (union)
A unless B → {app="web"}                       (A minus B)
```

---

---

## 3.10 📖 VECTOR MATCHING

When performing operations between two vectors, Prometheus needs to know **how to match** series from the left side with series from the right side.

### Default Matching Behavior

```promql
# By default, Prometheus matches on ALL labels EXCEPT __name__
# Both sides must have EXACTLY the same label set

# This works if both sides have the same labels:
  http_requests_total{method="GET", instance="app1:8080"}
/
  http_requests_total{instance="app1:8080"}
  # ❌ FAILS! Left has "method" label, right doesn't
  # → No match → empty result!
```

### `on()` — Match on Specific Labels

```promql
# Only match on the specified labels, ignore all others
  http_requests_total{status="500"}
/ on(instance, job)
  http_requests_total

# Now it matches on instance and job only
# The "status" label difference is ignored for matching
```

### `ignoring()` — Match on All Labels EXCEPT Specified

```promql
# Match on all labels EXCEPT the ones listed
  http_requests_total{status="500"}
/ ignoring(status)
  http_requests_total

# Same result as on(instance, job) above, but different approach
# "Ignore the status label when matching"
```

### `group_left()` — Many-to-One Matching

```promql
# When the LEFT side has MORE series than the RIGHT side
# The right side's extra labels are copied to the result

# Example: Calculate per-instance error rate with instance metadata
  rate(http_requests_total{status=~"5.."}[5m])
/ on(instance) group_left(env, team)
  instance_metadata

# Left side:  rate(...){instance="app1:8080", method="GET"}
#             rate(...){instance="app1:8080", method="POST"}
# Right side: instance_metadata{instance="app1:8080", env="prod", team="backend"}
#
# Result: The "env" and "team" labels from the right side are
#         copied to each matching left-side series
```

### `group_right()` — One-to-Many Matching

```promql
# Opposite of group_left: RIGHT side has more series
  instance_metadata
/ on(instance) group_right(method, status)
  rate(http_requests_total[5m])
```

### 💡 Key Takeaway for Exam
> **Default matching**: all labels except `__name__` must match
> **`on(labels)`**: match ONLY on specified labels
> **`ignoring(labels)`**: match on all EXCEPT specified labels
> **`group_left(labels)`**: many-to-one, copies extra labels from right
> **`group_right(labels)`**: one-to-many, copies extra labels from left

---

---

## 3.11 📖 AGGREGATION OPERATORS

Aggregation operators reduce multiple time series into fewer series by combining their values.

### Complete List of Aggregation Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `sum` | Sum of all values | `sum(http_requests_total)` |
| `avg` | Average of all values | `avg(node_cpu_usage)` |
| `min` | Minimum value | `min(node_memory_available)` |
| `max` | Maximum value | `max(http_request_duration)` |
| `count` | Count of series | `count(up == 1)` |
| `stddev` | Standard deviation | `stddev(request_duration)` |
| `stdvar` | Standard variance | `stdvar(request_duration)` |
| `topk` | Top K largest values | `topk(5, http_requests)` |
| `bottomk` | Bottom K smallest values | `bottomk(3, up)` |
| `count_values` | Count series per unique value | `count_values("version", app_version)` |
| `quantile` | φ-quantile (0 ≤ φ ≤ 1) | `quantile(0.95, request_duration)` |
| `group` | Returns 1 for all series | `group(http_requests_total)` |

### Detailed Examples

#### `sum` — Most Common
```promql
# Total requests per second across all instances
sum(rate(http_requests_total[5m]))

# Total requests per second, grouped by method
sum(rate(http_requests_total[5m])) by (method)

# Total CPU usage across all cores
sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (instance)
```

#### `avg`
```promql
# Average memory usage across all instances
avg(process_resident_memory_bytes)

# Average CPU usage per instance
avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (instance)
```

#### `count`
```promql
# Count total number of targets
count(up)

# Count targets that are UP
count(up == 1)

# Count targets that are DOWN
count(up == 0)

# Count number of instances per job
count(up) by (job)
```

#### `min` and `max`
```promql
# Lowest disk space available across all servers
min(node_filesystem_avail_bytes)

# Highest CPU usage across all instances
max(100 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance) * 100)

# Minimum uptime
min(time() - process_start_time_seconds) by (job)
```

#### `topk` and `bottomk`
```promql
# Top 5 instances by request rate
topk(5, sum(rate(http_requests_total[5m])) by (instance))

# Bottom 3 instances by available memory
bottomk(3, node_memory_MemAvailable_bytes)

# Top 10 slowest endpoints
topk(10, histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, handler)))
```

#### `count_values`
```promql
# Count how many instances are running each version
count_values("version", app_build_info)

# Result:
# {version="1.2.3"} → 5   (5 instances running v1.2.3)
# {version="1.2.4"} → 3   (3 instances running v1.2.4)

# Count how many targets are up vs down
count_values("status", up)
# {status="1"} → 45  (45 targets up)
# {status="0"} → 3   (3 targets down)
```

#### `quantile`
```promql
# 95th percentile of request duration across all instances
quantile(0.95, http_request_duration_seconds)

# Note: This is different from histogram_quantile()!
# quantile() works on gauge values
# histogram_quantile() works on histogram buckets
```

#### `group`
```promql
# Returns 1 for every unique label combination
# Useful for counting unique label sets
group(http_requests_total) by (job)
# Returns: {job="web"} → 1, {job="api"} → 1
```

---

---

## 3.12 📖 `by()` AND `without()` CLAUSES

These clauses control **which labels to keep** when aggregating.

### `by()` — Keep ONLY These Labels

```promql
# Keep only the "method" label, aggregate everything else
sum(rate(http_requests_total[5m])) by (method)

# Result:
# {method="GET"}  → 5000
# {method="POST"} → 1200
# All other labels (instance, status, job) are AGGREGATED AWAY

# Keep multiple labels
sum(rate(http_requests_total[5m])) by (method, status)

# Result:
# {method="GET", status="200"}  → 4800
# {method="GET", status="404"}  → 200
# {method="POST", status="200"} → 1100
# {method="POST", status="500"} → 100
```

### `without()` — Remove These Labels (Keep Everything Else)

```promql
# Remove the "instance" label, keep everything else
sum(rate(http_requests_total[5m])) without (instance)

# Result: All labels except "instance" are preserved
# {job="web", method="GET", status="200"} → 9600
# (aggregated across all instances)

# Remove multiple labels
avg(node_cpu_seconds_total) without (cpu, mode)
```

### `by()` vs `without()` — When to Use Which

```
Use by() when:
  → You know exactly which labels you want to keep
  → You want a small, specific set of labels in the result
  → Example: "Show me total requests by method" → by (method)

Use without() when:
  → You know which labels you want to REMOVE
  → You want to keep most labels but drop a few
  → Example: "Show me CPU usage per instance, ignoring individual cores"
    → without (cpu)

They can produce the same result:
  sum(metric) by (job, method)
  = sum(metric) without (instance, status)
  (if the only labels are job, method, instance, status)
```

### 💡 Key Takeaway for Exam
> **`by(labels)`** = Keep ONLY these labels (whitelist)
> **`without(labels)`** = Remove these labels (blacklist)
> Both are used with aggregation operators
> `by()` is more common in practice

---

---

## 3.13 📖 FUNCTIONS: `rate()`, `irate()`, `increase()`

### `rate(v range-vector)` — Per-Second Average Rate

**Definition:** Calculates the **per-second average rate of increase** of a counter over the specified time window. Handles counter resets automatically.

```promql
# Per-second rate of HTTP requests over last 5 minutes
rate(http_requests_total[5m])

# How it works internally:
# 1. Takes the first and last values in the [5m] window
# 2. Calculates: (last_value - first_value) / time_difference_in_seconds
# 3. If a counter reset is detected (value drops), it adds the pre-reset value
# 4. Returns per-second rate

# Example:
#   t=0:   counter = 1000
#   t=5m:  counter = 1300
#   rate = (1300 - 1000) / 300 seconds = 1.0 per second

# Example with reset:
#   t=0:   counter = 1000
#   t=3m:  counter = 1200
#   t=3m:  counter = 0    ← RESTART!
#   t=5m:  counter = 100
#   rate = (100 + 1200) / 300 = 4.33 per second
#   (It adds the pre-reset value 1200 to the post-reset value 100)
```

**Best Practices:**
```
✅ Use rate() for alerting rules (smooth, stable)
✅ Use rate() for most dashboards
✅ Use a range at least 4× the scrape interval
   → If scrape_interval = 15s, use rate(metric[1m]) minimum
   → Recommended: rate(metric[5m]) for most cases
❌ Don't use rate() on gauges (use directly)
❌ Don't use rate() with a range shorter than 2 scrape intervals
```

---

### `irate(v range-vector)` — Instant Per-Second Rate

**Definition:** Calculates the **per-second instant rate** using only the **last two data points** in the range.

```promql
# Instant rate using last 2 data points
irate(http_requests_total[5m])

# How it differs from rate():
# rate() uses ALL data points in the window → smooth average
# irate() uses only the LAST 2 data points → captures spikes

# Example:
#   t=0:   1000
#   t=1m:  1060  (rate: 1/s)
#   t=2m:  1120  (rate: 1/s)
#   t=3m:  1180  (rate: 1/s)
#   t=4m:  1500  (rate: 5.3/s) ← SPIKE!
#   t=5m:  1560  (rate: 1/s)
#
#   rate()[5m] at t=5m: (1560-1000)/300 = 1.87/s (smoothed)
#   irate()[5m] at t=5m: (1560-1500)/60 = 1.0/s (last 2 points)
#   irate()[5m] at t=4m: (1500-1180)/60 = 5.33/s (captured spike!)
```

**Best Practices:**
```
✅ Use irate() for volatile, fast-changing counters
✅ Use irate() for detailed graphs where you want to see spikes
❌ Don't use irate() for alerting (too volatile, causes flapping)
❌ Don't use irate() with a range shorter than 2 scrape intervals
⚠️  irate() can miss spikes if they happen between the last 2 points
```

---

### `increase(v range-vector)` — Total Increase

**Definition:** Calculates the **total increase** of a counter over the specified time window. It's essentially `rate() × duration_in_seconds`.

```promql
# Total number of new requests in the last hour
increase(http_requests_total[1h])

# Relationship to rate():
# increase(metric[1h]) ≈ rate(metric[1h]) × 3600

# Example:
#   rate(http_requests_total[1h]) = 100 per second
#   increase(http_requests_total[1h]) ≈ 100 × 3600 = 360,000 total

# Use cases:
# → "How many requests did we serve in the last 24 hours?"
  increase(http_requests_total[24h])
# → "How many errors occurred in the last hour?"
  increase(http_requests_total{status=~"5.."}[1h])
```

### Comparison Table

| Function | What it returns | Use case | Smoothness |
|----------|----------------|----------|------------|
| `rate()[5m]` | Per-second average rate | Alerts, dashboards | Smooth |
| `irate()[5m]` | Per-second instant rate (last 2 points) | Volatile graphs | Spiky |
| `increase()[1h]` | Total count increase | Totals over time | Smooth |

### 💡 Key Takeaway for Exam
> **`rate()`** = per-second average, handles resets, use for alerts
> **`irate()`** = per-second instant (last 2 points), volatile, use for graphs
> **`increase()`** = total increase = rate × duration
> All three handle counter resets automatically
> Range must be ≥ 2× scrape interval
> NEVER use these on gauges!

---

---

## 3.14 📖 FUNCTIONS: `histogram_quantile()`

### Syntax

```promql
histogram_quantile(φ, b instant-vector)

φ = quantile (0 to 1, e.g., 0.99 for 99th percentile)
b = instant vector of histogram buckets (must have "le" label)
```

### How It Works

```promql
# Step 1: Get the rate of each bucket
rate(http_request_duration_seconds_bucket[5m])

# Step 2: Aggregate across instances (sum by le)
sum(rate(http_request_duration_seconds_bucket[5m])) by (le)

# Step 3: Calculate the quantile
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

### Common Quantile Queries

```promql
# p50 (median)
histogram_quantile(0.5, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# p90
histogram_quantile(0.9, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# p95
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# p99
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# p99.9
histogram_quantile(0.999, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# p99 per endpoint
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, handler)
)

# p99 per instance
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, instance)
)
```

### Interpolation

```
histogram_quantile() uses LINEAR INTERPOLATION between buckets.

If buckets are:
  le="0.1" → 500
  le="0.5" → 800
  le="1.0" → 950
  le="+Inf" → 1000

And you ask for p95 (950th request out of 1000):
  → The 950th request falls exactly at the le="1.0" bucket boundary
  → Result: 1.0 seconds

If you ask for p97 (970th request):
  → Falls between le="1.0" (950) and le="+Inf" (1000)
  → Interpolated between 1.0 and the next bucket boundary
```

### ⚠️ Common Mistakes

```promql
# ❌ WRONG: Forgetting to sum by (le)
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
# → This calculates p99 per instance separately, not overall!

# ✅ CORRECT: Always aggregate by (le) first
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# ❌ WRONG: Using quantile value > 1
histogram_quantile(99, ...)  # 99 is wrong!
# ✅ CORRECT: Use 0-1 range
histogram_quantile(0.99, ...)  # 0.99 = 99th percentile
```

### 💡 Key Takeaway for Exam
> `histogram_quantile(φ, vector)` where φ is 0 to 1
> **Always** `sum(rate(..._bucket[5m])) by (le)` before passing to function
> Uses linear interpolation between buckets
> Works on Histogram type only (not Summary)
> `le` label is required in the input vector

---

---

## 3.15 📖 FUNCTIONS: `delta()`, `idelta()`, `deriv()`, `predict_linear()`

### `delta(v range-vector)` — Difference

```promql
# Calculates the difference between the first and last values in the range
# Used with GAUGES (not counters!)

# Temperature change over the last hour
delta(node_hwmon_temp_celsius[1h])
# Result: +5.2 (temperature increased by 5.2°C)

# Memory change over 30 minutes
delta(process_resident_memory_bytes[30m])
# Result: -50000000 (memory decreased by 50MB)

# ⚠️ Do NOT use delta() on counters (use increase() instead)
# delta() does NOT handle counter resets!
```

### `idelta(v range-vector)` — Instant Delta

```promql
# Calculates the difference between the last two data points
# Like irate() but for gauges

# Instant change in memory (last 2 scrapes)
idelta(process_resident_memory_bytes[5m])
```

### `deriv(v range-vector)` — Derivative (Rate of Change)

```promql
# Calculates the per-second derivative using simple linear regression
# Used with GAUGES to find the rate of change

# Is disk space shrinking? How fast?
deriv(node_filesystem_avail_bytes[1h])
# Result: -50000 (losing 50KB per second)

# Is memory growing? How fast?
deriv(process_resident_memory_bytes[30m])
# Result: +10000 (gaining 10KB per second)
```

### `predict_linear(v range-vector, t scalar)` — Linear Prediction

```promql
# Predicts the value of a gauge t seconds from now
# Uses linear regression on the range vector

# Will disk be full in 4 hours (14400 seconds)?
predict_linear(node_filesystem_avail_bytes[1h], 4 * 3600) < 0
# Returns true if disk will be full within 4 hours

# Alert: Disk will be full in 24 hours
- alert: DiskWillFillIn24Hours
  expr: predict_linear(node_filesystem_avail_bytes[6h], 24 * 3600) < 0
  for: 30m

# What will memory usage be in 1 hour?
predict_linear(process_resident_memory_bytes[1h], 3600)
```

### 💡 Key Takeaway for Exam
> **`delta()`** = difference first-to-last (for GAUGES, not counters!)
> **`idelta()`** = difference last 2 points (for GAUGES)
> **`deriv()`** = per-second rate of change via linear regression (GAUGES)
> **`predict_linear(range, seconds)`** = predict future value (GAUGES)
> None of these handle counter resets — use `rate()`/`increase()` for counters

---

---

## 3.16 📖 FUNCTIONS: MATH

### Complete List

```promql
abs(v)        → Absolute value
ceil(v)       → Round up to nearest integer
floor(v)      → Round down to nearest integer
round(v, n)   → Round to nearest integer (or to n decimal places)
clamp(v, min, max)     → Clamp values between min and max
clamp_min(v, min)      → Clamp minimum value
clamp_max(v, max)      → Clamp maximum value
ln(v)         → Natural logarithm
log2(v)       → Base-2 logarithm
log10(v)      → Base-10 logarithm
exp(v)        → Exponential (e^v)
sqrt(v)       → Square root
sgn(v)        → Sign: -1 (negative), 0 (zero), 1 (positive)
```

### Examples

```promql
# Absolute value of temperature change
abs(delta(node_hwmon_temp_celsius[1h]))

# Round memory to nearest MB
round(process_resident_memory_bytes / 1024 / 1024)

# Clamp CPU percentage between 0 and 100
clamp(cpu_usage_percent, 0, 100)

# Ensure value is at least 0 (no negative values)
clamp_min(disk_change_rate, 0)

# Ensure value is at most 100
clamp_max(cpu_usage_percent, 100)
```

---

---

## 3.17 📖 FUNCTIONS: TIME

### Complete List

```promql
time()              → Current Unix timestamp (scalar)
timestamp(v)        → Timestamp of each sample in the vector

# Date/Time functions (operate on Unix timestamps)
day_of_month(v)     → Day of month (1-31)
day_of_week(v)      → Day of week (0=Sunday, 6=Saturday)
day_of_year(v)      → Day of year (1-366)
days_in_month(v)    → Number of days in the month (28-31)
hour(v)             → Hour of day (0-23)
minute(v)           → Minute of hour (0-59)
month(v)            → Month (1-12)
year(v)             → Year (e.g., 2024)
```

### Examples

```promql
# Current time
time()
# Result: 1699000000 (Unix timestamp)

# Uptime of a process (in seconds)
time() - process_start_time_seconds

# Uptime in hours
(time() - process_start_time_seconds) / 3600

# Uptime in days
(time() - process_start_time_seconds) / 86400

# Alert during business hours only (9 AM - 5 PM)
hour() >= 9 and hour() < 17

# Get the timestamp of the last scrape
timestamp(up)

# How many days until SSL cert expires?
(probe_ssl_earliest_cert_expiry - time()) / 86400
```

---

---

## 3.18 📖 FUNCTIONS: LABEL MANIPULATION

### `label_replace(v, dst, replacement, src, regex)`

**Definition:** Replaces or creates a label by applying a regex to a source label.

```promql
# Syntax:
# label_replace(vector, destination_label, replacement_string, source_label, regex)
# $1, $2, etc. in replacement refer to capture groups in regex

# Example 1: Extract hostname from instance label
# instance="app1.example.com:8080" → hostname="app1"
label_replace(
  up, 
  "hostname",       # destination label
  "$1",             # replacement (first capture group)
  "instance",       # source label
  "([^:]+):.*"      # regex: capture everything before the colon
)

# Example 2: Add a "region" label based on instance name
# instance="us-east-1-app1:8080" → region="us-east-1"
label_replace(
  up,
  "region",
  "$1",
  "instance",
  "([a-z]+-[a-z]+-[0-9]+)-.*"
)

# Example 3: Create a "short_job" label
# job="kubernetes-pods-monitoring" → short_job="k8s-monitoring"
label_replace(
  up,
  "short_job",
  "k8s-$1",
  "job",
  "kubernetes-pods-(.*)"
)
```

### `label_join(v, dst, separator, src1, src2, ...)`

**Definition:** Joins multiple source labels into a new destination label using a separator.

```promql
# Syntax:
# label_join(vector, destination_label, separator, source_label_1, source_label_2, ...)

# Example 1: Combine method and status into one label
# method="GET", status="200" → method_status="GET-200"
label_join(
  http_requests_total,
  "method_status",    # destination
  "-",                # separator
  "method",           # source 1
  "status"            # source 2
)

# Example 2: Create a full instance name
# namespace="prod", pod="web-abc123" → full_name="prod/web-abc123"
label_join(
  kube_pod_info,
  "full_name",
  "/",
  "namespace",
  "pod"
)
```

### 💡 Key Takeaway for Exam
> **`label_replace()`** = regex-based label transformation (like sed)
> **`label_join()`** = concatenate labels with separator
> Both create/modify labels on the result vector
> `label_replace` uses `$1`, `$2` for capture groups

---

---

## 3.19 📖 FUNCTIONS: `absent()`, `absent_over_time()`

### `absent(v instant-vector)`

**Definition:** Returns an empty vector if the input has any elements, or a 1-element vector with value 1 if the input is empty. Used for **dead man's switch** alerting.

```promql
# Alert if no data is being received from a job
absent(http_requests_total{job="payment-service"})

# How it works:
# → If http_requests_total{job="payment-service"} EXISTS → returns nothing (empty)
# → If http_requests_total{job="payment-service"} DOES NOT EXIST → returns 1

# Common alert pattern:
- alert: PaymentServiceMissing
  expr: absent(http_requests_total{job="payment-service"}) == 1
  for: 5m
  annotations:
    summary: "No metrics from payment-service!"
```

### `absent_over_time(v range-vector)`

**Definition:** Same as `absent()` but over a time range. Returns 1 if the series had NO data points in the given range.

```promql
# Alert if no data in the last 5 minutes
absent_over_time(http_requests_total{job="payment-service"}[5m])

# More precise than absent() because it checks the actual time window
# absent() only checks the instant evaluation time
```

### 💡 Key Takeaway for Exam
> **`absent()`** = returns 1 if series doesn't exist (dead man's switch)
> **`absent_over_time()`** = returns 1 if no data in the time range
> Used for alerting when a target/service stops producing metrics entirely

---

---

## 3.20 📖 FUNCTIONS: `changes()`, `resets()`

### `changes(v range-vector)`

**Definition:** Counts the number of times a **gauge** value changed within the range.

```promql
# How many times did the config reload?
changes(process_start_time_seconds[1h])
# Result: 2 (process restarted twice in the last hour)

# How many times did the status change?
changes(up[1h])
# Result: 3 (target went up/down 3 times)
```

### `resets(v range-vector)`

**Definition:** Counts the number of **counter resets** within the range.

```promql
# How many times did the counter reset (process restarts)?
resets(http_requests_total[24h])
# Result: 2 (application restarted twice today)
```

---

---

## 3.21 📖 FUNCTIONS: `sort()`, `sort_desc()`

```promql
# Sort ascending (smallest first)
sort(node_memory_MemAvailable_bytes)

# Sort descending (largest first)
sort_desc(sum(rate(http_requests_total[5m])) by (instance))

# Get top 5 by sorting (alternative to topk)
sort_desc(sum(rate(http_requests_total[5m])) by (instance))
# Then limit in Grafana to show top 5
```

---

---

## 3.22 📖 FUNCTIONS: `vector()`, `scalar()`

### `vector(s scalar)`

```promql
# Converts a scalar to an instant vector with no labels
vector(1)
# Result: {} → 1

# Useful for constant lines in Grafana
vector(100)  # Draws a horizontal line at 100

# Useful in recording rules
vector(0)    # Default value when no data
```

### `scalar(v instant-vector)`

```promql
# Converts a single-element instant vector to a scalar
scalar(up{job="prometheus"})
# Result: 1 (if prometheus is up)

# ⚠️ If the vector has more than one element, returns NaN
scalar(up)  # NaN if multiple targets
```

---

---

## 3.23 📖 FUNCTIONS: `*_over_time()` AGGREGATIONS

These functions aggregate a **range vector** into an **instant vector** by computing a statistic over the time window.

### Complete List

```promql
avg_over_time(v)       → Average value over the range
min_over_time(v)       → Minimum value over the range
max_over_time(v)       → Maximum value over the range
sum_over_time(v)       → Sum of all values over the range
count_over_time(v)     → Count of values over the range
stddev_over_time(v)    → Standard deviation over the range
stdvar_over_time(v)    → Standard variance over the range
quantile_over_time(φ, v) → φ-quantile over the range
last_over_time(v)      → Last value in the range
present_over_time(v)   → 1 if any value exists in the range
```

### Examples

```promql
# Average CPU usage over the last hour
avg_over_time(node_cpu_usage_percent[1h])

# Peak memory usage in the last 24 hours
max_over_time(process_resident_memory_bytes[24h])

# Minimum available disk in the last week
min_over_time(node_filesystem_avail_bytes[7d])

# Total bytes sent in the last hour (for gauges that represent rates)
sum_over_time(network_bytes_per_second[1h]) * 15  # if scrape interval is 15s

# 95th percentile of CPU usage over the last day
quantile_over_time(0.95, node_cpu_usage_percent[1d])

# How many samples were recorded in the last hour?
count_over_time(up[1h])

# Was the target up at any point in the last 5 minutes?
present_over_time(up[5m])
```

### ⚠️ Important Note

```
*_over_time() functions work on the RAW sample values in the range.
They do NOT account for the time between samples.

For time-weighted averages, you need a more complex query:
  # Time-weighted average (more accurate for irregular scrapes)
  sum_over_time(metric[1h]) / count_over_time(metric[1h])
  # This is equivalent to avg_over_time() for regular scrapes
```

### 💡 Key Takeaway for Exam
> `*_over_time()` functions take a **range vector** and return an **instant vector**
> They compute statistics over the raw sample values in the window
> Common ones: `avg_over_time`, `max_over_time`, `min_over_time`, `sum_over_time`
> `count_over_time()` counts the number of samples (useful for scrape health)

---

---

## 3.24 📖 SUBQUERIES

**Definition:** Subqueries allow you to run a range query over the results of an instant query. They are like "queries within queries."

### Syntax

```promql
<instant_query>[<range>:<resolution>]

range      = how far back to look
resolution = step size (how often to evaluate the inner query)
             If omitted, uses the global evaluation_interval
```

### Examples

```promql
# Get the max of the 5-minute rate over the last 30 minutes
# (evaluates rate every 1 minute for 30 data points, then takes max)
max_over_time(
  rate(http_requests_total[5m])[30m:1m]
)

# Breakdown:
# 1. Inner: rate(http_requests_total[5m]) → instant vector
# 2. [30m:1m] → evaluate the inner query every 1m for 30m → range vector
# 3. max_over_time() → take the maximum of those 30 data points

# Get the minimum rate over the last hour (evaluated every 5 minutes)
min_over_time(
  rate(http_requests_total[5m])[1h:5m]
)

# Detect if rate has been consistently high
avg_over_time(
  rate(http_requests_total[5m])[1h:1m]
) > 1000
```

### 💡 Key Takeaway for Exam
> Subquery syntax: `query[range:resolution]`
> Allows applying range functions to instant query results
> Example: `max_over_time(rate(metric[5m])[1h:1m])`
> Resolution is optional (defaults to evaluation_interval)

---

---

## 3.25 📖 RECORDING RULES

### What Are Recording Rules?

Recording rules **pre-compute** expensive PromQL expressions and save the result as a new time series. This improves query performance for dashboards and alerts.

### Syntax

```yaml
# recording_rules.yml
groups:
  - name: http_recording_rules
    interval: 15s  # Optional: override evaluation interval
    
    rules:
      # Rule 1: Pre-compute request rate per job
      - record: job:http_requests_total:rate5m
        expr: sum(rate(http_requests_total[5m])) by (job)
        
      # Rule 2: Pre-compute error rate per job
      - record: job:http_errors_total:rate5m
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)
        
      # Rule 3: Pre-compute error ratio
      - record: job:http_error_ratio:rate5m
        expr: |
          job:http_errors_total:rate5m
          /
          job:http_requests_total:rate5m
          
      # Rule 4: Pre-compute p99 latency per job
      - record: job:http_request_duration_seconds:p99
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (job, le)
          )
```

### Naming Convention (Exam Critical!)

```
Format: level:metric:operations

level     = aggregation level (job, instance, cluster, etc.)
metric    = the metric name being aggregated
operations = list of operations applied (rate5m, sum, avg, etc.)

Examples:
  ✅ job:http_requests_total:rate5m
  ✅ instance:node_cpu_utilisation:ratio_rate5m
  ✅ cluster:namespace:pod_memory_working_set_bytes:sum
  ✅ job:http_request_duration_seconds:p99
  
  ❌ http_requests_rate  (missing level and operations)
  ❌ my_custom_metric    (doesn't follow convention)
```

### Configuration in prometheus.yml

```yaml
rule_files:
  - "recording_rules.yml"
  - "alerting_rules.yml"
  - "/etc/prometheus/rules/*.yml"
```

### 💡 Key Takeaway for Exam
> Recording rules pre-compute expensive queries → new time series
> Naming convention: **`level:metric:operations`**
> Configured in `rule_files` in prometheus.yml
> Evaluated at `evaluation_interval` (default 1m)
> Colons in metric names are reserved for recording rules

---

---

## 3.26 📖 COMMON PromQL PATTERNS & RECIPES

### Pattern 1: CPU Usage Percentage
```promql
# Per-instance CPU usage %
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

### Pattern 2: Memory Usage Percentage
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

### Pattern 3: Disk Usage Percentage
```promql
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100
```

### Pattern 4: HTTP Error Rate Percentage
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) 
* 100
```

### Pattern 5: Request Latency (p99)
```promql
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

### Pattern 6: Target Uptime
```promql
# Uptime percentage over last 24 hours
avg_over_time(up[24h]) * 100
```

### Pattern 7: Process Uptime
```promql
time() - process_start_time_seconds
```

### Pattern 8: Rate of Change (Gauge)
```promql
deriv(node_filesystem_avail_bytes[1h])
```

### Pattern 9: Predict Disk Full
```promql
predict_linear(node_filesystem_avail_bytes[6h], 24 * 3600) < 0
```

### Pattern 10: Dead Man's Switch
```promql
absent(up{job="critical-service"})
```

---

---

## 3.27 📝 EXAM-STYLE QUESTIONS (35 Questions)

### Question 1
**What is the difference between an instant vector and a range vector in PromQL?**

A) Instant vectors contain multiple samples per series; range vectors contain one sample per series
B) Instant vectors contain one sample per series at a single point in time; range vectors contain multiple samples over a time window
C) They are the same thing
D) Instant vectors are used for counters; range vectors are used for gauges

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

An instant vector contains exactly one sample per time series at the evaluation time (e.g., `up`). A range vector contains multiple samples per time series over a specified time window (e.g., `up[5m]`). Range vectors are created by adding `[duration]` to a selector and are typically used as input to functions like `rate()`.
</details>

---

### Question 2
**Which of the following PromQL expressions returns a range vector?**

A) `http_requests_total{method="GET"}`
B) `rate(http_requests_total[5m])`
C) `http_requests_total{method="GET"}[5m]`
D) `sum(http_requests_total)`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

Adding `[5m]` to a selector creates a range vector. Option A is an instant vector. Option B is the RESULT of a function applied to a range vector, which returns an instant vector. Option D is an aggregation that returns an instant vector. Only C is a raw range vector.
</details>

---

### Question 3
**What does the label matcher `status=~"5.."` match?**

A) Only status="5"
B) Any status code starting with 5 (500, 502, 503, etc.)
C) Any status code containing 5 anywhere
D) Status codes 5, 50, and 500 only

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `=~` operator performs a regex match. In Prometheus, regex is **fully anchored** (implicit `^...$`). The pattern `5..` matches any 3-character string starting with "5", where `.` matches any single character. So it matches "500", "502", "503", "599", etc. It does NOT match "5" (too short) or "1500" (doesn't start with 5).
</details>

---

### Question 4
**What is the result of `http_requests_total > 1000`?**

A) Returns 1 for series with value > 1000 and 0 for others
B) Returns only the series where the value is greater than 1000, dropping all others
C) Returns an error because comparison requires the `bool` modifier
D) Returns all series with their original values

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

By default, comparison operators in PromQL act as **filters**. `http_requests_total > 1000` returns only the time series where the value exceeds 1000 and drops all others. To get 1/0 values instead of filtering, you would use the `bool` modifier: `http_requests_total > bool 1000`.
</details>

---

### Question 5
**Which PromQL function should you use to calculate the per-second rate of a counter, and why?**

A) `delta()` because it calculates the difference between first and last values
B) `deriv()` because it calculates the derivative
C) `rate()` because it calculates the per-second average rate and handles counter resets
D) `increase()` because it calculates the total increase

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`rate()` is the correct function for calculating the per-second rate of a counter. It automatically handles counter resets (when a process restarts and the counter goes to 0). `delta()` does NOT handle counter resets and should only be used with gauges. `deriv()` calculates the rate of change for gauges using linear regression. `increase()` returns the total increase, not the per-second rate.
</details>

---

### Question 6
**What is the difference between `rate()` and `irate()`?**

A) `rate()` is for counters and `irate()` is for gauges
B) `rate()` calculates the average rate over the entire range; `irate()` calculates the instant rate using only the last two data points
C) `irate()` is faster to compute than `rate()`
D) There is no difference; they are aliases

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`rate()` calculates the per-second average rate using all data points in the range window, producing a smooth result ideal for alerting. `irate()` uses only the last two data points in the range, capturing the most recent instant rate, which is more volatile but better for detailed graphs showing spikes. Both work on counters and handle resets.
</details>

---

### Question 7
**Which PromQL expression correctly calculates the 99th percentile latency from a histogram?**

A) `histogram_quantile(99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
B) `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
C) `quantile(0.99, http_request_duration_seconds)`
D) `percentile(99, rate(http_request_duration_seconds[5m]))`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`histogram_quantile()` takes a quantile value between 0 and 1 (not 0-100), so 0.99 represents the 99th percentile. The input must be a vector of histogram buckets aggregated `by (le)`. Option A uses 99 instead of 0.99 (wrong). Option C uses `quantile()` which works on gauge values, not histogram buckets. Option D uses a non-existent `percentile()` function.
</details>

---

### Question 8
**What does `sum(rate(http_requests_total[5m])) by (method)` return?**

A) The total number of requests across all methods
B) The per-second rate of requests grouped by HTTP method
C) The sum of all counter values grouped by method
D) The average rate per method

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

This query first calculates the per-second rate of requests for each time series using `rate()`, then sums those rates grouping by the `method` label. The result is the total per-second request rate for each HTTP method (GET, POST, etc.), aggregated across all instances and statuses.
</details>

---

### Question 9
**What is the purpose of the `offset` modifier in PromQL?**

A) To add a constant value to all results
B) To shift the evaluation time of a query backward by a specified duration
C) To filter out data points outside a time range
D) To set the scrape interval for a specific query

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `offset` modifier shifts the evaluation time backward. For example, `http_requests_total offset 5m` returns the value from 5 minutes ago instead of the current value. It's commonly used for comparisons like week-over-week: `rate(metric[5m]) / rate(metric[5m] offset 1w)`.
</details>

---

### Question 10
**Which aggregation operator would you use to find the top 5 instances by request rate?**

A) `sum()`
B) `max()`
C) `topk()`
D) `quantile()`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`topk(k, v)` returns the k largest elements by value. `topk(5, sum(rate(http_requests_total[5m])) by (instance))` returns the 5 instances with the highest request rates. `sum()` aggregates all values. `max()` returns only the single maximum. `quantile()` calculates statistical quantiles.
</details>

---

### Question 11
**What does `count_values("version", app_build_info)` return?**

A) The total number of versions deployed
B) The count of time series for each unique value of the "version" label, creating a new label called "version"
C) The average version number
D) The latest version deployed

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`count_values("label_name", vector)` counts the number of time series for each unique value in the input vector and stores the count in a new label with the given name. For example, if 5 instances run v1.2 and 3 run v1.3, the result would be `{version="v1.2"} → 5` and `{version="v1.3"} → 3`.
</details>

---

### Question 12
**Which of the following is the correct PromQL to calculate average request duration from a histogram?**

A) `avg(http_request_duration_seconds)`
B) `histogram_quantile(0.5, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
C) `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])`
D) `avg_over_time(http_request_duration_seconds[5m])`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

To calculate the **average** request duration from a histogram, divide the rate of the `_sum` by the rate of the `_count`. Both are counters, so `rate()` must be used. Option B calculates the **median** (p50), not the average. Option A is invalid for histogram metrics. Option D works on raw gauge values, not histogram components.
</details>

---

### Question 13
**What does the `absent()` function do?**

A) Returns the value of a metric if it exists
B) Returns 1 if the input vector is empty (no matching series), returns empty if series exist
C)

---

# 📘 PCA EXAM — DOMAIN 3: PromQL (Continued)
## *Questions 13–35 + Summary Cheat Sheet*

---

### Question 13 (Complete Answer)
**What does the `absent()` function do?**

A) Returns the value of a metric if it exists
B) Returns 1 if the input vector is empty (no matching series), returns empty if series exist
C) Removes stale data points from a time series
D) Returns the last known value of a missing metric

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`absent(v)` returns an empty vector if the input vector has any elements (i.e., the metric exists). If the input is empty (no matching series), it returns a 1-element vector with value 1. This is primarily used for **dead man's switch** alerting — alerting when a service stops producing metrics entirely. Example: `absent(up{job="critical-service"}) == 1` fires when no data is received from the critical service.
</details>

---

### Question 14
**What is the correct syntax for a PromQL subquery?**

A) `rate(http_requests_total[5m])[1h]`
B) `rate(http_requests_total[5m])[1h:1m]`
C) `subquery(rate(http_requests_total[5m]), 1h, 1m)`
D) `[1h:1m]rate(http_requests_total[5m])`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The subquery syntax is `<instant_query>[<range>:<resolution>]`. So `rate(http_requests_total[5m])[1h:1m]` evaluates `rate(http_requests_total[5m])` every 1 minute over the last 1 hour, producing a range vector of 60 data points. This range vector can then be passed to functions like `max_over_time()`. The resolution part (`:1m`) is optional but recommended for clarity.
</details>

---

### Question 15
**What is the recommended naming convention for recording rules?**

A) `metric_name_aggregation`
B) `level:metric:operations`
C) `aggregation.metric.level`
D) `recording_rule_<name>`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The recommended naming convention for recording rules is `level:metric:operations`. For example: `job:http_requests_total:rate5m`. The `level` indicates the aggregation level (job, instance, cluster), `metric` is the base metric name, and `operations` describes the transformations applied. Colons in metric names are reserved specifically for recording rules in Prometheus.
</details>

---

### Question 16
**Which PromQL expression correctly calculates the percentage of HTTP 5xx errors?**

A) `http_requests_total{status=~"5.."} / http_requests_total * 100`
B) `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100`
C) `count(http_requests_total{status=~"5.."}) / count(http_requests_total) * 100`
D) `rate(http_requests_total{status=~"5.."}[5m]) * 100`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

To calculate the error percentage, you need to:
1. Use `rate()` because `http_requests_total` is a counter
2. Use `sum()` to aggregate across all instances/labels
3. Divide 5xx rate by total rate
4. Multiply by 100 for percentage

Option A uses raw counter values (wrong for counters). Option C uses `count()` which counts time series, not request volumes. Option D only gives the absolute error rate, not a percentage.
</details>

---

### Question 17
**What does the `bool` modifier do in a comparison expression like `up > bool 0`?**

A) It converts the result to a boolean string ("true"/"false")
B) It returns 1 for true and 0 for false instead of filtering out non-matching series
C) It ensures the comparison is case-insensitive
D) It makes the comparison evaluate on all labels

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

By default, comparison operators in PromQL act as **filters** — they drop series that don't match the condition. The `bool` modifier changes this behavior: instead of filtering, it returns **1** for series where the condition is true and **0** for series where it's false, keeping ALL series in the result. This is useful when you want to use the comparison result in further arithmetic.
</details>

---

### Question 18
**Which function would you use to predict when a disk will run out of space?**

A) `rate()`
B) `delta()`
C) `predict_linear()`
D) `histogram_quantile()`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`predict_linear(v range-vector, t scalar)` predicts the value of a gauge `t` seconds from now using simple linear regression. To predict disk full: `predict_linear(node_filesystem_avail_bytes[6h], 24*3600) < 0` returns true if the disk will be full within 24 hours based on the trend over the last 6 hours. `rate()` is for counters, `delta()` gives past differences, and `histogram_quantile()` is for percentiles.
</details>

---

### Question 19
**What does `deriv()` do and which metric type should it be used with?**

A) Calculates the per-second derivative using linear regression; used with gauges
B) Calculates the per-second rate of increase; used with counters
C) Calculates the difference between first and last values; used with counters
D) Calculates the standard deviation; used with histograms

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

`deriv(v range-vector)` calculates the per-second derivative of a gauge using simple linear regression over the specified time window. It tells you the rate at which a gauge is changing. For example, `deriv(node_filesystem_avail_bytes[1h])` tells you how many bytes per second the disk space is changing. It should NOT be used with counters (use `rate()` instead) because it doesn't handle counter resets.
</details>

---

### Question 20
**What is the result of `label_replace(up, "host", "$1", "instance", "([^:]+):.*")`?**

A) It removes the "instance" label and replaces it with "host"
B) It creates a new "host" label by extracting the hostname part (before the colon) from the "instance" label
C) It renames the "instance" label to "host"
D) It joins the "instance" label with the "host" label

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`label_replace(vector, dst_label, replacement, src_label, regex)` creates/modifies the destination label by applying the regex to the source label. Here:
- Source: `instance` (e.g., "app1.example.com:8080")
- Regex: `([^:]+):.*` captures everything before the colon → "app1.example.com"
- Replacement: `$1` uses the first capture group
- Destination: `host` label is created with value "app1.example.com"

The original `instance` label is preserved.
</details>

---

### Question 21
**Which of the following correctly uses the `and` operator?**

A) `http_requests_total and 100`
B) `up{job="web"} and up{job="api"}`
C) `(node_cpu_usage > 80) and (node_memory_usage > 80)`
D) `rate(http_requests_total[5m]) and [1h]`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `and` operator performs a set intersection between two instant vectors. It returns series from the LEFT vector that have matching label sets in the RIGHT vector. Option C returns instances where BOTH CPU usage > 80 AND memory usage > 80. Option A mixes vector and scalar (invalid for `and`). Option B would return empty because no series can have both `job="web"` and `job="api"` simultaneously. Option D mixes vector and range vector (invalid).
</details>

---

### Question 22
**What does `increase(http_requests_total[1h])` return?**

A) The per-second rate of requests over the last hour
B) The total number of additional requests in the last hour (total increase)
C) The percentage increase compared to the previous hour
D) The maximum number of requests in any 1-minute window within the last hour

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`increase()` returns the **total increase** in a counter over the specified time window. It's approximately equal to `rate(metric[1h]) × 3600`. For example, if the counter went from 10000 to 13600 in the last hour, `increase()` returns approximately 3600. It handles counter resets automatically, just like `rate()`.
</details>

---

### Question 23
**What is the difference between `on()` and `ignoring()` in vector matching?**

A) `on()` matches on all labels; `ignoring()` matches on no labels
B) `on()` specifies which labels to match on (whitelist); `ignoring()` specifies which labels to exclude from matching (blacklist)
C) They are the same thing with different syntax
D) `on()` is for instant vectors; `ignoring()` is for range vectors

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`on(labels)` restricts matching to ONLY the specified labels (whitelist approach). `ignoring(labels)` matches on ALL labels EXCEPT the specified ones (blacklist approach). For example, `metric_a / on(instance) metric_b` matches only on the `instance` label, ignoring all other label differences. `metric_a / ignoring(status) metric_b` matches on all labels except `status`.
</details>

---

### Question 24
**Which PromQL expression calculates the uptime percentage of a target over the last 24 hours?**

A) `sum(up[24h]) / count(up[24h]) * 100`
B) `avg_over_time(up[24h]) * 100`
C) `rate(up[24h]) * 100`
D) `increase(up[24h]) / 86400 * 100`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Since `up` is a gauge (1 = up, 0 = down), `avg_over_time(up[24h])` calculates the average value over 24 hours. If the target was up 99% of the time, the average would be 0.99. Multiplying by 100 gives the uptime percentage (99%). Option A uses invalid syntax (can't use `sum()` on range vectors directly). Option C uses `rate()` which is for counters. Option D uses `increase()` which is also for counters.
</details>

---

### Question 25
**What does `changes(process_start_time_seconds[1h])` return?**

A) The difference in start time between now and 1 hour ago
B) The number of times the process start time changed in the last hour (i.e., number of restarts)
C) The rate of process restarts per second
D) The total uptime of the process

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`changes(v range-vector)` counts the number of times the value of a gauge changed within the specified time range. Since `process_start_time_seconds` changes only when a process restarts (gets a new start time), `changes(process_start_time_seconds[1h])` effectively counts the number of process restarts in the last hour. A result of 0 means no restarts; 2 means the process restarted twice.
</details>

---

### Question 26
**Which of the following expressions uses the `@` modifier correctly?**

A) `http_requests_total @ 5m`
B) `http_requests_total @ 1699000000`
C) `http_requests_total @ "2024-01-01"`
D) `http_requests_total @ now()`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

The `@` modifier takes a **Unix timestamp** (integer) as its argument, not a duration or date string. `http_requests_total @ 1699000000` evaluates the query at the specific Unix timestamp 1699000000. You can also use `@ start()` and `@ end()` in range queries. Option A uses a duration (that's `offset`, not `@`). Options C and D use invalid syntax.
</details>

---

### Question 27
**What does `resets(http_requests_total[24h])` return?**

A) The number of times the counter was manually reset by an administrator
B) The number of counter resets (value drops) in the last 24 hours, typically indicating process restarts
C) The total value of the counter after all resets
D) The time since the last counter reset

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`resets(v range-vector)` counts the number of times a counter decreased (reset) within the specified range. Counter resets typically happen when the process restarts and the in-memory counter goes back to zero. If `resets(http_requests_total[24h])` returns 3, it means the application restarted 3 times in the last 24 hours.
</details>

---

### Question 28
**Which PromQL expression correctly calculates memory usage as a percentage?**

A) `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes`
B) `(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100`
C) `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes`
D) `rate(node_memory_MemTotal_bytes[5m]) * 100`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Memory usage percentage = (Used / Total) × 100 = (1 - Available/Total) × 100. Option A gives the absolute used memory in bytes, not a percentage. Option C gives the available ratio (inverse of usage). Option D uses `rate()` on a gauge, which is incorrect — memory metrics are gauges and should be used directly.
</details>

---

### Question 29
**What is the minimum recommended range for `rate()` relative to the scrape interval?**

A) Equal to the scrape interval
B) At least 2× the scrape interval
C) At least 4× the scrape interval (recommended)
D) At least 10× the scrape interval

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The recommended range for `rate()` is at least **4× the scrape interval** to ensure enough data points for a meaningful average and to handle missed scrapes gracefully. For example, if `scrape_interval = 15s`, use `rate(metric[1m])` at minimum, but `rate(metric[5m])` is the common best practice. Using a range shorter than 2× the scrape interval may result in no data points or unreliable results. The absolute minimum is 2× (B), but 4× is the recommendation.
</details>

---

### Question 30
**What does `group_left()` do in a vector matching operation?**

A) Groups all left-side series into a single series
B) Enables many-to-one matching, copying specified labels from the right (one) side to the left (many) side
C) Removes all labels from the left side
D) Sorts the left-side results alphabetically

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`group_left(labels)` enables **many-to-one** vector matching. When the left side has multiple series matching a single series on the right side, `group_left` allows this and copies the specified extra labels from the right side to each matching left-side result. Example: `rate(errors[5m]) / on(instance) group_left(env) instance_info` copies the `env` label from `instance_info` to each error rate series.
</details>

---

### Question 31
**Which of the following `*_over_time()` functions would you use to find the peak CPU usage in the last 24 hours?**

A) `avg_over_time(cpu_usage[24h])`
B) `sum_over_time(cpu_usage[24h])`
C) `max_over_time(cpu_usage[24h])`
D) `count_over_time(cpu_usage[24h])`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`max_over_time(v range-vector)` returns the maximum value observed in the specified time range. To find peak CPU usage over 24 hours: `max_over_time(cpu_usage[24h])`. `avg_over_time` gives the average (not peak). `sum_over_time` sums all values (meaningless for CPU %). `count_over_time` counts the number of samples.
</details>

---

### Question 32
**What is the result of `scalar(up{job="prometheus"})` if Prometheus is up?**

A) An instant vector with value 1
B) The scalar value 1
C) The string "up"
D) A range vector with value 1

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`scalar(v instant-vector)` converts a **single-element** instant vector to a scalar (plain number). If `up{job="prometheus"}` returns exactly one series with value 1, then `scalar()` converts it to the scalar value `1`. If the input vector has more than one element, `scalar()` returns `NaN`. Note the difference: `up{job="prometheus"}` is an instant vector; `scalar(up{job="prometheus"})` is a scalar.
</details>

---

### Question 33
**Which PromQL expression correctly finds all targets that have been down for more than 5 minutes?**

A) `up == 0 for 5m`
B) `up == 0`  (with `for: 5m` in the alerting rule)
C) `absent(up) > 5m`
D) `down > 5m`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

In PromQL itself, you simply query `up == 0` to find targets that are currently down. The `for: 5m` duration is specified in the **alerting rule** configuration, not in the PromQL expression. The alerting rule engine tracks how long the condition has been true and only transitions the alert from "pending" to "firing" after the `for` duration. Option A uses invalid PromQL syntax. Options C and D use non-existent metrics/syntax.

```yaml
# Correct alerting rule:
- alert: InstanceDown
  expr: up == 0
  for: 5m
```
</details>

---

### Question 34
**What does the `unless` operator do?**

A) Returns series from the left vector that do NOT have matching labels in the right vector
B) Returns series from both vectors that don't match
C) Filters out series with values below a threshold
D) Returns the complement of the `and` operator

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

The `unless` operator performs a **set complement** (difference). It returns all series from the LEFT vector that do NOT have a matching label set in the RIGHT vector. Example: `up unless up{job="test"}` returns all `up` series EXCEPT those with `job="test"`. It's useful for excluding specific targets, jobs, or environments from a query result.
</details>

---

### Question 35
**Which of the following PromQL queries would you use to calculate the week-over-week growth rate of HTTP requests?**

A) `rate(http_requests_total[5m]) / rate(http_requests_total[5m] offset 1w) - 1`
B) `increase(http_requests_total[1w]) / increase(http_requests_total[1w] offset 1w)`
C) `rate(http_requests_total[1w]) - rate(http_requests_total[1w] offset 1w)`
D) `delta(http_requests_total[1w]) / http_requests_total offset 1w`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

To calculate week-over-week growth:
1. `rate(http_requests_total[5m])` = current request rate
2. `rate(http_requests_total[5m] offset 1w)` = request rate exactly 1 week ago
3. Dividing current by past and subtracting 1 gives the growth ratio
4. Result: 0.15 means 15% growth, -0.05 means 5% decline

Option B uses `increase()` over a full week which is valid but less responsive. Option C gives absolute difference, not a ratio. Option D uses `delta()` on a counter (wrong — `delta()` doesn't handle resets).
</details>

---

---

## ✅ DOMAIN 3 REVISION SUMMARY CHEAT SHEET

```
┌──────────────────────────────────────────────────────────────────────┐
│                   DOMAIN 3: PromQL CHEAT SHEET                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DATA TYPES:                                                         │
│  Instant Vector → 1 sample per series (graphable)                    │
│  Range Vector   → Many samples per series [5m] (for functions)      │
│  Scalar         → Single number                                      │
│  String         → Text (rarely used)                                 │
│                                                                      │
│  SELECTORS:                                                          │
│  metric_name{label="value"}        → Instant vector                  │
│  metric_name{label="value"}[5m]    → Range vector                    │
│                                                                      │
│  MATCHERS:                                                           │
│  =   Exact match         !=  Not equal                               │
│  =~  Regex match (anchored!)  !~  Regex not match                    │
│  Regex is CASE-SENSITIVE and FULLY ANCHORED (^...$)                  │
│  Multiple matchers are ANDed together                                │
│                                                                      │
│  MODIFIERS:                                                          │
│  offset 5m  → Shift backward (relative)                              │
│  @ 1699000  → Set absolute timestamp                                │
│  @ start()  → Start of query range                                   │
│  @ end()    → End of query range                                     │
│                                                                      │
│  ARITHMETIC: + - * / % ^   (standard precedence)                    │
│  COMPARISON: == != > < >= <=  (filters by default, use bool for 0/1)│
│  LOGICAL: and (intersection), or (union), unless (complement)        │
│                                                                      │
│  VECTOR MATCHING:                                                    │
│  on(labels)       → Match ONLY on these labels                       │
│  ignoring(labels) → Match on all EXCEPT these                        │
│  group_left(lbls) → Many-to-one, copy labels from right              │
│  group_right(lbls)→ One-to-many, copy labels from left               │
│                                                                      │
│  AGGREGATIONS:                                                       │
│  sum, avg, min, max, count, stddev, stdvar                           │
│  topk(k,v), bottomk(k,v), quantile(φ,v), count_values, group        │
│  by(labels)      → Keep ONLY these labels (whitelist)                │
│  without(labels) → Remove these labels (blacklist)                   │
│                                                                      │
│  COUNTER FUNCTIONS:                                                  │
│  rate(v[5m])       → Per-second avg rate (smooth, for alerts)        │
│  irate(v[5m])      → Per-second instant rate (last 2 pts, volatile)  │
│  increase(v[1h])   → Total increase ≈ rate × duration               │
│  resets(v[1h])     → Count counter resets                            │
│  ⚠️ All handle counter resets automatically                          │
│  ⚠️ Range must be ≥ 4× scrape interval (recommended)                │
│                                                                      │
│  GAUGE FUNCTIONS:                                                    │
│  delta(v[1h])      → Difference first-to-last (NO reset handling!)   │
│  idelta(v[5m])     → Difference last 2 points                        │
│  deriv(v[1h])      → Per-second rate of change (linear regression)   │
│  predict_linear(v[6h], t) → Predict value t seconds from now        │
│                                                                      │
│  HISTOGRAM:                                                          │
│  histogram_quantile(φ, sum(rate(..._bucket[5m])) by (le))           │
│  φ = 0 to 1 (0.99 = p99)                                            │
│  ALWAYS aggregate by (le) first!                                     │
│  Avg = rate(_sum[5m]) / rate(_count[5m])                            │
│                                                                      │
│  MATH: abs, ceil, floor, round, clamp, clamp_min, clamp_max,        │
│        ln, log2, log10, exp, sqrt, sgn                              │
│                                                                      │
│  TIME: time(), timestamp(), hour(), minute(), day_of_week(),         │
│        day_of_month(), month(), year(), days_in_month()              │
│  Uptime: time() - process_start_time_seconds                         │
│                                                                      │
│  LABELS:                                                             │
│  label_replace(v, dst, "$1", src, "regex")  → Regex transform       │
│  label_join(v, dst, "-", src1, src2)        → Concatenate            │
│                                                                      │
│  SPECIAL:                                                            │
│  absent(v)            → 1 if empty (dead man's switch)               │
│  absent_over_time(v)  → 1 if no data in range                        │
│  changes(v[1h])       → Count value changes (gauge)                  │
│  sort(v), sort_desc(v)→ Sort by value                                │
│  vector(s)            → Scalar → instant vector                      │
│  scalar(v)            → Single-element vector → scalar               │
│                                                                      │
│  *_over_time(): avg, min, max, sum, count, stddev, stdvar,          │
│                 quantile, last, present                              │
│  Example: max_over_time(cpu_usage[24h])                              │
│                                                                      │
│  SUBQUERIES: query[range:resolution]                                 │
│  Example: max_over_time(rate(metric[5m])[1h:1m])                    │
│                                                                      │
│  RECORDING RULES:                                                    │
│  Name: level:metric:operations (e.g., job:http_requests:rate5m)     │
│  Colons reserved for recording rules                                 │
│  Configured in rule_files in prometheus.yml                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

You've now completed the **most important domain** (28% of the exam)!

> **Reply with "Domain 3 Complete"** and I'll provide the comprehensive guide for **Domain 4: Instrumentation & Exporters (16%)** covering:
> - Client Libraries (Go, Python, Java)
> - Instrumentation Best Practices
> - Common Exporters (Node, Blackbox, cAdvisor, etc.)
> - Custom Exporters
> - Naming Conventions Deep Dive
> - 30 Exam-Style Questions
> 
> After that, we'll cover Domains 5–7 (Dashboarding, Service Discovery, Alerting) to complete your preparation! 🚀
