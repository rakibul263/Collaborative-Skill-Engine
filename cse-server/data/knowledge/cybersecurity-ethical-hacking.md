# Comprehensive Cybersecurity & Ethical Hacking Engineering Roadmap

## Core Domains
1. **Network & Protocol Security:**
   - Deep mastery of the OSI model and TCP/IP stack: TCP 3-way handshake, UDP, DNS, DHCP, TLS/SSL (v1.2, v1.3 handshake & cipher suites), HTTP/1.1 vs HTTP/2 & HTTP/3 (QUIC).
   - Packet Inspection: Wireshark deep packet analysis, tcpdump, Nmap network scanning (SYN scan, ACK scan, Service version detection, NSE scripts).
   - Firewalls, IDS/IPS (Suricata, Snort), WAF (Cloudflare, AWS WAF, ModSecurity).

2. **Web Application Security (OWASP Top 10):**
   - **Injection:** SQL Injection (Union-based, Boolean-based, Blind time-based), Command Injection, NoSQL Injection, LDAP Injection.
   - **Broken Authentication & Session Management:** JWT vulnerabilities (None algorithm, weak secrets, key confusion, signature stripping), Session fixation, CSRF, OAuth 2.0 / OIDC security misconfigurations.
   - **XSS (Cross-Site Scripting):** Stored XSS, Reflected XSS, DOM-based XSS; Content Security Policy (CSP) bypass analysis.
   - **Access Control:** IDOR (Insecure Direct Object Reference), Privilege Escalation (Horizontal & Vertical), BOLA (Broken Object Level Authorization in APIs).
   - **SSRF (Server-Side Request Forgery):** Cloud metadata exploitation (AWS 169.254.169.254, GCP metadata header).

3. **Cryptography & Security Engineering:**
   - Symmetric Encryption: AES-GCM (Authenticated Encryption), AES-CBC (Padding Oracle vulnerabilities), ChaCha20-Poly1305.
   - Asymmetric Encryption & Key Exchange: RSA, Diffie-Hellman, ECDH (Elliptic Curve), Ed25519 digital signatures.
   - Cryptographic Hashing & Passwords: SHA-256, SHA-512, bcrypt, Argon2id, PBKDF2; rainbow table defenses with high-entropy salts.
   - PKI (Public Key Infrastructure), Certificate Authorities (CAs), mTLS (Mutual TLS for zero-trust microservices).

4. **Offensive & Defensive Security Operations:**
   - **Penetration Testing:** Reconnaissance (OSINT, subfinder, amass, ffuf), exploitation frameworks (Metasploit, Burp Suite Professional, OWASP ZAP), post-exploitation and privilege escalation (LinPEAS, WinPEAS).
   - **SOC & Incident Response:** SIEM platforms (Splunk, Elastic SIEM), MITRE ATT&CK framework mapping, memory forensics (Volatility), reverse engineering (Ghidra, IDA Pro).
   - **DevSecOps:** SAST (SonarQube, Semgrep), DAST (OWASP ZAP), SCA (Snyk, Dependabot), container image scanning (Trivy).

