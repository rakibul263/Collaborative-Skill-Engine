const multer = require("multer");
const { parseCv, suggestLearnFromCv } = require("../services/cvParser.service");
const { verifyJWT } = require("../middleware/verifyJWT");

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || "").toLowerCase();
    const hasAllowedExt = ALLOWED_EXTENSIONS.some((allowed) =>
      ext.endsWith(allowed),
    );
    const allowedMime = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/octet-stream",
      "binary/octet-stream",
    ];

    if (hasAllowedExt || allowedMime.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only PDF, DOCX, and TXT files are allowed."));
  },
});

const registerCvParserRoutes = (app) => {
  app.post(
    "/parse-cv",
    verifyJWT,
    (req, res, next) => {
      upload.single("cv")(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            message:
              err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
                ? "CV file is too large. Maximum size is 5MB."
                : err.message || "CV upload failed.",
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "CV file is required." });
        }

        const suggestLearn = req.body.suggestLearn === "true";
        let teachSkills = [];
        if (req.body.teachSkills) {
          try {
            teachSkills = JSON.parse(req.body.teachSkills);
          } catch {
            teachSkills = [];
          }
        }

        const result = await parseCv({
          file: req.file,
          suggestLearn,
          teachSkills,
        });

        res.json(result);
      } catch (error) {
        console.error("[parse-cv]", error.message);
        res.status(400).json({ message: error.message || "CV parsing failed." });
      }
    },
  );

  app.post("/parse-cv/suggest-learn", verifyJWT, async (req, res) => {
    try {
      const { cvText, teachSkills = [] } = req.body;

      if (!cvText?.trim()) {
        return res
          .status(400)
          .json({ message: "CV text is required for suggestions." });
      }

      const result = await suggestLearnFromCv({ cvText, teachSkills });
      res.json(result);
    } catch (error) {
      console.error("[parse-cv/suggest-learn]", error.message);
      res
        .status(400)
        .json({ message: error.message || "Suggestion failed." });
    }
  });
};

module.exports = { registerCvParserRoutes };
