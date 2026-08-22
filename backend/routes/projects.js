const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const path = require("path");
const fs = require("fs");

const Project = require("../models/Project");
const validateJwt = require("../middleware/validateJwt");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const router = express.Router();
const uploadsDirectory = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDirectory),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `project-${uniqueSuffix}${path.extname(file.originalname || ".jpg")}`
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const PRESET_FILTERS = {
  original: [],
  bw: ["hue=s=0"],
  sepia: [
    "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
  ],
  vintage: [
    "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131",
    "eq=brightness=0.05:contrast=1.1:saturation=0.75",
  ],
  cool: ["colorbalance=bs=0.08:rs=-0.05", "eq=saturation=0.8"],
  warm: ["colorbalance=rs=0.08:bs=-0.06", "eq=saturation=1.15"],
  negative: ["lutrgb=r=negval:g=negval:b=negval"],
  vignette: ["vignette=PI/4"],
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildBaseUrl = (req) => {
  const configuredUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;

  // Render terminates TLS before forwarding to Express, so req.protocol can
  // be "http" even though the phone must use the public HTTPS endpoint.
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0];
  return `${forwardedProtocol || req.protocol}://${req.get("host")}`;
};

const buildFilterChain = ({
  preset,
  brightness,
  contrast,
  saturation,
  rotation,
  flipped,
}) => {
  const filters = [...(PRESET_FILTERS[preset] || PRESET_FILTERS.original)];

  filters.push(
    `eq=brightness=${brightness - 1}:contrast=${contrast}:saturation=${saturation}`
  );

  if (flipped) {
    filters.push("hflip");
  }

  if (rotation === 90) {
    filters.push("transpose=1");
  } else if (rotation === 180) {
    filters.push("transpose=1", "transpose=1");
  } else if (rotation === 270) {
    filters.push("transpose=2");
  }

  return filters.join(",");
};

router.post(
  "/render",
  validateJwt,
  upload.single("mediaFile"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A media file is required to start rendering.",
      });
    }

    const brightness = parseNumber(req.body.brightness, 1);
    const contrast = parseNumber(req.body.contrast, 1);
    const saturation = parseNumber(req.body.saturation, 1);
    const rotation = parseNumber(req.body.rotation, 0);
    const preset = req.body.preset || "original";
    const flipped = String(req.body.flipped).toLowerCase() === "true";
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
      GuestDeviceId:
        req.body.guestDeviceId || req.user?.sub || "authenticated_device",
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
        saturation,
        rotation,
        flipped,
        scale: parseNumber(req.body.scale, 1),
        cropX: parseNumber(req.body.cropX, null),
        cropY: parseNumber(req.body.cropY, null),
        cropWidth: parseNumber(req.body.cropWidth, null),
        cropHeight: parseNumber(req.body.cropHeight, null),
      },
      Status: "rendering",
    });

    try {
      await project.save();

      ffmpeg(req.file.path)
        .outputOptions(
          "-vf",
          buildFilterChain({
            preset,
            brightness,
            contrast,
            saturation,
            rotation,
            flipped,
          })
        )
        .output(editedPath)
        .on("end", async () => {
          project.Status = "completed";
          await project.save();

          return res.status(200).json({
            success: true,
            message: "Render job completed successfully.",
            projectId: project._id,
            status: project.Status,
            originalAssetUrl,
            editedAssetUrl,
            renderJob: {
              id: project._id,
              accepted: true,
              acceptedAt: project.createdAt,
              completedAt: project.updatedAt,
              assetType,
            },
          });
        })
        .on("error", async (error) => {
          console.error("Project render failed:", error.message);
          project.Status = "draft";
          await project.save();

          return res.status(500).json({
            success: false,
            message: "Project render failed.",
            error: error.message,
            renderJob: {
              id: project._id,
              accepted: true,
              assetType,
            },
          });
        })
        .run();
    } catch (error) {
      console.error("Project route error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to start render job.",
        error: error.message,
      });
    }
  }
);

module.exports = router;
