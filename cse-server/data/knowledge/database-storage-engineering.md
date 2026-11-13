# Database Engineering, Storage Engines & Data Architecture

## 1. Relational Database Internals (RDBMS / PostgreSQL & MySQL)
- **ACID Transaction Guarantees:**
  - **Atomicity:** All-or-nothing execution via WAL (Write-Ahead Logging) and undo logs.
  - **Consistency:** Database schema constraints, foreign keys, assertions.
  - **Isolation Levels & Anomalies:** Read Uncommitted (Dirty read), Read Committed (Non-repeatable read), Repeatable Read (Phantom read), Serializable. Implementation: MVCC (Multi-Version Concurrency Control) and 2PL (Two-Phase Locking).
  - **Durability:** Fsync, WAL flushing to disk, checkpointing mechanisms.
- **Indexing Data Structures:**
  - B-Trees & $B^+$ Trees: Balanced height, fan-out, branch nodes, leaf node linked lists for range scans ($O(\log N)$ point lookup, sequential disk I/O).
  - Hash Indexes ($O(1)$ equality only).
  - LSM-Trees (Log-Structured Merge-Trees used in RocksDB, Cassandra): Write amplification vs Read amplification, MemTable (in-memory skiplist), Commit Log, SSTables (Sorted String Tables) on disk, Compaction (Size-tiered vs Leveled), Bloom filters for fast non-existence checks.
  - GIN (Generalized Inverted Index) for full-text search and JSONB containment in PostgreSQL; GiST and SP-GiST for spatial/geometric data.
- **Query Optimization & Execution Plans:**
  - `EXPLAIN ANALYZE`: Seq Scan (COLLSCAN) vs Index Scan vs Index Only Scan vs Bitmap Index Scan.
  - Join Algorithms: Nested Loop Join ($O(M \times N)$), Hash Join ($O(M + N)$ with build & probe phases), Merge Join (requires sorted inputs, $O(M \log M + N \log N)$).

## 2. NoSQL & Distributed Databases
- **Document Stores:** MongoDB (BSON format, WiredTiger storage engine, WiredTiger cache, replica sets with Raft-like election, oplog replication, sharded clusters with mongos query router and config servers).
- **Key-Value & In-Memory:** Redis (Single-threaded event loop, RESP protocol, in-memory data structures: Strings, Hashes, Lists, Sets, Sorted Sets with Skiplist, HyperLogLog, Streams, Persistence: RDB snapshots & AOF append-only file with fsync policies).
- **Wide-Column Stores:** Apache Cassandra / ScyllaDB (Masterless architecture, Dynamo ring topology, Consistent hashing, Tunable consistency: ONE, QUORUM, ALL).
- **Graph Databases:** Neo4j (Index-free adjacency, Cypher query language, Graph traversals).

## 3. Vector Databases for AI & Embeddings
- Vector Indexing algorithms: HNSW (Hierarchical Navigable Small World graphs - high recall, low latency), IVF-PQ (Inverted File with Product Quantization - compressed memory footprint), Annoy.
- Distance Metrics: Cosine Similarity, Euclidean Distance (L2), Dot Product / Inner Product.
- Tools: Pinecone, Qdrant, Milvus, ChromaDB, pgvector (PostgreSQL vector extension), Atlas Vector Search.

