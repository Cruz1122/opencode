---
name: performance-analysis
description: Measure performance, establish baselines, profile bottlenecks, and optimize with explicit trade-offs.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Performance analysis

- Define the metric and workload first: latency, throughput, CPU, memory, allocation, I/O, query cost, render, bundle, or build time.
- Establish a reproducible baseline and measurement method.
- Profile before optimizing; identify the dominant bottleneck.
- Check algorithmic growth, N+1 work, redundant I/O, lock contention, unbounded queues/caches, leaks, and hot allocations.
- Measure after changes and report variance and trade-offs.
- Do not trade correctness, clarity, or operability for unmeasured micro-optimizations.
