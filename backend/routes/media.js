const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");

const Project = require("../models/Project");
const validateJwt = require("../middleware/validateJwt");

const router = express.Router();

const uploadsDirectory = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  }
});

const upload = multer({ storage });

const PRESET_FILTERS = {
  original: [],
  bw: ["hue=s=0"],
  sepia: ["colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"],
  vintage: [
    "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
    "eq=brightness=0.05:contrast=1.1:saturation=0.75"
  ],
  cool: [
    "colorbalance=bs=0.08:rs=-0.05",
    "eq=saturation=0.8"
  ],
  warm: [
    "colorbalance=rs=0.08:bs=-0.06",
    "eq=saturation=1.15"
  ]
};

const buildBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFilterChain = ({ preset, brightness, contrast, saturation }) => {
  const filters = [...(PRESET_FILTERS[preset] || PRESET_FILTERS.original)];

  filters.push(
    `eq=brightness=${brightness - 1}:contrast=${contrast}:saturation=${saturation}`
  );

  return filters.join(",");
};

router.post(
  "/process",
  validateJwt,
  upload.single("mediaFile"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No media file asset payload provided."
      });
    }

    const brightness = parseNumber(req.body.brightness, 1);
    const contrast = parseNumber(req.body.contrast, 1);
    const saturation = parseNumber(req.body.saturation, 1);
    const preset = req.body.preset || "original";
    const assetType =
      req.body.assetType ||
      (req.file.mimetype.startsWith("video") ? "video" : "photo");

    const originalFilename = req.file.filename;
    const editedFilename = `processed-${req.file.filename}`;
    const editedPath = path.join(uploadsDirectory, editedFilename);
    const baseUrl = buildBaseUrl(req);
    const originalAssetUrl = `${baseUrl}/uploads/${originalFilename}`;
    const editedAssetUrl = `${baseUrl}/uploads/${editedFilename}`;

    const project = new Project({
      GuestDeviceId: req.body.guestDeviceId || "authenticated_device",
      OwnerId: req.user?.sub || null,
      OriginalAssetUrl: originalAssetUrl,
      EditedAssetUrl: editedAssetUrl,
      OriginalFilename: originalFilename,
      EditedFilename: editedFilename,
      AssetType: assetType,
      MobileCanvasMetadata: {
        preset,
        brightness,
        contrast,
        saturation
      },
      Status: "rendering"
    });

    try {
      await project.save();

      ffmpeg(req.file.path)
        .outputOptions("-vf", buildFilterChain({ preset, brightness, contrast, saturation }))
        .output(editedPath)
        .on("end", async () => {
          project.Status = "completed";
          await project.save();

          return res.status(200).json({
            success: true,
            message: "Media export complete.",
            projectId: project._id,
            status: project.Status,
            originalAssetUrl,
            editedAssetUrl
          });
        })
        .on("error", async (error) => {
          console.error("FFmpeg execution worker engine crash:", error.message);

          project.Status = "draft";
          await project.save();

          return res.status(500).json({
            success: false,
            error: "Multimedia transcoding cycle failed."
          });
        })
        .run();
    } catch (error) {
      console.error("Core media router error context:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
