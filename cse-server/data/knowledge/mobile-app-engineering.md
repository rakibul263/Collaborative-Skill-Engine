# Mobile Application Engineering & Cross-Platform Systems

## 1. Cross-Platform Frameworks
- **React Native:**
  - Architecture: Old Bridge architecture (JSON serialization over async bridge) vs New Architecture (TurboModules for synchronous C++ JSI calls, Fabric Renderer, Codegen, Hermes JavaScript engine).
  - State Management: Redux Toolkit, Zustand, TanStack Query (React Query) for server state caching.
  - Native Navigation: React Navigation (Stack, Tabs, Drawer), Native stack navigator performance benefits.
- **Flutter & Dart:**
  - Architecture: Skia / Impeller 2D graphics rendering engine directly to platform canvas (no native widget translation overhead), AOT (Ahead-Of-Time) compiled ARM machine code.
  - State Management: BLoC (Business Logic Component with Streams), Riverpod (compile-safe dependency injection), Provider.
  - Widget Tree: StatelessWidget, StatefulWidget, RenderObject, Element tree, Hot Reload mechanism.

## 2. Native Mobile Engineering
- **Android (Kotlin):**
  - Jetpack Compose declarative UI, ViewModel, LiveData / StateFlow, Coroutines & Flow for asynchronous tasks, Room Database (SQLite ORM), Hilt / Dagger dependency injection, WorkManager for background processing.
- **iOS (Swift):**
  - SwiftUI declarative UI, Combine framework, Swift Concurrency (`async`/`await`, Actors for thread safety), CoreData / SwiftData, URLSession, BackgroundTasks framework.

## 3. Production Mobile Architecture & Best Practices
- **Offline-First Synchronization:** Local persistence via SQLite, WatermelonDB (reactive SQLite for React Native), Realm; Optimistic UI updates, Conflict resolution strategies (Last-Write-Wins, CRDTs).
- **Deep Linking & Universal Links:** Android App Links (assetlinks.json), iOS Universal Links (apple-app-site-association), Custom URL schemes.
- **Push Notifications:** Firebase Cloud Messaging (FCM), Apple Push Notification service (APNs), notification payload handling in foreground, background, and killed states.
- **Performance Profiling:** Memory leaks (leakcanary), FPS profiling (target 60/120fps), App bundle size reduction (ProGuard, R8 shrinking, Dynamic Feature Modules).

