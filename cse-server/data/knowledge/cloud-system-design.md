# High-Level & Low-Level System Design (HLD/LLD) & Distributed Systems

## 1. Core Distributed Systems Principles
- **CAP Theorem & PACELC Theorem:** Consistency, Availability, Partition Tolerance; Latency vs Consistency trade-offs in distributed networks.
- **Consistency Models:** Strong Consistency, Linearizability, Sequential Consistency, Eventual Consistency, Read-After-Write Consistency, Monotonic Reads.
- **Consensus & Coordination:** Raft consensus algorithm (Leader election, Log replication), Paxos, Gossip Protocol, Apache ZooKeeper, etcd.
- **Clock Synchronization & Ordering:** Lamport timestamps, Vector clocks, NTP drift, TrueTime (Google Spanner).

## 2. Scalability Architecture & Building Blocks
- **Load Balancing:** Layer 4 (Transport TCP/UDP via IPVS/HAProxy) vs Layer 7 (Application HTTP/HTTPS via Nginx, Envoy, AWS ALB). Algorithms: Round Robin, Weighted Least Connections, Consistent Hashing (Virtual nodes for minimal remapping on node failure).
- **Caching Strategies:**
  - Cache-Aside (Lazy loading), Write-Through, Write-Behind (Write-Back), Refresh-Ahead.
  - Eviction Policies: LRU (Least Recently Used), LFU, FIFO.
  - Cache Invalidation & Stampede (Thundering herd problem): Cache stampede locks, Probabilistic early expiration (XFetch).
  - Distributed Caching: Redis Cluster, Memcached.
- **Message Queues & Event-Driven Architecture:**
  - Kafka (Distributed commit log, Consumer groups, Partitions, Offsets, Exactly-once semantics via transactional producers), RabbitMQ (AMQP, Exchanges: Direct, Fanout, Topic, Dead-letter exchanges).
- **Database Scaling & Partitioning:**
  - Vertical vs Horizontal scaling (Sharding).
  - Sharding Keys: Range-based sharding, Hash-based sharding, Directory-based sharding; Cross-shard joins & transactions (2PC - Two Phase Commit, Saga Pattern).
  - Read Replicas & Replication Lag, Master-Slave vs Master-Master replication.

## 3. Real-World System Design Case Studies
- **URL Shortener (e.g. TinyURL):** Base62 encoding, MD5/SHA-256 collision handling, Token service / range allocation for scale.
- **Chat System (e.g. WhatsApp / Slack):** WebSockets, Socket.io, Long polling, Redis Pub/Sub, Presence system (Heartbeat intervals), Message storage in Cassandra / MongoDB.
- **Rate Limiter:** Token Bucket, Leaky Bucket, Fixed Window Counter, Sliding Window Log, Sliding Window Counter (Redis Sorted Sets).
- **Video Streaming (e.g. Netflix / YouTube):** Adaptive Bitrate Streaming (HLS, MPEG-DASH), Transcoding pipeline, CDN edge caching.
- **Distributed Unique ID Generator:** Twitter Snowflake (Timestamp + Datacenter ID + Worker ID + Sequence number).

