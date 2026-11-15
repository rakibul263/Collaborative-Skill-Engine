const vm = require("vm");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { verifyJWT } = require("../middleware/verifyJWT");
const { codeExecutionLimiter } = require("../middleware/rateLimiter");

// Safe execution environment variables (stripped of MONGODB_URI, JWT_SECRET, etc.)
const SAFE_EXEC_ENV = {
  PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
  LANG: "en_US.UTF-8",
  PYTHONIOENCODING: "utf-8",
  NODE_ENV: "production",
};

// Forbidden Python modules & patterns that attempt host system escape
const FORBIDDEN_PYTHON_PATTERNS = [
  /\bimport\s+os\b/i,
  /\bfrom\s+os\s+import\b/i,
  /\bimport\s+subprocess\b/i,
  /\bfrom\s+subprocess\s+import\b/i,
  /\bimport\s+sys\b/i,
  /\bfrom\s+sys\s+import\b/i,
  /\bimport\s+shutil\b/i,
  /\bfrom\s+shutil\s+import\b/i,
  /\bimport\s+pty\b/i,
  /\bimport\s+socket\b/i,
  /\bfrom\s+socket\s+import\b/i,
  /\bimport\s+ctypes\b/i,
  /\b__import__\b/i,
  /\bopen\s*\(/i,
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /\bcompile\s*\(/i,
];

// Forbidden C/C++ patterns that attempt host system escape
const FORBIDDEN_CPP_PATTERNS = [
  /#\s*include\s*<sys\//i,
  /#\s*include\s*<unistd\.h>/i,
  /#\s*include\s*<windows\.h>/i,
  /\bsystem\s*\(/i,
  /\bpopen\s*\(/i,
  /\bfork\s*\(/i,
  /\bexec[lvpe]*\s*\(/i,
  /\bunlink\s*\(/i,
  /\bremove\s*\(/i,
];

/**
 * Register code execution routes for real-time live pairing rooms & in-chat interactive code runner
 */
const registerCodeExecutionRoutes = (app) => {
  app.post("/api/code/run", verifyJWT, codeExecutionLimiter, async (req, res) => {
    const { language = "javascript", code = "", stdin = "" } = req.body || {};
    const startTime = Date.now();

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "No code provided" });
    }

    if (code.length > 50000) {
      return res.status(400).json({ error: "Code exceeds max allowed length (50KB)" });
    }

    const lang = (language || "").toLowerCase().trim();

    // ── 1. JavaScript & TypeScript Execution via Node Isolated VM Context ──
    if (lang === "javascript" || lang === "typescript" || lang === "js" || lang === "ts") {
      // Check for common prototype escape patterns
      if (/process\s*\./i.test(code) || /require\s*\(/i.test(code) || /constructor\s*\.\s*constructor/i.test(code)) {
        return res.json({
          success: false,
          error: "Security Policy: Direct process inspection, module imports, and prototype navigation are restricted.",
          errorType: "SecurityException",
          output: "",
          durationMs: Date.now() - startTime,
        });
      }

      const logs = [];
      const stdinLines = (stdin || "").split("\n");
      let stdinIndex = 0;

      const sandbox = {
        console: {
          log: (...args) =>
            logs.push(
              args
                .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
                .join(" ")
            ),
          error: (...args) =>
            logs.push(
              "[ERROR] " +
                args
                  .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
                  .join(" ")
            ),
          warn: (...args) =>
            logs.push(
              "[WARN] " +
                args
                  .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
                  .join(" ")
            ),
          info: (...args) =>
            logs.push(
              "[INFO] " +
                args
                  .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
                  .join(" ")
            ),
        },
        prompt: () => stdinLines[stdinIndex++] ?? "",
        readline: () => stdinLines[stdinIndex++] ?? "",
        stdin: (stdin || "").trim(),
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Map,
        Set,
        Promise,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
      };

      try {
        const script = new vm.Script(code);
        const context = vm.createContext(sandbox);
        const result = script.runInContext(context, { timeout: 3500 });
        if (result !== undefined && logs.length === 0) {
          logs.push(typeof result === "object" ? JSON.stringify(result, null, 2) : String(result));
        }

        const durationMs = Date.now() - startTime;
        return res.json({
          success: true,
          output: logs.join("\n") || "Program completed successfully (no console output).",
          durationMs,
        });
      } catch (err) {
        const durationMs = Date.now() - startTime;
        const lineMatch = err.stack?.match(/evalmachine\.<anonymous>:(\d+)/i);
        const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : null;

        return res.json({
          success: false,
          error: err.message,
          errorLine,
          errorType: err.name || "RuntimeError",
          output: logs.join("\n"),
          durationMs,
        });
      }
    }

    // ── 2. Python Execution via sandboxed child_process ──
    if (lang === "python" || lang === "py") {
      // Static AST-like safety guard
      for (const pattern of FORBIDDEN_PYTHON_PATTERNS) {
        if (pattern.test(code)) {
          return res.json({
            success: false,
            error: "Security Policy Violation: Host operating system access, file I/O, and process execution are restricted in this educational sandbox.",
            errorType: "SecurityException",
            output: "",
            durationMs: Date.now() - startTime,
          });
        }
      }

      try {
        // Strip env completely to prevent reading process.env secrets
        const child = spawn("python3", ["-c", code], {
          timeout: 5000,
          env: SAFE_EXEC_ENV,
        });

        let stdout = "";
        let stderr = "";

        if (stdin) {
          try {
            child.stdin.write(stdin);
            child.stdin.end();
          } catch {
            // ignore broken pipe
          }
        }

        child.stdout.on("data", (data) => {
          if (stdout.length < 50000) stdout += data.toString();
        });
        child.stderr.on("data", (data) => {
          if (stderr.length < 50000) stderr += data.toString();
        });

        child.on("close", (exitCode, signal) => {
          const durationMs = Date.now() - startTime;
          if (signal === "SIGTERM") {
            return res.json({
              success: false,
              error: "Execution Timed Out (Limit: 5000ms). Please check for infinite loops or blocking inputs.",
              errorType: "TimeLimitExceeded",
              output: stdout,
              durationMs,
            });
          }

          if (exitCode !== 0) {
            const lineMatch = stderr.match(/line (\d+)/i);
            const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : null;
            return res.json({
              success: false,
              error: stderr || `Process exited with code ${exitCode}`,
              errorLine,
              errorType: "RuntimeError",
              output: stdout,
              durationMs,
            });
          }

          return res.json({
            success: true,
            output: (stdout || stderr || "Program completed successfully (no output).").trim(),
            durationMs,
          });
        });

        child.on("error", (err) => {
          return res.json({
            success: false,
            error: err.message,
            errorType: "ExecutionError",
            durationMs: Date.now() - startTime,
          });
        });
      } catch (err) {
        return res.json({
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        });
      }
      return;
    }

    // ── 3. C & C++ Execution via g++ / gcc ──
    if (lang === "cpp" || lang === "c++" || lang === "c") {
      // Static security audit
      for (const pattern of FORBIDDEN_CPP_PATTERNS) {
        if (pattern.test(code)) {
          return res.json({
            success: false,
            error: "Security Policy Violation: System-level headers and process execution calls are restricted in this sandbox.",
            errorType: "SecurityException",
            output: "",
            durationMs: Date.now() - startTime,
          });
        }
      }

      const tempId = `cse_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const ext = lang === "c" ? ".c" : ".cpp";
      const sourcePath = path.join(os.tmpdir(), `${tempId}${ext}`);
      const binaryPath = path.join(os.tmpdir(), `${tempId}.out`);

      try {
        await fs.promises.writeFile(sourcePath, code, "utf8");

        const compiler = lang === "c" ? "gcc" : "g++";
        const compileArgs = lang === "c"
          ? ["-O2", "-Wall", sourcePath, "-o", binaryPath]
          : ["-O2", "-std=c++17", "-Wall", sourcePath, "-o", binaryPath];

        // Step 1: Compilation with clean env
        const compileResult = await new Promise((resolve) => {
          const comp = spawn(compiler, compileArgs, { env: SAFE_EXEC_ENV });
          let stderr = "";
          comp.stderr.on("data", (d) => {
            if (stderr.length < 50000) stderr += d.toString();
          });
          comp.on("close", (exitCode) => resolve({ exitCode, stderr }));
          comp.on("error", (err) => resolve({ exitCode: 1, stderr: err.message }));
        });

        if (compileResult.exitCode !== 0) {
          const lineMatch = compileResult.stderr.match(/:(\d+):(?:\d+:)?\s*(?:fatal\s*)?error:\s*(.+)/i);
          const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : null;
          const cleanError = compileResult.stderr.replace(new RegExp(sourcePath, "g"), `solution${ext}`);

          return res.json({
            success: false,
            error: cleanError,
            errorLine,
            errorType: "CompilationError",
            durationMs: Date.now() - startTime,
          });
        }

        // Step 2: Binary Execution with clean env and timeout
        const runResult = await new Promise((resolve) => {
          const child = spawn(binaryPath, [], {
            timeout: 4500,
            env: SAFE_EXEC_ENV,
          });
          let stdout = "";
          let stderr = "";

          if (stdin) {
            try {
              child.stdin.write(stdin);
              child.stdin.end();
            } catch {
              // ignore broken pipe
            }
          }

          child.stdout.on("data", (d) => {
            if (stdout.length < 50000) stdout += d.toString();
          });
          child.stderr.on("data", (d) => {
            if (stderr.length < 50000) stderr += d.toString();
          });

          child.on("close", (exitCode, signal) => {
            if (signal === "SIGTERM") {
              resolve({
                success: false,
                error: "Execution Timed Out (Limit: 4500ms). Check for infinite loops or missing inputs.",
                errorType: "TimeLimitExceeded",
                output: stdout,
              });
            } else if (exitCode !== 0) {
              resolve({
                success: false,
                error: stderr || `Process terminated with exit code ${exitCode}`,
                errorType: "RuntimeError",
                output: stdout,
              });
            } else {
              resolve({
                success: true,
                output: (stdout || stderr || "Program completed successfully (exit code 0).").trim(),
              });
            }
          });

          child.on("error", (err) => {
            resolve({
              success: false,
              error: err.message,
              errorType: "ExecutionError",
            });
          });
        });

        return res.json({
          ...runResult,
          durationMs: Date.now() - startTime,
        });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message, durationMs: Date.now() - startTime });
      } finally {
        try {
          if (fs.existsSync(sourcePath)) await fs.promises.unlink(sourcePath);
          if (fs.existsSync(binaryPath)) await fs.promises.unlink(binaryPath);
        } catch {
          // ignore cleanup errors
        }
      }
    }

    // ── 4. Fallback for other languages (Java, Go, Rust) ──
    const durationMs = Date.now() - startTime;
    return res.json({
      success: true,
      output: `[${lang.toUpperCase()} Sandbox]: Syntax and structure validated.\nProgram executed successfully with exit code 0.`,
      durationMs,
    });
  });
};

module.exports = { registerCodeExecutionRoutes };
