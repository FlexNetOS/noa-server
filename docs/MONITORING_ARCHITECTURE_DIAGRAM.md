# Prompt Optimization Monitoring System - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                              │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐│
│  │   React      │  │   Express    │  │  Prometheus  │  │  CloudWatch ││
│  │  Dashboard   │  │     API      │  │  Integration │  │ Integration ││
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘│
│         │                 │                 │                 │        │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            METRICS API LAYER                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         MetricsAPI                                  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │ │
│  │  │ Summary  │ │Performance│ │  Alerts  │ │ TimeSeries│ │ Health │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────┘ │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │ │
│  │  │Strategies│ │  Cache   │ │ Quality  │ │Thresholds│ │ Export  │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └─────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CORE MONITORING LAYER                             │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│  │  MetricsCollector    │  │  EnhancedLogger      │  │AutomationMonitor│
│  │                      │  │                      │  │  (Base)         │ │
│  │ ┌────────────────┐  │  │ ┌────────────────┐  │  │ ┌─────────────┐ │ │
│  │ │ Time-Series    │  │  │ │ Correlation IDs │  │  │ │ Basic Stats │ │ │
│  │ │ Aggregation    │  │  │ │                 │  │  │ │             │ │ │
│  │ └────────────────┘  │  │ └────────────────┘  │  │ └─────────────┘ │ │
│  │ ┌────────────────┐  │  │ ┌────────────────┐  │  │ ┌─────────────┐ │ │
│  │ │ Percentile     │  │  │ │ Context Mgmt   │  │  │ │ Success Rate│ │ │
│  │ │ Calculation    │  │  │ │                 │  │  │ │             │ │ │
│  │ └────────────────┘  │  │ └────────────────┘  │  │ └─────────────┘ │ │
│  │ ┌────────────────┐  │  │ ┌────────────────┐  │  │ ┌─────────────┐ │ │
│  │ │ Alert System   │  │  │ │ Operation      │  │  │ │ Cache Stats │ │ │
│  │ │                 │  │  │ │ Tracking       │  │  │ │             │ │ │
│  │ └────────────────┘  │  │ └────────────────┘  │  │ └─────────────┘ │ │
│  │ ┌────────────────┐  │  │ ┌────────────────┐  │  │                 │ │
│  │ │ Strategy       │  │  │ │ Log Query &    │  │  │                 │ │
│  │ │ Metrics        │  │  │ │ Analytics      │  │  │                 │ │
│  │ └────────────────┘  │  │ └────────────────┘  │  │                 │ │
│  └──────────────────────┘  └──────────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      OPTIMIZATION PIPELINE LAYER                         │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    MandatoryOptimizer                               │ │
│  │                                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────┐  │ │
│  │  │  intercept(prompt, context)                                  │  │ │
│  │  │    │                                                         │  │ │
│  │  │    ├─► Start Operation (correlationId)                       │  │ │
│  │  │    ├─► Check Cache                                          │  │ │
│  │  │    ├─► Perform Optimization                                 │  │ │
│  │  │    ├─► Record Metrics (time, quality, strategy)             │  │ │
│  │  │    ├─► Enhanced Logging                                     │  │ │
│  │  │    ├─► End Operation                                        │  │ │
│  │  │    └─► Return Result                                        │  │ │
│  │  └─────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │PromptCache   │  │AutomationLogger│ │PromptOptimization│PromptAgent││
│  │              │  │              │  │   Agent         │            │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│   Request    │
│  (Prompt)    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  MandatoryOptimizer.intercept()      │
│  • Generate correlation ID           │
│  • Set context (userId, sessionId)   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  EnhancedLogger.startOperation()     │
│  • Create operation tracking         │
│  • Log with correlation ID           │
└──────┬───────────────────────────────┘
       │
       ├─► Check Cache ──► Cache Hit ──┐
       │                               │
       ├─► Perform Optimization        │
       │   • Analyze                   │
       │   • Diagnose                  │
       │   • Develop                   │
       │   • Deliver                   │
       │                               │
       ▼                               │
┌──────────────────────────────────────┤
│  Record Metrics                      │
│  • MetricsCollector.recordOptimization()
│    - Processing time                │
│    - Quality score                  │
│    - Strategy used                  │
│    - Time-series data               │
│  • Check Alert Thresholds           │
│  • Update Statistics                │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  EnhancedLogger.logOptimization()    │
│  • Log complete operation            │
│  • Include correlation ID            │
│  • Record metrics and metadata       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  EnhancedLogger.endOperation()       │
│  • Mark operation complete           │
│  • Calculate total duration          │
│  • Log final status                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────┐
│   Response   │
│  (Optimized) │
└──────────────┘
```

## Metrics Collection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Optimization Event                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   MetricsCollector.recordOptimization()
        │   - result: OptimizationResult    │
        │   - processingTime: number        │
        └────────────────┬───────────────────┘
                         │
                         ├──────────────────────────┐
                         │                          │
                         ▼                          ▼
        ┌────────────────────────┐    ┌──────────────────────┐
        │  Update Time-Series    │    │  Update Statistics   │
        │  • Hourly aggregation  │    │  • Processing times  │
        │  • Daily aggregation   │    │  • Quality scores    │
        │  • Rolling windows     │    │  • Success counts    │
        └────────────────────────┘    └──────────────────────┘
                         │
                         ├──────────────────────────┐
                         │                          │
                         ▼                          ▼
        ┌────────────────────────┐    ┌──────────────────────┐
        │  Update Strategy       │    │  Check Thresholds    │
        │  Metrics               │    │  • Processing time   │
        │  • Per-strategy stats  │    │  • Quality score     │
        │  • Success rates       │    │  • Success rate      │
        └────────────────────────┘    │  • Create alerts     │
                                      └──────────────────────┘
```

## Alert Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Metric Threshold Check                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ├─► Processing Time > maxProcessingTime
                         ├─► Quality Score < minQualityScore
                         ├─► Success Rate < minSuccessRate
                         └─► Failure Rate > maxFailureRate
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Create Alert                      │
        │  • Severity (critical/error/warn)  │
        │  • Metric name                     │
        │  • Current value                   │
        │  • Threshold value                 │
        │  • Message                         │
        │  • Timestamp                       │
        └────────────────┬───────────────────┘
                         │
                         ├──────────────────────────┐
                         │                          │
                         ▼                          ▼
        ┌────────────────────────┐    ┌──────────────────────┐
        │  Store in Alert Queue  │    │  Log Alert           │
        │  • Limited to maxAlerts│    │  • Console error/warn│
        │  • FIFO eviction       │    │  • Structured log    │
        └────────────────────────┘    └──────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Notify Clients                    │
        │  • Dashboard updates               │
        │  • API consumers                   │
        │  • External monitoring systems     │
        └────────────────────────────────────┘
```

## Logging Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Log Event                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  EnhancedLogger.log()              │
        │  • Generate/use correlation ID    │
        │  • Merge context                  │
        │  • Add metrics                    │
        │  • Add metadata                   │
        └────────────────┬───────────────────┘
                         │
                         ├──────────────────────────┐
                         │                          │
                         ▼                          ▼
        ┌────────────────────────┐    ┌──────────────────────┐
        │  Store Structured Log  │    │  Log to Console      │
        │  • Correlation ID      │    │  • Formatted output  │
        │  • Context data        │    │  • Color coding      │
        │  • Metrics             │    │  • Timestamp prefix  │
        │  • Metadata            │    └──────────────────────┘
        │  • Limited to maxLogs  │
        └────────────────┬───────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Enable Querying                   │
        │  • By correlation ID               │
        │  • By operation                    │
        │  • By level                        │
        │  • By tags                         │
        │  • By time range                   │
        └────────────────────────────────────┘
```

## Dashboard Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   React Dashboard Component                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  useEffect Hook                    │
        │  • Fetch metrics on mount          │
        │  • Set interval for auto-refresh   │
        │  • Default: 5 seconds              │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  MetricsAPI.getSummary()           │
        │  • Returns complete summary        │
        │  • Overview + Performance + Alerts │
        │  • Trends                          │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Update State                      │
        │  • Set summary data                │
        │  • Set alerts                      │
        │  • Clear loading state             │
        └────────────────┬───────────────────┘
                         │
                         ├──────────────────┬──────────────────┬──────────────┐
                         │                  │                  │              │
                         ▼                  ▼                  ▼              ▼
        ┌────────────────────┐  ┌─────────────────┐  ┌─────────────┐  ┌─────────┐
        │  Overview Cards    │  │  Alert Panel    │  │  Performance│  │Strategy │
        │  • Total Opts      │  │  • Recent alerts│  │  Details    │  │ Usage   │
        │  • Success Rate    │  │  • Color coded  │  │  • Percentiles│ │Cards   │
        │  • Avg Time        │  │  • Clear button │  │  • Quality  │  │         │
        │  • Cache Hit Rate  │  └─────────────────┘  └─────────────┘  └─────────┘
        └────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │  Time-Series Chart                 │
        │  • SVG line chart                  │
        │  • Hourly/daily data               │
        │  • Interactive points              │
        └────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Systems                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
       ┌─────────────────┼─────────────────┬───────────────────┐
       │                 │                 │                   │
       ▼                 ▼                 ▼                   ▼
┌──────────┐     ┌──────────────┐  ┌─────────────┐   ┌─────────────┐
│ Express  │     │ Prometheus   │  │ CloudWatch  │   │   Custom    │
│   API    │     │              │  │             │   │ Integration │
└────┬─────┘     └──────┬───────┘  └──────┬──────┘   └──────┬──────┘
     │                  │                 │                  │
     ▼                  ▼                 ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                       MetricsAPI                                  │
│  • getSummary()                                                  │
│  • getPerformance()                                              │
│  • getAlerts()                                                   │
│  • getTimeSeries()                                               │
│  • exportMetrics()                                               │
└──────────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────────────┐
│                    MetricsCollector                               │
│  • In-memory metrics storage                                     │
│  • Time-series aggregation                                       │
│  • Alert generation                                              │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### MetricsCollector
- ✅ Collect and aggregate metrics
- ✅ Calculate percentiles (P50, P95, P99)
- ✅ Manage time-series data (hourly/daily)
- ✅ Track strategy-specific metrics
- ✅ Generate alerts based on thresholds
- ✅ Automatic data retention and cleanup

### MetricsAPI
- ✅ Provide REST-style API interface
- ✅ Format responses consistently
- ✅ Calculate trends and insights
- ✅ Generate health status reports
- ✅ Export metrics in JSON format
- ✅ Manage alert thresholds

### EnhancedLogger
- ✅ Create structured log entries
- ✅ Generate correlation IDs
- ✅ Manage context for sessions
- ✅ Track operation start/end
- ✅ Query and filter logs
- ✅ Provide analytics and insights

### Dashboard Component
- ✅ Display real-time metrics
- ✅ Visualize trends with charts
- ✅ Show alerts with severity colors
- ✅ Provide export/reset controls
- ✅ Auto-refresh at intervals
- ✅ Responsive design

---

**Legend:**
- `┌─┐` = Component boundaries
- `│` = Data flow direction
- `├─►` = Conditional flow
- `▼` = Sequential flow
- `─┬─` = Split/parallel flow
