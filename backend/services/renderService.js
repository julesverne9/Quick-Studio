const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const mongoose = require("mongoose");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const Project = require("../models/Project");

// Ensure FFmpeg binary path is set
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const uploadsDirectory = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

/**
 * Probe a media file to inspect whether it has an audio stream
 * Uses ffmpeg -i under the hood
 */
const probeMedia = (filePath) => {
  return new Promise((resolve) => {
    execFile(ffmpegInstaller.path, ["-i", filePath], (_err, _stdout, stderr) => {
      const output = stderr || "";
      const hasAudio = /Stream #\d+:\d+.*Audio:/i.test(output);
      const hasVideo = /Stream #\d+:\d+.*Video:/i.test(output);

      // Extract duration if available (Duration: 00:00:05.20)
      const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      let durationSeconds = 0;
      if (durationMatch) {
        const hours = parseFloat(durationMatch[1]);
        const mins = parseFloat(durationMatch[2]);
        const secs = parseFloat(durationMatch[3]);
        durationSeconds = hours * 3600 + mins * 60 + secs;
      }

      resolve({ hasAudio, hasVideo, durationSeconds });
    });
  });
};

/**
 * Convert timemark "00:00:03.50" to seconds
 */
const timemarkToSeconds = (timemark) => {
  if (!timemark || typeof timemark !== "string") return 0;
  const parts = timemark.split(":");
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return parseFloat(timemark) || 0;
};

/**
 * Build color filter string based on preset + brightness/contrast/saturation
 */
const buildVideoFilter = (filterPreset = "original", adjustments = {}) => {
  const filters = [];

  switch (filterPreset) {
    case "bw":
    case "true-bw":
      filters.push("colorchannelmixer=.2126:.7152:.0722:0:.2126:.7152:.0722:0:.2126:.7152:.0722");
      break;
    case "sepia":
      filters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131");
      break;
    case "vintage":
      filters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=1.1:brightness=0.05");
      break;
    case "cool":
      filters.push("colorchannelmixer=1:0:0:0:0:1:0:0:0:0:1.1:0");
      break;
    case "warm":
      filters.push("colorchannelmixer=1.1:0:0:0:0:1.05:0:0:0:0:0.95:0");
      break;
    case "negative":
    case "negate":
      filters.push("lutrgb=r=negval:g=negval:b=negval");
      break;
    case "vignette":
      filters.push("vignette=PI/4");
      break;
    default:
      break;
  }

  const brightness = adjustments.brightness !== undefined ? adjustments.brightness : 1;
  const contrast = adjustments.contrast !== undefined ? adjustments.contrast : 1;
  const saturation = adjustments.saturation !== undefined ? adjustments.saturation : 1;

  const ffBrightness = Number(brightness) - 1;
  const ffContrast = Number(contrast);
  const ffSaturation = Number(saturation);

  if (ffBrightness !== 0 || ffContrast !== 1 || ffSaturation !== 1) {
    filters.push(`eq=brightness=${ffBrightness.toFixed(2)}:contrast=${ffContrast.toFixed(2)}:saturation=${ffSaturation.toFixed(2)}`);
  }

  return filters.length > 0 ? filters.join(",") : "null";
};

/**
 * Build pitch-preserving atempo filter chain for audio speed adjustments
 */
const buildAtempoFilter = (speed = 1.0) => {
  if (Math.abs(speed - 1.0) < 0.001) return null;

  let remaining = speed;
  const atempos = [];

  if (remaining > 1.0) {
    while (remaining > 2.0) {
      atempos.push("atempo=2.0");
      remaining /= 2.0;
    }
    if (remaining > 1.001) {
      atempos.push(`atempo=${remaining.toFixed(4)}`);
    }
  } else {
    while (remaining < 0.5) {
      atempos.push("atempo=0.5");
      remaining /= 0.5;
    }
    if (remaining < 0.999) {
      atempos.push(`atempo=${remaining.toFixed(4)}`);
    }
  }

  return atempos.length > 0 ? atempos.join(",") : null;
};

/**
 * Build the base URL according to the PUBLIC_BASE_URL pattern
 */
const buildBaseUrl = (req) => {
  const configuredUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;
  if (req) {
    const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0];
    return `${forwardedProtocol || req.protocol}://${req.get("host")}`;
  }
  return `http://localhost:${process.env.PORT || 5000}`;
};

/**
 * Executes a full timeline render job in the background
 */
const startRenderJob = async ({
  mongoProjectId,
  clientProjectId,
  tracks,
  durationMs,
  exportSettings = {},
  fileMap = {}, // Map of item.id -> local disk path
  io,
  baseUrl,
}) => {
  console.log(`[RenderService] Starting background render for project ${clientProjectId} (Mongo ID: ${mongoProjectId})`);

  try {
    const mainVideoTrack = tracks.find((t) => t.id === "track-video-main");
    const videoClips = mainVideoTrack?.items || [];

    if (videoClips.length === 0) {
      throw new Error("No video clips found on Main Video Track to export.");
    }

    const musicTrack = tracks.find((t) => t.id === "track-audio-music");
    const musicClips = musicTrack?.items || [];
    const hasMusic = musicClips.length > 0;

    // Resolve local file paths for all clips
    const resolvedVideoClips = [];
    for (const clip of videoClips) {
      let localPath = fileMap[clip.id] || fileMap[clip.sourceUri] || clip.sourceUri;

      // If sourceUri was uploaded to uploads/ directory, check if relative or filename
      if (!fs.existsSync(localPath)) {
        const potentialUploadPath = path.join(uploadsDirectory, path.basename(localPath));
        if (fs.existsSync(potentialUploadPath)) {
          localPath = potentialUploadPath;
        }
      }

      if (!fs.existsSync(localPath)) {
        throw new Error(`Media source file not found for clip "${clip.name}" (${clip.id}) at path: ${localPath}`);
      }

      const probe = await probeMedia(localPath);
      resolvedVideoClips.push({ ...clip, localPath, probe });
    }

    let resolvedMusic = null;
    if (hasMusic) {
      const musicItem = musicClips[0];
      let localPath = fileMap[musicItem.id] || fileMap[musicItem.sourceUri] || musicItem.sourceUri;

      if (!fs.existsSync(localPath)) {
        const potentialUploadPath = path.join(uploadsDirectory, path.basename(localPath));
        if (fs.existsSync(potentialUploadPath)) {
          localPath = potentialUploadPath;
        }
      }

      if (fs.existsSync(localPath)) {
        const probe = await probeMedia(localPath);
        resolvedMusic = { ...musicItem, localPath, probe };
      } else {
        console.warn(`[RenderService] Music file not found at ${localPath}, continuing without music track.`);
      }
    }

    // Output setup
    const outputFilename = `export-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp4`;
    const outputPath = path.join(uploadsDirectory, outputFilename);

    // Canvas resolution & FPS
    const outWidth = 1080;
    const outHeight = 1920;
    const fps = exportSettings.fps || 30;
    const totalTargetDurationSec = Math.max(1, (durationMs || 5000) / 1000);

    // Initialize ffmpeg command
    const command = ffmpeg();

    // Add inputs
    resolvedVideoClips.forEach((c) => {
      command.input(c.localPath);
    });

    if (resolvedMusic) {
      command.input(resolvedMusic.localPath);
    }

    // Construct filter_complex
    const filterLines = [];

    // Process each video clip
    resolvedVideoClips.forEach((clip, i) => {
      const startCutSec = (clip.startCutMs || 0) / 1000;
      const speed = clip.speed || 1.0;
      const clipDurSec = (clip.durationMs || 1000) / 1000;
      const sourceDurSec = clipDurSec * speed;

      // 1. Video Trim
      filterLines.push(
        `[${i}:v]trim=start=${startCutSec.toFixed(3)}:duration=${sourceDurSec.toFixed(3)},setpts=PTS-STARTPTS[v_trim_${i}]`
      );

      // 2. Video Speed
      if (Math.abs(speed - 1.0) > 0.001) {
        filterLines.push(`[v_trim_${i}]setpts=(1/${speed.toFixed(4)})*PTS[v_spd_${i}]`);
      } else {
        filterLines.push(`[v_trim_${i}]null[v_spd_${i}]`);
      }

      // 3. Aspect ratio scaling, letterboxing/pillarboxing, and FPS
      filterLines.push(
        `[v_spd_${i}]scale=${outWidth}:${outHeight}:force_original_aspect_ratio=decrease,pad=${outWidth}:${outHeight}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}[v_scale_${i}]`
      );

      // 4. Color filter preset and adjustments
      const videoFilterStr = buildVideoFilter(clip.filterPreset, clip.adjustments);
      filterLines.push(`[v_scale_${i}]${videoFilterStr}[v_out_${i}]`);

      // 5. Audio processing
      if (clip.probe.hasAudio) {
        filterLines.push(
          `[${i}:a]atrim=start=${startCutSec.toFixed(3)}:duration=${sourceDurSec.toFixed(3)},asetpts=PTS-STARTPTS[a_trim_${i}]`
        );

        const atempoStr = buildAtempoFilter(speed);
        const vol = clip.volume !== undefined ? clip.volume : 1.0;
        const aFilters = [];
        if (atempoStr) aFilters.push(atempoStr);
        aFilters.push(`volume=${vol.toFixed(2)}`);

        filterLines.push(`[a_trim_${i}]${aFilters.join(",")}[a_out_${i}]`);
      } else {
        // Synthesize silence for clip duration so concatenation doesn't fail
        filterLines.push(`aevalsrc=0:d=${clipDurSec.toFixed(3)}:s=44100[a_out_${i}]`);
      }
    });

    // 6. Concatenate video and audio streams of all clips
    const concatInputs = resolvedVideoClips.map((_, i) => `[v_out_${i}][a_out_${i}]`).join("");
    filterLines.push(`${concatInputs}concat=n=${resolvedVideoClips.length}:v=1:a=1[v_main][a_main]`);

    // 7. Background Music mixing
    let finalAudioTag = "[a_main]";
    if (resolvedMusic) {
      const musicIndex = resolvedVideoClips.length;
      const musicVol = resolvedMusic.volume !== undefined ? resolvedMusic.volume : 1.0;
      const musicStartOffsetMs = resolvedMusic.startOffsetMs || 0;

      if (musicStartOffsetMs > 0) {
        filterLines.push(
          `[${musicIndex}:a]adelay=${musicStartOffsetMs}|${musicStartOffsetMs},volume=${musicVol.toFixed(2)}[a_music]`
        );
      } else {
        filterLines.push(`[${musicIndex}:a]volume=${musicVol.toFixed(2)}[a_music]`);
      }

      filterLines.push(`[a_main][a_music]amix=inputs=2:duration=first:dropout_transition=2[a_final]`);
      finalAudioTag = "[a_final]";
    }

    const filterComplexString = filterLines.join(";");
    console.log(`[RenderService] Compiled filter_complex:\n${filterComplexString}`);

    // Configure ffmpeg outputs and flags
    command
      .complexFilter(filterComplexString)
      .outputOptions([
        "-map [v_main]",
        `-map ${finalAudioTag}`,
        "-c:v libx264",
        "-preset fast",
        "-crf 22",
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-b:a 192k",
        "-movflags +faststart",
      ])
      .output(outputPath);

    // Track real-time progress
    command.on("start", (commandLine) => {
      console.log(`[RenderService] Executing FFmpeg command:\n${commandLine}`);
      if (io) {
        io.emit("render-progress", {
          projectId: clientProjectId,
          jobId: mongoProjectId.toString(),
          progress: 5,
          status: "rendering",
        });
      }
    });

    command.on("progress", (progress) => {
      let percent = 0;
      if (progress.percent && progress.percent > 0) {
        percent = Math.min(99, Math.round(progress.percent));
      } else if (progress.timemark) {
        const currentSeconds = timemarkToSeconds(progress.timemark);
        percent = Math.min(99, Math.round((currentSeconds / totalTargetDurationSec) * 100));
      }

      if (percent > 0 && io) {
        io.emit("render-progress", {
          projectId: clientProjectId,
          jobId: mongoProjectId.toString(),
          progress: percent,
          status: "rendering",
        });
      }
    });

    command.on("end", async () => {
      console.log(`[RenderService] Render completed successfully for project ${clientProjectId}! File: ${outputFilename}`);

      const downloadUrl = `${baseUrl}/uploads/${outputFilename}`;

      // Update Project record in MongoDB if connected
      try {
        if (mongoose.connection.readyState === 1) {
          await Project.findByIdAndUpdate(mongoProjectId, {
            Status: "completed",
            EditedAssetUrl: downloadUrl,
            EditedFilename: outputFilename,
          });
        }
      } catch (dbErr) {
        console.error(`[RenderService] Error updating MongoDB project status:`, dbErr.message);
      }

      // Notify clients over Socket.io
      if (io) {
        io.emit("render-progress", {
          projectId: clientProjectId,
          jobId: mongoProjectId.toString(),
          progress: 100,
          status: "completed",
          downloadUrl,
          editedAssetUrl: downloadUrl,
        });
      }
    });

    command.on("error", async (err) => {
      console.error(`[RenderService] FFmpeg execution failed for project ${clientProjectId}:`, err.message);

      try {
        if (mongoose.connection.readyState === 1) {
          await Project.findByIdAndUpdate(mongoProjectId, {
            Status: "draft",
          });
        }
      } catch (dbErr) {
        console.error(`[RenderService] Error updating MongoDB project status:`, dbErr.message);
      }

      if (io) {
        io.emit("render-progress", {
          projectId: clientProjectId,
          jobId: mongoProjectId.toString(),
          progress: 0,
          status: "failed",
          error: err.message,
        });
      }
    });

    // Run detached process
    command.run();
  } catch (error) {
    console.error(`[RenderService] Fatal error initiating render job:`, error);

    try {
      if (mongoose.connection.readyState === 1) {
        await Project.findByIdAndUpdate(mongoProjectId, {
          Status: "draft",
        });
      }
    } catch (dbErr) {
      console.error(`[RenderService] Error updating MongoDB:`, dbErr.message);
    }

    if (io) {
      io.emit("render-progress", {
        projectId: clientProjectId,
        jobId: mongoProjectId.toString(),
        progress: 0,
        status: "failed",
        error: error.message,
      });
    }
  }
};

module.exports = {
  startRenderJob,
  buildVideoFilter,
  buildAtempoFilter,
  buildBaseUrl,
  probeMedia,
};
