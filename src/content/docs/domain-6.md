---
title: "Domain 6: Service Discovery"
description: "Static, File, DNS, Kubernetes, Consul, EC2 SD, Relabeling, metric_relabel_configs"
domain: 6
weight: 6
order: 6
---

# 📘 PCA EXAM — DOMAIN 6: SERVICE DISCOVERY (6%)
## *Complete One-Stop Guide: Theory → Examples → Exam Questions*

---

## TABLE OF CONTENTS

```
6.1   What is Service Discovery & Why It Matters
6.2   Static Configuration (static_configs)
6.3   File-Based Service Discovery (file_sd_configs)
6.4   DNS-Based Service Discovery (dns_sd_configs)
6.5   Kubernetes Service Discovery (kubernetes_sd_configs) ⭐
6.6   Consul Service Discovery (consul_sd_configs)
6.7   Cloud Provider SD (EC2, GCE, Azure)
6.8   Relabeling — relabel_configs (BEFORE Scrape) ⭐⭐
6.9   Relabeling — metric_relabel_configs (AFTER Scrape) ⭐⭐
6.10  Relabeling Actions Deep Dive
6.11  Special __meta_* Labels
6.12  Real-World SD Scenarios
6.13  EXAM-STYLE QUESTIONS (20 Questions with Answers)
```

---

---

## 6.1 📖 WHAT IS SERVICE DISCOVERY & WHY IT MATTERS

### The Problem

```
In traditional infrastructure:
  → You had 10 fixed servers with static IPs
  → You could hardcode them in prometheus.yml
  → Life was simple

In modern infrastructure (Kubernetes, Cloud, Microservices):
  → Pods are created and destroyed every minute
  → IP addresses change constantly
  → Auto-scaling adds/removes instances dynamically
  → You might have 1000+ targets that change hourly
  → Manually maintaining a target list is IMPOSSIBLE
```

### The Solution: Service Discovery (SD)

```
Service Discovery automatically finds and configures scrape targets
by querying an external source of truth.

Flow:
  1. Prometheus queries the SD source (K8s API, Consul, AWS API, etc.)
  2. SD source returns a list of targets with metadata labels
  3. Prometheus applies relabeling rules to filter/transform targets
  4. Prometheus scrapes the resulting targets
  5. When targets change, Prometheus automatically updates

Sources of truth:
  → Kubernetes API (pods, services, nodes, endpoints)
  → Consul catalog
  → AWS EC2 API
  → DNS records
  → Files on disk
  → And many more...
```

### Supported SD Mechanisms in Prometheus

```
┌─────────────────────────────────────────────────────────────┐
│              SERVICE DISCOVERY MECHANISMS                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Static / File:                                             │
│    static_configs       → Hardcoded target list             │
│    file_sd_configs      → Read from JSON/YAML files         │
│                                                             │
│  DNS:                                                       │
│    dns_sd_configs       → DNS SRV/A/AAAA records            │
│                                                             │
│  Kubernetes:                                                │
│    kubernetes_sd_configs → K8s API (pods, services, etc.)   │
│                                                             │
│  Service Registries:                                        │
│    consul_sd_configs    → HashiCorp Consul                  │
│    eureka_sd_configs    → Netflix Eureka                    │
│    zookeeper_sd_configs → Apache ZooKeeper                  │
│                                                             │
│  Cloud Providers:                                           │
│    ec2_sd_configs       → AWS EC2 instances                 │
│    gce_sd_configs       → Google Cloud instances            │
│    azure_sd_configs     → Azure VMs                         │
│    digitalocean_sd_configs → DigitalOcean droplets          │
│    openstack_sd_configs → OpenStack instances               │
│                                                             │
│  Container / Orchestration:                                 │
│    dockerswarm_sd_configs → Docker Swarm                    │
│    kuma_sd_configs      → Kuma service mesh                 │
│    nomad_sd_configs     → HashiCorp Nomad                   │
│                                                             │
│  Network:                                                   │
│    snmp_sd_configs      → SNMP targets                      │
│    http_sd_configs      → Generic HTTP endpoint             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

---

## 6.2 📖 STATIC CONFIGURATION (static_configs)

### What is it?

The simplest form of target configuration. You **manually list** all targets in `prometheus.yml`.

### Configuration

```yaml
scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets:
          - 'app1.example.com:8080'
          - 'app2.example.com:8080'
          - 'app3.example.com:8080'
        labels:
          environment: 'production'
          team: 'backend'
```

### When to Use

```
✅ Use for:
  → Small, stable environments (few servers, rarely changing)
  → Prometheus self-monitoring (localhost:9090)
  → Quick testing and development
  → Targets that don't change often

❌ Don't use for:
  → Kubernetes (pods change constantly)
  → Auto-scaling cloud environments
  → Large environments with 100+ targets
  → Any dynamic infrastructure
```

### Limitations

```
❌ No automatic discovery of new targets
❌ Requires manual config update + Prometheus reload for changes
❌ Doesn't scale to dynamic environments
❌ Error-prone (typos, stale entries)
```

---

---

## 6.3 📖 FILE-BASED SERVICE DISCOVERY (file_sd_configs)

### What is it?

Prometheus reads target definitions from **JSON or YAML files** on disk. When the files change, Prometheus **automatically reloads** the targets without needing a full restart.

### Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'my-app'
    file_sd_configs:
      - files:
          - '/etc/prometheus/targets/*.json'
          - '/etc/prometheus/targets/*.yml'
        refresh_interval: 30s  # How often to check for file changes
```

### Target File Format (JSON)

```json
// /etc/prometheus/targets/web-apps.json
[
  {
    "targets": ["app1:8080", "app2:8080", "app3:8080"],
    "labels": {
      "environment": "production",
      "team": "backend",
      "datacenter": "us-east-1"
    }
  },
  {
    "targets": ["app4:8080", "app5:8080"],
    "labels": {
      "environment": "staging",
      "team": "frontend",
      "datacenter": "eu-west-1"
    }
  }
]
```

### Target File Format (YAML)

```yaml
# /etc/prometheus/targets/databases.yml
- targets:
    - 'db-primary:9104'
    - 'db-replica1:9104'
  labels:
    type: 'mysql'
    environment: 'production'

- targets:
    - 'redis-master:9121'
  labels:
    type: 'redis'
    environment: 'production'
```

### How It Works

```
1. Prometheus reads the files at startup
2. Every refresh_interval (default 5m), it checks for changes
3. If files changed → targets are updated automatically
4. No Prometheus restart or reload needed!

Use case:
  → An external tool (Ansible, Terraform, custom script) 
    generates the target files
  → Prometheus picks up changes automatically
  → Good middle ground between static and full SD
```

### Advantages over Static Config

```
✅ No Prometheus restart needed when targets change
✅ Can be managed by external tools (Ansible, Chef, scripts)
✅ Supports glob patterns (*.json) for multiple files
✅ Good for environments without a service registry
✅ Separates target management from Prometheus config
```

---

---

## 6.4 📖 DNS-BASED SERVICE DISCOVERY (dns_sd_configs)

### What is it?

Prometheus discovers targets by performing **DNS lookups** on specified domain names.

### Configuration

```yaml
scrape_configs:
  - job_name: 'dns-discovered-apps'
    dns_sd_configs:
      - names:
          - 'my-app.service.consul'
          - 'web-apps.internal.example.com'
        type: 'SRV'           # SRV, A, or AAAA
        port: 8080            # Used with A/AAAA records
        refresh_interval: 30s
```

### DNS Record Types

```
SRV Records (most useful):
  → Contains hostname AND port
  → Format: _service._proto.name TTL class SRV priority weight port target
  → Example: _http._tcp.my-app.internal 300 IN SRV 10 5 8080 app1.internal
  → Prometheus extracts both host and port automatically

A Records:
  → Contains only IP address
  → You must specify the port in the config
  → Example: my-app.internal 300 IN A 10.0.1.5
  → Prometheus uses the port from config (e.g., 8080)

AAAA Records:
  → Same as A but for IPv6
```

### When to Use

```
✅ Use for:
  → Environments using DNS-based service discovery (Consul DNS, CoreDNS)
  → Docker networks with DNS resolution
  → Simple service discovery without a full registry
  → Kubernetes headless services (via DNS)
```

---

---

## 6.5 📖 KUBERNETES SERVICE DISCOVERY ⭐ (Most Important for Exam)

### What is it?

Prometheus queries the **Kubernetes API** to automatically discover pods, services, nodes, endpoints, and ingresses.

### Configuration

```yaml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
        # Optional: restrict to specific namespaces
        namespaces:
          names:
            - 'production'
            - 'monitoring'
        # Optional: use a specific kubeconfig
        # kubeconfig_file: /path/to/kubeconfig
```

### Available Roles

| Role | What it Discovers | Use Case |
|------|------------------|----------|
| `pod` | All pods in the cluster | Scraping pod metrics directly |
| `service` | All Kubernetes services | Scraping service endpoints |
| `endpoints` | All endpoint objects | Most precise, resolves to actual pod IPs |
| `node` | All cluster nodes | Node Exporter, kubelet metrics |
| `ingress` | All ingress objects | Monitoring ingress controllers |

### Role: `pod` (Most Common)

```yaml
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
    - role: pod
  relabel_configs:
    # Only scrape pods with the annotation prometheus.io/scrape: "true"
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    
    # Use the port from the annotation prometheus.io/port
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
      action: replace
      target_label: __address__
      regex: (.+)
      replacement: ${1}:${2}
      # Actually needs __address__ to be pod_ip:port
      # More complete version below

    # Set the job label from the pod's container name
    - source_labels: [__meta_kubernetes_pod_container_name]
      target_label: job
    
    # Set the namespace label
    - source_labels: [__meta_kubernetes_namespace]
      target_label: namespace
    
    # Set the pod name label
    - source_labels: [__meta_kubernetes_pod_name]
      target_label: pod
```

### Complete Real-World Kubernetes SD Config

```yaml
scrape_configs:
  # ─── Scrape Pods with Annotations ───
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Keep only pods annotated for scraping
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      
      # Set metrics path from annotation (default: /metrics)
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      
      # Set address to pod IP + port from annotation
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      
      # Add namespace label
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: namespace
      
      # Add pod name label
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: pod

  # ─── Scrape Nodes (Node Exporter) ───
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: replace
        source_labels: [__address__]
        regex: (.+):(.+)
        replacement: $1:9100
        target_label: __address__

  # ─── Scrape Services ───
  - job_name: 'kubernetes-services'
    kubernetes_sd_configs:
      - role: service
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### Key `__meta_kubernetes_*` Labels

```
For role: pod
  __meta_kubernetes_namespace              → Pod namespace
  __meta_kubernetes_pod_name               → Pod name
  __meta_kubernetes_pod_ip                 → Pod IP address
  __meta_kubernetes_pod_node_name          → Node the pod runs on
  __meta_kubernetes_pod_container_name     → Container name
  __meta_kubernetes_pod_ready              → "true" or "false"
  __meta_kubernetes_pod_phase              → Running, Pending, etc.
  __meta_kubernetes_pod_label_<labelname>  → Pod labels
  __meta_kubernetes_pod_annotation_<key>   → Pod annotations

For role: service
  __meta_kubernetes_namespace              → Service namespace
  __meta_kubernetes_service_name           → Service name
  __meta_kubernetes_service_type           → ClusterIP, NodePort, etc.
  __meta_kubernetes_service_cluster_ip     → Cluster IP
  __meta_kubernetes_service_label_<name>   → Service labels

For role: node
  __meta_kubernetes_node_name              → Node name
  __meta_kubernetes_node_label_<name>      → Node labels
  __meta_kubernetes_node_address_<type>    → Node addresses

For role: endpoints
  __meta_kubernetes_endpoints_name         → Endpoints name
  __meta_kubernetes_endpoint_port_name     → Port name
  __meta_kubernetes_endpoint_ready         → "true" or "false"
```

### 💡 Key Takeaway for Exam
> Kubernetes SD uses the **Kubernetes API** to discover targets
> **Roles**: pod, service, endpoints, node, ingress
> Discovered targets have `__meta_kubernetes_*` labels
> **Relabeling** is essential to filter and configure targets
> Common pattern: Use annotations (`prometheus.io/scrape: "true"`) to opt-in pods

---

---

## 6.6 📖 CONSUL SERVICE DISCOVERY (consul_sd_configs)

### Configuration

```yaml
scrape_configs:
  - job_name: 'consul-services'
    consul_sd_configs:
      - server: 'consul.example.com:8500'
        datacenter: 'us-east-1'
        services: ['web-app', 'api-service', 'database']
        token: 'my-consul-token'  # Optional ACL token
        scheme: http
        refresh_interval: 30s
    relabel_configs:
      - source_labels: [__meta_consul_service]
        target_label: job
      - source_labels: [__meta_consul_node]
        target_label: instance
```

### Key `__meta_consul_*` Labels

```
__meta_consul_node         → Consul node name
__meta_consul_address      → Node address
__meta_consul_service      → Service name
__meta_consul_service_id   → Service ID
__meta_consul_service_port → Service port
__meta_consul_service_address → Service address
__meta_consul_tags         → Comma-separated tags
__meta_consul_dc           → Datacenter
__meta_consul_tagged_address_<name> → Tagged addresses
```

---

---

## 6.7 📖 CLOUD PROVIDER SD (EC2, GCE, Azure)

### AWS EC2 Example

```yaml
scrape_configs:
  - job_name: 'ec2-instances'
    ec2_sd_configs:
      - region: 'us-east-1'
        access_key: 'AKIAIOSFODNN7EXAMPLE'
        secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        port: 9100
        filters:
          - name: 'tag:Environment'
            values: ['production']
          - name: 'instance-state-name'
            values: ['running']
    relabel_configs:
      - source_labels: [__meta_ec2_tag_Name]
        target_label: instance
      - source_labels: [__meta_ec2_availability_zone]
        target_label: az
```

### Key `__meta_ec2_*` Labels

```
__meta_ec2_instance_id       → EC2 instance ID
__meta_ec2_instance_type     → Instance type (t3.micro, etc.)
__meta_ec2_private_ip        → Private IP
__meta_ec2_public_ip         → Public IP (if any)
__meta_ec2_availability_zone → AZ (us-east-1a)
__meta_ec2_vpc_id            → VPC ID
__meta_ec2_subnet_id         → Subnet ID
__meta_ec2_tag_<tagname>     → EC2 tags (e.g., __meta_ec2_tag_Name)
__meta_ec2_owner_id          → AWS account ID
```

---

---

## 6.8 📖 RELABELING — `relabel_configs` (BEFORE Scrape) ⭐⭐

### What is Relabeling?

Relabeling is the process of **modifying, filtering, or creating labels** on targets and metrics. It's the most powerful and most tested SD concept.

### Two Types of Relabeling

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  relabel_configs (BEFORE scrape):                           │
│    → Applied to TARGET labels before scraping               │
│    → Can filter which targets to scrape                     │
│    → Can modify __address__, __metrics_path__, __scheme__   │
│    → Operates on __meta_* labels from SD                    │
│    → Labels starting with __ are DROPPED after relabeling   │
│                                                             │
│  metric_relabel_configs (AFTER scrape):                     │
│    → Applied to METRIC labels after scraping                │
│    → Can filter which metrics to keep/drop                  │
│    → Can rename or modify metric labels                     │
│    → Operates on the actual scraped metric data             │
│                                                             │
│  Flow:                                                      │
│  SD discovers targets                                       │
│    → relabel_configs (filter/transform targets)             │
│    → Prometheus scrapes the target                          │
│    → metric_relabel_configs (filter/transform metrics)      │
│    → Metrics stored in TSDB                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### relabel_configs Syntax

```yaml
relabel_configs:
  - source_labels: [label1, label2]  # Input labels (concatenated)
    separator: ';'                    # Separator for concatenation (default: ;)
    target_label: new_label          # Output label to write to
    regex: '(.+);(.+)'              # Regex to match (default: (.*))
    replacement: '$1-$2'            # Replacement string (default: $1)
    action: replace                  # What to do (default: replace)
    modulus: 1                       # For hashmod action
```

### Common relabel_configs Use Cases

#### 1. Filter Targets (Keep/Drop)

```yaml
# Keep only targets with a specific annotation
- source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
  action: keep
  regex: true

# Drop targets in the "test" namespace
- source_labels: [__meta_kubernetes_namespace]
  action: drop
  regex: test

# Keep only running pods
- source_labels: [__meta_kubernetes_pod_phase]
  action: keep
  regex: Running
```

#### 2. Set the Scrape Address

```yaml
# Override the address to use a specific port
- source_labels: [__address__]
  action: replace
  regex: (.+):.*
  replacement: $1:9100
  target_label: __address__
```

#### 3. Set the Metrics Path

```yaml
# Use custom metrics path from annotation
- source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
  action: replace
  target_label: __metrics_path__
  regex: (.+)
```

#### 4. Create Labels from Metadata

```yaml
# Extract namespace as a label
- source_labels: [__meta_kubernetes_namespace]
  action: replace
  target_label: namespace

# Extract pod name as a label
- source_labels: [__meta_kubernetes_pod_name]
  action: replace
  target_label: pod
```

---

---

## 6.9 📖 RELABELING — `metric_relabel_configs` (AFTER Scrape) ⭐⭐

### What is it?

Applied to the **scraped metrics** AFTER they are collected but BEFORE they are stored in the TSDB.

### Common Use Cases

#### 1. Drop Unnecessary Metrics (Save Storage!)

```yaml
metric_relabel_configs:
  # Drop all Go runtime metrics (saves significant storage)
  - source_labels: [__name__]
    action: drop
    regex: 'go_.*'

  # Drop all process metrics
  - source_labels: [__name__]
    action: drop
    regex: 'process_.*'

  # Drop specific high-cardinality metrics
  - source_labels: [__name__]
    action: drop
    regex: 'http_request_duration_seconds_bucket'
```

#### 2. Rename Labels

```yaml
metric_relabel_configs:
  # Rename "kubernetes_pod_name" to "pod"
  - source_labels: [kubernetes_pod_name]
    action: replace
    target_label: pod
```

#### 3. Drop Specific Label Values

```yaml
metric_relabel_configs:
  # Drop metrics with a specific label value
  - source_labels: [endpoint]
    action: drop
    regex: '/health'
```

#### 4. Sanitize Label Values

```yaml
metric_relabel_configs:
  # Replace dots with underscores in a label
  - source_labels: [service_name]
    action: replace
    regex: '(.*)\.(.*)'
    replacement: '${1}_${2}'
    target_label: service_name
```

### 💡 Key Takeaway for Exam
> **`relabel_configs`** = BEFORE scrape (targets, filtering, address)
> **`metric_relabel_configs`** = AFTER scrape (metrics, dropping, renaming)
> Both use the same syntax and actions
> `__name__` label contains the metric name (useful for filtering)

---

---

## 6.10 📖 RELABELING ACTIONS DEEP DIVE

### Complete List of Actions

| Action | Description | Default? |
|--------|-------------|----------|
| `replace` | Match regex against source labels, write replacement to target label | ✅ Yes |
| `keep` | Keep the target ONLY if regex matches source labels | |
| `drop` | Drop the target if regex matches source labels | |
| `hashmod` | Set target label to hash of source labels modulo `modulus` | |
| `labelmap` | Copy all labels matching regex to new label names | |
| `labeldrop` | Remove all labels matching regex | |
| `labelkeep` | Keep ONLY labels matching regex (remove all others) | |
| `lowercase` | Convert source label value to lowercase | |
| `uppercase` | Convert source label value to uppercase | |

### Detailed Examples

#### `replace` (Default Action)

```yaml
# Extract hostname from instance label
- source_labels: [__address__]
  regex: '([^:]+):\d+'
  target_label: hostname
  replacement: '$1'
  # instance="app1.example.com:8080" → hostname="app1.example.com"

# Set job label from Kubernetes namespace
- source_labels: [__meta_kubernetes_namespace]
  target_label: job
  # No regex needed — copies the entire value
```

#### `keep`

```yaml
# Only scrape pods in "production" namespace
- source_labels: [__meta_kubernetes_namespace]
  action: keep
  regex: production
  # Pods in other namespaces are DROPPED

# Only scrape pods with specific annotation
- source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
  action: keep
  regex: true
```

#### `drop`

```yaml
# Don't scrape pods in "kube-system" namespace
- source_labels: [__meta_kubernetes_namespace]
  action: drop
  regex: kube-system

# Don't scrape pods with "debug" in the name
- source_labels: [__meta_kubernetes_pod_name]
  action: drop
  regex: '.*debug.*'
```

#### `labelmap`

```yaml
# Copy all __meta_kubernetes_pod_label_* to regular labels
- action: labelmap
  regex: '__meta_kubernetes_pod_label_(.+)'
  # __meta_kubernetes_pod_label_app="web" → app="web"
  # __meta_kubernetes_pod_label_version="v2" → version="v2"

# Copy all __meta_kubernetes_service_label_* to regular labels
- action: labelmap
  regex: '__meta_kubernetes_service_label_(.+)'
```

#### `labeldrop`

```yaml
# Remove all labels starting with "tmp_"
- action: labeldrop
  regex: 'tmp_.*'

# Remove all __meta_* labels (usually done automatically)
- action: labeldrop
  regex: '__meta_.*'
```

#### `labelkeep`

```yaml
# Keep ONLY these labels, drop everything else
- action: labelkeep
  regex: 'job|instance|method|status|endpoint'
  # All other labels are removed!
```

#### `hashmod`

```yaml
# Distribute targets across multiple Prometheus servers (sharding)
- source_labels: [__address__]
  action: hashmod
  modulus: 3
  target_label: __tmp_hash
# Then use keep to only scrape targets assigned to this server:
- source_labels: [__tmp_hash]
  action: keep
  regex: 0  # This server handles shard 0
```

---

---

## 6.11 📖 SPECIAL `__meta_*` LABELS

### How They Work

```
1. Service Discovery discovers a target
2. SD attaches __meta_* labels with metadata about the target
3. relabel_configs can read these labels to filter/transform
4. After relabeling, ALL labels starting with __ are DROPPED
5. Only non-__ labels are stored with the scraped metrics

This means:
  → __meta_* labels are TEMPORARY (only during relabeling)
  → If you want to keep a meta label, COPY it to a regular label
  → __address__, __scheme__, __metrics_path__ are also temporary
```

### Important Internal Labels

| Label | Purpose | Set By |
|-------|---------|--------|
| `__address__` | Target address (host:port) | SD or static config |
| `__scheme__` | HTTP scheme (http/https) | Config |
| `__metrics_path__` | Metrics endpoint path | Config (default: /metrics) |
| `__param_<name>` | URL parameters | Config |
| `__scrape_interval__` | Scrape interval for this target | Config |
| `__scrape_timeout__` | Scrape timeout for this target | Config |
| `__name__` | Metric name (in metric_relabel) | Scraped data |

### 💡 Key Takeaway for Exam
> Labels starting with `__` are **internal/temporary**
> They are **dropped after relabeling** (not stored in TSDB)
> To keep a `__meta_*` value, **copy it** to a regular label using `replace`
> `__address__` controls where Prometheus scrapes
> `__metrics_path__` controls the endpoint path
> `__name__` contains the metric name (useful in metric_relabel_configs)

---

---

## 6.12 📖 REAL-WORLD SD SCENARIOS

### Scenario 1: Kubernetes Cluster Monitoring

```yaml
# Complete K8s monitoring setup
scrape_configs:
  # 1. Scrape annotated pods
  - job_name: 'k8s-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod

  # 2. Scrape Node Exporter on all nodes
  - job_name: 'k8s-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: replace
        source_labels: [__address__]
        regex: (.+):(.+)
        replacement: $1:9100
        target_label: __address__

  # 3. Scrape kube-state-metrics
  - job_name: 'kube-state-metrics'
    static_configs:
      - targets: ['kube-state-metrics:8080']
```

### Scenario 2: Multi-Environment with File SD

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'all-services'
    file_sd_configs:
      - files:
          - '/etc/prometheus/sd/production/*.json'
          - '/etc/prometheus/sd/staging/*.json'
        refresh_interval: 1m
    metric_relabel_configs:
      # Drop high-cardinality metrics globally
      - source_labels: [__name__]
        action: drop
        regex: 'go_gc_.*'
```

---

---

## 6.13 📝 EXAM-STYLE QUESTIONS (20 Questions)

### Question 1
**What is the primary purpose of Service Discovery in Prometheus?**

A) To configure alerting rules automatically
B) To automatically find and configure scrape targets from an external source of truth
C) To discover new metric types automatically
D) To automatically create Grafana dashboards

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

Service Discovery (SD) automatically discovers scrape targets by querying external sources like the Kubernetes API, Consul, AWS EC2, DNS, or files. This eliminates the need to manually maintain target lists in dynamic environments where instances are constantly created and destroyed.
</details>

---

### Question 2
**Which Service Discovery mechanism reads target definitions from files on disk?**

A) `static_configs`
B) `dns_sd_configs`
C) `file_sd_configs`
D) `http_sd_configs`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`file_sd_configs` reads target definitions from JSON or YAML files on disk. When the files change, Prometheus automatically reloads the targets without requiring a restart. `static_configs` hardcodes targets in prometheus.yml, `dns_sd_configs` uses DNS lookups, and `http_sd_configs` queries an HTTP endpoint.
</details>

---

### Question 3
**What is the difference between `relabel_configs` and `metric_relabel_configs`?**

A) They are the same thing with different names
B) `relabel_configs` is applied BEFORE scraping (to targets); `metric_relabel_configs` is applied AFTER scraping (to metrics)
C) `relabel_configs` is for Kubernetes; `metric_relabel_configs` is for EC2
D) `relabel_configs` modifies metric values; `metric_relabel_configs` modifies target addresses

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`relabel_configs` is applied to **target labels before scraping** — it can filter which targets to scrape, modify the scrape address, change the metrics path, etc. `metric_relabel_configs` is applied to **scraped metric labels after scraping** — it can drop unwanted metrics, rename labels, or sanitize label values. Both use the same syntax and actions.
</details>

---

### Question 4
**What happens to labels starting with `__` (double underscore) after relabeling is complete?**

A) They are stored in the TSDB along with other labels
B) They are automatically dropped and not stored
C) They are renamed to remove the underscores
D) They cause an error

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

All labels starting with `__` (double underscore) are **automatically dropped** after relabeling is complete. They are internal/temporary labels used only during the relabeling process. This includes `__address__`, `__scheme__`, `__metrics_path__`, and all `__meta_*` labels. If you want to preserve a value from a `__meta_*` label, you must copy it to a regular label using a `replace` action.
</details>

---

### Question 5
**Which relabeling action would you use to keep only targets that match a specific condition?**

A) `replace`
B) `drop`
C) `keep`
D) `labelmap`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `keep` action retains only the targets where the regex matches the source labels. All non-matching targets are dropped. For example, to keep only pods in the "production" namespace: `source_labels: [__meta_kubernetes_namespace], action: keep, regex: production`. The `drop` action does the opposite — it removes matching targets.
</details>

---

### Question 6
**In Kubernetes Service Discovery, which role would you use to discover all pods in the cluster?**

A) `node`
B) `service`
C) `pod`
D) `ingress`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The `pod` role discovers all pods in the Kubernetes cluster. Each pod container becomes a potential scrape target. Other roles: `node` discovers cluster nodes, `service` discovers Kubernetes services, `endpoints` discovers endpoint objects (most precise), and `ingress` discovers ingress objects.
</details>

---

### Question 7
**What does the `__address__` label control in Prometheus relabeling?**

A) The Alertmanager address for sending alerts
B) The target address (host:port) that Prometheus will scrape
C) The Grafana server address
D) The remote write destination

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`__address__` is an internal label that specifies the **host:port** of the target that Prometheus will scrape. By modifying `__address__` in `relabel_configs`, you can change which address Prometheus connects to. For example, you might replace the default port with a custom metrics port. After relabeling, `__address__` is used to construct the scrape URL and is then dropped.
</details>

---

### Question 8
**Which relabeling action copies all labels matching a regex pattern to new label names?**

A) `replace`
B) `labelmap`
C) `labelkeep`
D) `labeldrop`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`labelmap` copies all labels whose names match the regex to new label names, using the regex capture groups. The most common use case is copying Kubernetes metadata labels: `action: labelmap, regex: __meta_kubernetes_pod_label_(.+)` which converts `__meta_kubernetes_pod_label_app="web"` to `app="web"`. The original `__meta_*` labels are still dropped after relabeling.
</details>

---

### Question 9
**What is the default action in a relabeling rule if no action is specified?**

A) `keep`
B) `drop`
C) `replace`
D) `labelmap`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The default action is `replace`. If you don't specify an action in a relabeling rule, Prometheus will match the regex against the source labels and write the replacement string to the target label. This is the most commonly used action for creating new labels or modifying existing ones.
</details>

---

### Question 10
**Which metric_relabel_configs rule would correctly drop all Go runtime metrics?**

A) `- source_labels: [__name__] action: drop regex: 'go_.*'`
B) `- source_labels: [__type__] action: drop regex: 'go_.*'`
C) `- source_labels: [__metric__] action: drop regex: 'go_.*'`
D) `- source_labels: [job] action: drop regex: 'go_.*'`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

To drop specific metrics, you match against the `__name__` label, which contains the metric name. The rule `source_labels: [__name__], action: drop, regex: 'go_.*'` drops all metrics whose names start with "go_" (e.g., go_goroutines, go_gc_duration_seconds). There is no `__type__` or `__metric__` label. The `job` label contains the job name, not the metric name.
</details>

---

### Question 11
**What file formats does `file_sd_configs` support?**

A) XML and CSV
B) JSON and YAML
C) TOML and INI
D) Plain text only

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`file_sd_configs` supports **JSON and YAML** file formats. The files contain arrays of target groups, each with a `targets` list and optional `labels`. Prometheus watches these files and automatically reloads targets when they change. Glob patterns (e.g., `*.json`, `*.yml`) are supported for loading multiple files.
</details>

---

### Question 12
**In Kubernetes SD, what is the purpose of the `__meta_kubernetes_pod_annotation_prometheus_io_scrape` label?**

A) It controls the scrape interval for the pod
B) It is automatically set by Kubernetes to indicate pod health
C) It is a custom annotation that can be used in relabeling to opt-in pods for scraping
D) It specifies the metrics path for the pod

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`__meta_kubernetes_pod_annotation_prometheus_io_scrape` is derived from the Kubernetes pod annotation `prometheus.io/scrape`. It's a convention (not built into Kubernetes) where you annotate pods with `prometheus.io/scrape: "true"` to indicate they should be scraped. In relabeling, you use `action: keep, regex: true` to only scrape annotated pods. This is an opt-in pattern for controlling which pods Prometheus monitors.
</details>

---

### Question 13
**Which relabeling action would you use to remove all labels except a specific set?**

A) `labeldrop`
B) `labelmap`
C) `labelkeep`
D) `drop`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`labelkeep` removes all labels that do NOT match the regex, keeping only the matching ones. For example, `action: labelkeep, regex: 'job|instance|method'` would remove all labels except `job`, `instance`, and `method`. `labeldrop` does the opposite (removes matching labels). `drop` removes entire targets, not labels. `labelmap` copies labels.
</details>

---

### Question 14
**What does the `honor_labels` configuration do in relation to Service Discovery?**

A) It enables automatic label creation from SD metadata
B) It prevents Prometheus from overwriting labels that already exist in the scraped data with labels from the scrape configuration
C) It drops all labels from the scraped data
D) It renames all `__meta_*` labels to regular labels

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`honor_labels: true` tells Prometheus to keep the `job` and `instance` labels (and other conflicting labels) as they appear in the scraped data, rather than overwriting them with values from the scrape configuration. This is essential for Pushgateway and federation, where the original labels must be preserved. By default, `honor_labels` is `false`.
</details>

---

### Question 15
**Which of the following is NOT a valid Kubernetes SD role?**

A) `pod`
B) `node`
C) `container`
D) `endpoints`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

The valid Kubernetes SD roles are: `pod`, `service`, `endpoints`, `node`, and `ingress`. **"container"** is NOT a valid role. While containers exist within pods, Kubernetes SD discovers at the pod level (which includes all containers in the pod), not at the individual container level.
</details>

---

### Question 16
**What is the purpose of the `hashmod` relabeling action?**

A) To encrypt label values for security
B) To distribute targets across multiple Prometheus servers (sharding) by hashing source labels
C) To verify the integrity of scraped metrics
D) To generate unique IDs for each target

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

`hashmod` calculates a hash of the source labels and takes the modulo of a specified number. This is used for **sharding** — distributing targets across multiple Prometheus servers. For example, with `modulus: 3`, targets are distributed into 3 shards (0, 1, 2). Each Prometheus server uses a `keep` action to only scrape its assigned shard.
</details>

---

### Question 17
**In a `file_sd_configs` setup, what happens when the target files are modified?**

A) Prometheus must be restarted to pick up the changes
B) Prometheus must receive a SIGHUP signal to reload
C) Prometheus automatically detects the changes and updates targets within the refresh_interval
D) The changes are ignored until the next day

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

One of the key advantages of `file_sd_configs` is that Prometheus **automatically detects file changes** and updates targets without requiring a restart or reload signal. It checks the files at the configured `refresh_interval` (default 5 minutes). This makes it ideal for environments where an external tool (Ansible, Terraform) manages target files.
</details>

---

### Question 18
**Which `__meta_*` label prefix is used for Kubernetes pod labels?**

A) `__meta_kubernetes_pod_label_<labelname>`
B) `__meta_kubernetes_label_<labelname>`
C) `__meta_pod_label_<labelname>`
D) `__meta_k8s_pod_<labelname>`

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: A**

Kubernetes pod labels are exposed as `__meta_kubernetes_pod_label_<labelname>`. For example, if a pod has the label `app=web`, it appears as `__meta_kubernetes_pod_label_app="web"` during relabeling. Similarly, pod annotations appear as `__meta_kubernetes_pod_annotation_<key>`. Service labels use `__meta_kubernetes_service_label_<labelname>`, and node labels use `__meta_kubernetes_node_label_<labelname>`.
</details>

---

### Question 19
**What is the correct way to use `metric_relabel_configs` to drop a high-cardinality label from all scraped metrics?**

A) Use `action: drop` with the label name in `source_labels`
B) Use `action: labeldrop` with a regex matching the label name
C) Use `action: keep` with the label name in `target_label`
D) Use `action: replace` with an empty replacement

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: B**

To remove a specific label from all scraped metrics, use `action: labeldrop` with a regex matching the label name. For example: `action: labeldrop, regex: 'user_id'` removes the `user_id` label from all metrics. `action: drop` (A) would drop entire metrics, not labels. `action: keep` (C) keeps targets, not labels. `action: replace` (D) modifies label values but doesn't remove labels.
</details>

---

### Question 20
**Which Service Discovery mechanism would be most appropriate for a dynamic Kubernetes environment with hundreds of pods that scale up and down frequently?**

A) `static_configs` with manual target lists
B) `file_sd_configs` with manually updated JSON files
C) `kubernetes_sd_configs` with role `pod` or `endpoints`
D) `dns_sd_configs` with static DNS records

<details>
<summary>✅ Answer & Explanation</summary>

**Correct Answer: C**

`kubernetes_sd_configs` is the most appropriate for dynamic Kubernetes environments. It queries the Kubernetes API in real-time and automatically discovers new pods as they are created and removes them as they are terminated. With roles like `pod` or `endpoints`, combined with relabeling rules to filter by annotations, it provides fully automated target management. Static configs (A) and file SD (B) require manual updates, and DNS SD (D) may not reflect changes quickly enough.
</details>

---

---

## ✅ DOMAIN 6 REVISION SUMMARY CHEAT SHEET

```
┌──────────────────────────────────────────────────────────────────────┐
│              DOMAIN 6: SERVICE DISCOVERY CHEAT SHEET                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SD TYPES:                                                           │
│  static_configs      → Hardcoded targets (small, stable envs)        │
│  file_sd_configs     → JSON/YAML files (auto-reload, no restart)     │
│  dns_sd_configs      → DNS SRV/A/AAAA records                       │
│  kubernetes_sd_configs → K8s API (pod, service, endpoints, node,     │
│                          ingress) ⭐ MOST IMPORTANT                  │
│  consul_sd_configs   → HashiCorp Consul                              │
│  ec2_sd_configs      → AWS EC2 instances                             │
│  gce_sd_configs      → Google Cloud instances                        │
│  azure_sd_configs    → Azure VMs                                     │
│                                                                      │
│  KUBERNETES SD:                                                      │
│  Roles: pod, service, endpoints, node, ingress                       │
│  Meta labels: __meta_kubernetes_namespace, _pod_name, _pod_ip,       │
│    _pod_label_<name>, _pod_annotation_<key>, _service_name, etc.     │
│  Common pattern: Annotate pods with prometheus.io/scrape: "true"     │
│                                                                      │
│  RELABELING:                                                         │
│  relabel_configs        → BEFORE scrape (targets)                    │
│  metric_relabel_configs → AFTER scrape (metrics)                     │
│                                                                      │
│  ACTIONS:                                                            │
│  replace   → Match regex, write replacement (DEFAULT)                │
│  keep      → Keep target only if regex matches                       │
│  drop      → Drop target if regex matches                            │
│  hashmod   → Hash modulo (for sharding)                              │
│  labelmap  → Copy matching labels to new names                       │
│  labeldrop → Remove matching labels                                  │
│  labelkeep → Keep ONLY matching labels                               │
│  lowercase → Convert to lowercase                                    │
│  uppercase → Convert to uppercase                                    │
│                                                                      │
│  KEY INTERNAL LABELS:                                                │
│  __address__      → Target host:port (dropped after relabeling)      │
│  __metrics_path__ → Scrape path (default: /metrics)                  │
│  __scheme__       → http or https                                    │
│  __name__         → Metric name (in metric_relabel_configs)          │
│  __meta_*         → SD metadata (dropped after relabeling)           │
│  ALL __ labels are DROPPED after relabeling!                         │
│  To keep: copy to regular label via replace action                   │
│                                                                      │
│  FILE SD:                                                            │
│  Formats: JSON and YAML                                              │
│  Auto-reload: Yes (refresh_interval, default 5m)                     │
│  No restart needed!                                                  │
│  Glob patterns supported: *.json, *.yml                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 NEXT STEPS

> **Reply with "Domain 6 Complete"** and I'll provide the final domain:
> 
> **Domain 7: Alerting & Alertmanager (4%)**
> - Alerting rules syntax & states
> - Alertmanager configuration
> - Routing, grouping, inhibition, silencing
> - Receivers (Slack, Email, PagerDuty, Webhook)
> - 15 Exam-Style Questions
> 
> This is the **last domain** — only 4% of the exam! After this, you'll have complete coverage of all 7 domains! 🎉🚀
