const express = require('express');
const router = express.Router();
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const Project = require('../models/project');

// Inject the automatically downloaded static binary path straight into fluent-ffmpeg
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configure storage configuration rules
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Map frontend filter preset IDs directly to high-fidelity FFmpeg filtergraph strings
const GET_VIDEO_FILTER_STRING = (filterId, brightness = 1, contrast = 1, saturation = 1) => {
    let filters = [];

    // 1. Process Preset Rule Layouts
    switch (filterId) {
        case 'bw':
        case 'true-bw':
            // High-fidelity standard luminance channels matrix
            filters.push('colorchannelmixer=.2126:.7152:.0722:0:.2126:.7152:.0722:0:.2126:.7152:.0722');
            break;
        case 'sepia':
            // Industry standard sepia tone mixing matrix parameters
            filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
            break;
        case 'vintage':
            // Warm sepia tint mixed with slightly elevated contrast boundaries
            filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
            filters.push('eq=contrast=1.1:brightness=0.05');
            break;
        case 'cool':
            // Blue channel boost + subtle desaturation
            filters.push('colorchannelmixer=1:0:0:0:0:1:0:0:0:0:1.1:0');
            break;
        case 'warm':
            // Red/Green channel boost for classic color profile warmth
            filters.push('colorchannelmixer=1.1:0:0:0:0:1.05:0:0:0:0:0.95:0');
            break;
        case 'negative':
        case 'negate':
            // Directly invert RGB channel pixel values (0 -> 255, 255 -> 0)
            filters.push('lutrgb=r=negval:g=negval:b=negval');
            break;
        case 'vignette':
            // Darkens outer edges/corners of the video
            filters.push('vignette=PI/4');
            break;
        default:
            // 'original' or unrecognized IDs apply zero preset matrix changes
            break;
    }

    // 2. Add structural slider tracking overlays only if user tweaked them away from defaults
    const ffBrightness = Number(brightness) - 1;
    const ffContrast = Number(contrast);
    const ffSaturation = Number(saturation);

    if (ffBrightness !== 0 || ffContrast !== 1 || ffSaturation !== 1) {
        filters.push(`eq=brightness=${ffBrightness}:contrast=${ffContrast}:saturation=${ffSaturation}`);
    }

    // Join all parameters into a single comma-separated filtergraph string (or 'null' for no filter)
    return filters.length > 0 ? filters.join(',') : 'null';
};

// Enforce strict file filters to reject non-video uploads immediately
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid asset type. Only physical video streams are allowed.'), false);
        }
    }
});

/**
 * @route   POST /api/video/process
 * @desc    Accepts a video upload and runs visual transformations via FFmpeg
 * @access  Public
 */
router.post('/process', upload.single('videoFile'), async (req, res) => {
    console.log("Raw Request Headers:", req.headers);
    console.log("Raw Request Body:", req.body);
    console.log("Raw Request File:", req.file);

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No video asset payload found.' });
        }

        // Extract styling matrices from standard form fields
        const { guestDeviceId, filterId, brightness = 1, contrast = 1, saturation = 1 } = req.body;

        // Log project tracing index straight to MongoDB
        const project = new Project({
            GuestDeviceId: guestDeviceId || 'backend_test_worker',
            AssetType: 'video',
            MobileCanvasMetadata: { filterId, brightness, contrast, saturation },
            Status: 'rendering'
        });
        await project.save();

        const inputPath = req.file.path;
        const outputFilename = `processed-${req.file.filename}`;
        const outputPath = path.join('uploads', outputFilename);

        // Generate the dynamic filter string based on filterId + sliders
        const videoFilterString = GET_VIDEO_FILTER_STRING(filterId, brightness, contrast, saturation);

        console.log(`[Video Engine] Compiling complex filtergraph: ${videoFilterString}`);
        console.log(`[Video Engine] Initiating render for Project ID: ${project._id}`);

        // Fire the machine-level processing loop thread
        ffmpeg(inputPath)
            .videoFilter(videoFilterString)
            // Use standard web-compatible codecs so it plays immediately on mobile/web browsers
            .videoCodec('libx264')
            .audioCodec('aac')
            .output(outputPath)
            .on('start', (commandLine) => {
                console.log('[FFmpeg Progress] Executing system command: ' + commandLine);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`[FFmpeg Progress] Processing frame calculation: ${Math.round(progress.percent)}% complete.`);
                }
            })
            .on('end', async () => {
                console.log(`[Video Engine] Rendering complete for file: ${outputFilename}`);

                project.Status = 'completed';
                await project.save();

                // Clean up the temporary raw source upload to conserve local drive storage
                fs.unlink(inputPath, () => { });

                return res.status(200).json({
                    success: true,
                    message: 'Video transformation pipeline cycle successfully executed.',
                    projectId: project._id,
                    status: project.Status,
                    downloadUrl: `http://localhost:${process.env.PORT || 5000}/uploads/${outputFilename}`
                });
            })
            .on('error', async (err) => {
                console.error('[FFmpeg Error] Processing worker crashed: ', err.message);

                project.Status = 'draft';
                await project.save();

                // Clean up raw source upload even on failure
                fs.unlink(inputPath, () => { });
                return res.status(500).json({ success: false, error: `Multimedia transcoding cycle failed: ${err.message}` });
            })
            .run();

    } catch (error) {
        console.error('[Router Crash] Critical exception context:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Diagnostic route for testing multipart uploads
router.post('/debug-upload', upload.any(), (req, res) => {
    console.log("=== MULTIPART DIAGNOSTIC ===");
    console.log("Calculated Headers:", req.headers);
    console.log("Body Fields:", req.body);
    console.log("Files Array:", req.files);

    return res.json({
        bodyReceived: req.body,
        filesReceived: req.files ? req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })) : []
    });
});

/**
 * @route   POST /api/video/render
 * @desc    Queue a timeline-based video compilation job
 * @access  Public (auth handled at app level)
 */
router.post('/render', async (req, res) => {
    try {
        const { projectId, name, tracks, durationMs, exportSettings } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'projectId is required.',
            });
        }

        // Log the render job to MongoDB
        const project = new Project({
            GuestDeviceId: projectId,
            AssetType: 'video',
            MobileCanvasMetadata: {
                name: name || 'Untitled',
                trackCount: tracks?.length || 0,
                durationMs: durationMs || 0,
                exportSettings: exportSettings || {},
            },
            Status: 'queued',
        });
        await project.save();

        // Notify connected clients that a render job has started
        const io = req.app.get('socketio');
        if (io) {
            io.emit('render-progress', {
                projectId: project._id.toString(),
                progress: 0,
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Render job queued successfully.',
            jobId: project._id,
            status: 'processing',
        });
    } catch (error) {
        console.error('[Render Route] Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

module.exports = router;
