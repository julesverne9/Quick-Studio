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

const heicConvert = require("heic-convert");

const ensureJpegIfHeif = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = await fs.promises.readFile(filePath);

    // Check extension or HEIF magic header bytes in first 32 bytes
    const isHeifExt = ext === ".heic" || ext === ".heif";
    const headerStr = buffer.slice(0, 32).toString("latin1");
    const isHeifHeader = headerStr.includes("ftyp") && /heic|heix|hevc|mif1|msf1/i.test(headerStr);

    if (isHeifExt || isHeifHeader) {
      console.log(`[HEIC Conversion] Converting ${filePath} to standard JPEG...`);
      const jpegBuffer = await heicConvert({
        buffer: buffer,
        format: "JPEG",
        quality: 0.92,
      });

      const newPath = filePath.replace(/\.(heic|heif)$/i, "") + "-converted.jpg";
      await fs.promises.writeFile(newPath, jpegBuffer);
      fs.unlink(filePath, () => {});
      return newPath;
    }
  } catch (err) {
    console.warn(`[HEIC Conversion Warning] Skipped HEIF conversion: ${err.message}`);
  }
  return filePath;
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

    let inputFilePath = req.file.path;
    const isPhoto = req.file.mimetype.startsWith("image") || req.file.originalname?.match(/\.(jpg|jpeg|png|heic|heif|webp)$/i);
    if (isPhoto) {
      inputFilePath = await ensureJpegIfHeif(inputFilePath);
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

    let layers = [];
    try {
      if (req.body.layers) {
        layers = JSON.parse(req.body.layers);
      }
    } catch (err) {
      console.warn("Failed to parse layers:", err.message);
    }

    const originalFilename = path.basename(inputFilePath);
    const editedFilename = `processed-${originalFilename.replace(/\.(jpg|jpeg|png|heic|heif)$/i, ".jpg")}`;
    const editedPath = path.join(uploadsDirectory, editedFilename);
    const baseUrl = buildBaseUrl(req);
    const originalAssetUrl = `${baseUrl}/uploads/${originalFilename}`;
    const editedAssetUrl = `${baseUrl}/uploads/${editedFilename}`;

    const project = new Project({
      GuestDeviceId:
        req.body.guestDeviceId || req.user?.sub || "authenticated_device",
      OwnerId: req.user?.sub || null,
      Name: req.body.name || `Project ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
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

      const command = ffmpeg(inputFilePath);
      const baseFilter = buildFilterChain({ preset, brightness, contrast, saturation, rotation, flipped });

      if (layers.length > 0) {
        // Complex filter logic for compositing layers
        // Each layer needs to be an input
        layers.forEach(layer => {
          command.input(layer.uri);
        });

        let filterString = `[0:v]${baseFilter}[base];`;
        let lastOutput = '[base]';

        layers.forEach((layer, index) => {
          const inputLabel = `[${index + 1}:v]`;
          const outputLabel = `[v${index + 1}]`;

          // scale2ref is great for high-quality overlays relative to base image size
          // We use percentage-based coordinates from the mobile app (x,y is center)
          const size = 0.2 * layer.scale; // Base size is 20% of image width
          filterString += `${inputLabel}${lastOutput}scale2ref=w=main_w*${size}:h=-1[ovrl${index}][ref${index}];`;

          // Calculate x,y based on percentage (center-aligned in app)
          // App uses x,y as center of 80px block. We'll simplify to top-left for ffmpeg overlay.
          const x = `(W*${layer.x}/100)-(w/2)`;
          const y = `(H*${layer.y}/100)-(h/2)`;

          filterString += `[ref${index}][ovrl${index}]overlay=x='${x}':y='${y}'${outputLabel};`;
          lastOutput = outputLabel;
        });

        command.complexFilter(filterString.slice(0, -1)); // remove trailing semicolon
      } else {
        command.outputOptions("-vf", baseFilter);
      }

      command
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

/**
 * @route   PATCH /api/projects/:id
 * @desc    Update project name
 * @access  Private
 */
router.patch("/:id", validateJwt, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Project name is required." });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Check ownership
    if (project.OwnerId && project.OwnerId.toString() !== req.user.sub) {
      return res.status(403).json({ success: false, message: "You do not have permission to rename this project." });
    }

    project.Name = name;

    // Also sync the name in metadata if it exists
    if (project.MobileCanvasMetadata) {
      project.MobileCanvasMetadata.name = name;
      project.markModified("MobileCanvasMetadata");
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Project renamed successfully.",
      project: {
        id: project._id,
        name: project.Name
      }
    });
  } catch (error) {
    console.error("Rename project error:", error);
    return res.status(500).json({ success: false, message: "Failed to rename project.", error: error.message });
  }
});

module.exports = router;
