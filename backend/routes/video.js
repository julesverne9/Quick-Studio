const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Project = require("../models/Project");
const validateJwt = require("../middleware/validateJwt");
const { startRenderJob, buildBaseUrl } = require("../services/renderService");

const uploadsDirectory = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

// Configure disk storage for multi-part media uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `clip-${uniqueSuffix}${path.extname(file.originalname || ".mp4")}`);
  },
});

const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB max payload

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES },
});

// All video endpoints require authentication
router.use(validateJwt);

/**
 * @route   POST /api/video/render
 * @desc    Unified canonical timeline-based video render endpoint
 * @access  Private
 */
router.post("/render", upload.any(), async (req, res) => {
  try {
    let payload = req.body;

    // If sent via FormData with projectData JSON string
    if (typeof req.body.projectData === "string") {
      try {
        payload = JSON.parse(req.body.projectData);
      } catch (e) {
        console.warn("[Video Route] Failed to parse projectData JSON string:", e.message);
      }
    }

    const { projectId, name, tracks, durationMs, exportSettings } = payload;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: "projectId is required.",
      });
    }

    if (!tracks || !Array.isArray(tracks)) {
      return res.status(400).json({
        success: false,
        error: "tracks array is required for video compilation.",
      });
    }

    // Map uploaded files to item IDs or filenames
    const fileMap = {};
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        // fieldname may be 'file_<itemId>' or 'clip_<itemId>'
        if (file.fieldname.startsWith("file_")) {
          const itemId = file.fieldname.replace("file_", "");
          fileMap[itemId] = file.path;
        }
        fileMap[file.originalname] = file.path;
      });
    }

    // Cross-link sourceUris to uploaded files so multiple split clips from the same source file reuse the upload
    tracks.forEach((track) => {
      track.items?.forEach((item) => {
        if (fileMap[item.id] && item.sourceUri) {
          fileMap[item.sourceUri] = fileMap[item.id];
        }
      });
    });

    // Create the project record in MongoDB
    const project = new Project({
      GuestDeviceId: projectId,
      OwnerId: req.user?.sub || null,
      AssetType: "video",
      MobileCanvasMetadata: {
        name: name || "Untitled Video Project",
        trackCount: tracks.length,
        durationMs: durationMs || 0,
        exportSettings: exportSettings || {},
      },
      Status: "queued",
    });
    await project.save();

    const baseUrl = buildBaseUrl(req);
    const io = req.app.get("socketio");

    // Immediately notify client of job creation
    if (io) {
      io.emit("render-progress", {
        projectId: projectId, // Client project ID
        jobId: project._id.toString(), // Mongo Job ID
        progress: 0,
        status: "queued",
      });
    }

    // Launch the FFmpeg render job asynchronously in background
    startRenderJob({
      mongoProjectId: project._id,
      clientProjectId: projectId,
      tracks,
      durationMs,
      exportSettings,
      fileMap,
      io,
      baseUrl,
    });

    // Return non-blocking HTTP 200 response immediately
    return res.status(200).json({
      success: true,
      message: "Video render job queued successfully.",
      jobId: project._id,
      projectId: projectId,
      status: "queued",
    });
  } catch (error) {
    console.error("[Video Route] Render route error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to initialize video render job.",
    });
  }
});

/**
 * @route   POST /api/video/process
 * @desc    Single-clip legacy transform endpoint (redirected to unified renderService)
 * @access  Private
 */
router.post("/process", upload.single("videoFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No video asset payload found." });
    }

    const { guestDeviceId, filterId = "original", brightness = 1, contrast = 1, saturation = 1 } = req.body;
    const clientProjectId = `legacy-${Date.now()}`;

    // Wrap single file into standardized track format
    const tracks = [
      {
        id: "track-video-main",
        type: "video",
        name: "Main Video Track",
        items: [
          {
            id: "clip-0",
            type: "video",
            name: req.file.originalname || "Uploaded Clip",
            sourceUri: req.file.path,
            startOffsetMs: 0,
            durationMs: 10000,
            startCutMs: 0,
            endCutMs: 0,
            speed: 1.0,
            volume: 1.0,
            filterPreset: filterId,
            adjustments: {
              brightness: parseFloat(brightness),
              contrast: parseFloat(contrast),
              saturation: parseFloat(saturation),
            },
          },
        ],
      },
    ];

    const project = new Project({
      GuestDeviceId: guestDeviceId || req.user?.sub || "authenticated_device",
      OwnerId: req.user?.sub || null,
      AssetType: "video",
      MobileCanvasMetadata: { filterId, brightness, contrast, saturation },
      Status: "queued",
    });
    await project.save();

    const baseUrl = buildBaseUrl(req);
    const io = req.app.get("socketio");

    const fileMap = {
      "clip-0": req.file.path,
      [req.file.path]: req.file.path,
    };

    startRenderJob({
      mongoProjectId: project._id,
      clientProjectId: clientProjectId,
      tracks,
      durationMs: 10000,
      exportSettings: {},
      fileMap,
      io,
      baseUrl,
    });

    return res.status(200).json({
      success: true,
      message: "Video transformation pipeline queued successfully.",
      projectId: project._id,
      jobId: project._id,
      status: "queued",
    });
  } catch (error) {
    console.error("[Video Route] Process route error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
