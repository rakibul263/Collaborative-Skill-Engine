# Data Structures, Algorithms & Competitive Programming (DSA) Mastery

## 1. Algorithmic Complexity & Foundations
- **Asymptotic Notation:** Big-O, Big-Omega, Big-Theta; Time and space complexity trade-offs.
- **Recursion & Master Theorem:** Divide and conquer recurrences $T(n) = aT(n/b) + f(n)$.
- **Bit Manipulation:** Bitwise operators (&, |, ^, ~, <<, >>), Two's complement, Brian Kernighan's algorithm, XOR trick for unique element, subset generation via bitmasks.

## 2. Core & Advanced Data Structures
- **Linear Structures:** Dynamic Arrays, Singly & Doubly Linked Lists, Circular Queues, Deque, Monotonic Stacks (Next Greater Element), Monotonic Queues (Sliding Window Maximum).
- **Trees & Hierarchies:** Binary Search Trees (BST), AVL Trees & Red-Black Trees (Self-balancing invariants, rotations), Trie (Prefix Tree, Aho-Corasick), Segment Trees (Point updates, Range queries, Lazy Propagation), Fenwick Tree (Binary Indexed Tree).
- **Disjoint Set Union (DSU):** Union by rank/size, Path compression, Cycle detection in undirected graphs.
- **Heaps & Priority Queues:** Min-Heap, Max-Heap, Binary Heap properties, Median finding in a stream.

## 3. Algorithmic Paradigms & Patterns
- **Two Pointers & Sliding Window:** Opposite direction, Same direction, Variable length window, Fixed length window.
- **Binary Search on Answer:** Monotonic search spaces, Lower bound / Upper bound implementations, Capacity scheduling problems.
- **Graph Algorithms:**
  - Traversal: BFS (Shortest path in unweighted graph), DFS (Connected components, Cycle detection, Topological sort via Kahn's / DFS).
  - Shortest Paths: Dijkstra (Non-negative weights, $O((V+E)\log V)$), Bellman-Ford (Negative weights, Negative cycle detection), Floyd-Warshall ($O(V^3)$ All-pairs).
  - Minimum Spanning Tree: Kruskal (with DSU), Prim's algorithm.
  - Bridge & Articulation Points: Tarjan's bridge-finding algorithm, Strongly Connected Components (Kosaraju, Tarjan).
  - Network Flow: Ford-Fulkerson, Edmonds-Karp, Dinic's algorithm.
- **Dynamic Programming (DP):**
  - Patterns: 0/1 Knapsack, Unbounded Knapsack, Longest Common Subsequence (LCS), Longest Increasing Subsequence (LIS $O(n\log n)$ with patience sorting), Matrix Chain Multiplication, Digit DP, Bitmask DP (Traveling Salesman Problem), DP on Trees.
  - State design, Transition equations, Base cases, Space optimization (Tabulation rolling arrays).
- **String Algorithms:** KMP (Knuth-Morris-Pratt $\pi$-table), Rabin-Karp polynomial rolling hash, Z-algorithm, Suffix Arrays.

## 4. Competitive Programming Strategy (Codeforces, LeetCode, ICPC)
- Rating Progression: Division 4 (Fundamentals) -> Division 3 (DSA Implementations) -> Division 2 (Complex DP & Graphs) -> Division 1.
- Benchmarks: LeetCode Medium/Hard for FAANG/Tier-1 interviews; Fast I/O in C++ (`ios_base::sync_with_stdio(false); cin.tie(NULL);`).

