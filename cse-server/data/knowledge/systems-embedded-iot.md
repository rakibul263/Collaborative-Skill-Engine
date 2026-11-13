# Computer Systems, Operating Systems, Embedded Engineering & IoT

## 1. Computer Systems Architecture & Low-Level Foundations
- **Processor Architecture:** Von Neumann vs Harvard architecture, CPU registers, Instruction Pipeline (Fetch, Decode, Execute, Memory, Write-back), Pipeline hazards (Structural, Data, Control - Branch prediction), Cache Hierarchy (L1, L2, L3 cache lines, Cache coherency MESI protocol).
- **C & C++ Systems Programming:** Manual memory management (`malloc`, `free`, pointers, pointer arithmetic, memory leaks, buffer overflows), RAII in C++, smart pointers (`std::unique_ptr`, `std::shared_ptr`, `std::weak_ptr`), Memory layout of a process (Code segment, Data, BSS, Heap, Stack).
- **Modern Systems with Rust:** Ownership, Borrowing, Lifetimes (`'a`), Zero-cost abstractions, Concurrency safety without garbage collection, unsafe Rust boundaries.

## 2. Operating Systems Internals
- **Processes vs Threads:** PCB (Process Control Block), Context switching overhead, Fork-Exec model, Inter-Process Communication (IPC: Pipes, Shared memory, Message queues, UNIX domain sockets).
- **Concurrency & Synchronization:** Race conditions, Critical sections, Atomic operations (Compare-And-Swap), Mutexes, Spinlocks, Semaphores (Counting & Binary), Condition variables, Deadlocks (Coffman conditions, Banker's algorithm, Deadlock detection & recovery).
- **Virtual Memory & Paging:** Page tables, Multi-level paging, TLB (Translation Lookaside Buffer), Page faults, Page replacement algorithms (LRU, Clock, Optimal), Memory-mapped files (`mmap`).
- **File Systems & Storage:** Inodes, Superblocks, Journaling file systems (ext4, XFS), VFS (Virtual File System) abstraction.

## 3. Embedded Systems & Microcontrollers
- **Microcontrollers vs Microprocessors:** Arduino (AVR ATmega328P), ESP32 / ESP8266 (Tensilica dual-core, built-in Wi-Fi & Bluetooth BLE), ARM Cortex-M series (STM32).
- **Hardware Protocols:** GPIO (General Purpose Input/Output), UART (Universal Asynchronous Receiver-Transmitter), I2C (Inter-Integrated Circuit - two-wire, Master/Slave addressing), SPI (Serial Peripheral Interface - four-wire full-duplex), CAN bus (Controller Area Network for automotive/industrial).
- **Real-Time Operating Systems (RTOS):** FreeRTOS (Task scheduling, Preemption, Queues, Semaphores, Tickless idle mode for low-power operation), Hard real-time vs Soft real-time constraints.

## 4. Internet of Things (IoT) & Edge Computing
- **IoT Communication Protocols:** MQTT (Publish/Subscribe, lightweight, QoS 0/1/2, Last Will and Testament), CoAP (Constrained Application Protocol over UDP), WebSockets, LoRaWAN (Long Range Wide Area Network for low-power remote sensors).
- **Edge Computing & Embedded AI:** TinyML (TensorFlow Lite for Microcontrollers), Edge Impulse, Sensor fusion (IMU, Accelerometer, Gyroscope filtering via Kalman filters).

