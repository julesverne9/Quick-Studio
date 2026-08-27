const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const { startRenderJob, probeMedia } = require("../services/renderService");

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to run ffmpeg command directly
const runFFmpeg = (args) => {
  return new Promise((resolve, reject) => {
    execFile(ffmpegInstaller.path, args, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve({ stdout, stderr });
    });
  });
};

async function createSyntheticMedia() {
  const clip1Path = path.join(uploadsDir, "test_clip1.mp4");
  const clip2Path = path.join(uploadsDir, "test_clip2.mp4");
  const musicPath = path.join(uploadsDir, "test_music.mp3");

  console.log("Generating synthetic test clip 1 (Blue with 440Hz sine audio, 4s)...");
  // 4s blue video with test tone
  await runFFmpeg([
    "-y",
    "-f", "lavfi", "-i", "color=c=blue:s=1080x1920:d=4:r=30",
    "-f", "lavfi", "-i", "sine=f=440:d=4",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
    clip1Path,
  ]);

  console.log("Generating synthetic test clip 2 (Red with 880Hz sine audio, 3s)...");
  // 3s red video with test tone
  await runFFmpeg([
    "-y",
    "-f", "lavfi", "-i", "color=c=red:s=720x1280:d=3:r=30",
    "-f", "lavfi", "-i", "sine=f=880:d=3",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
    clip2Path,
  ]);

  console.log("Generating synthetic music track (660Hz tone, 6s)...");
  // 6s music audio track
  await runFFmpeg([
    "-y",
    "-f", "lavfi", "-i", "sine=f=660:d=6",
    "-c:a", "libmp3lame",
    musicPath,
  ]);

  return { clip1Path, clip2Path, musicPath };
}

async function runPipelineTest() {
  console.log("=== STARTING VIDEO EXPORT PIPELINE INTEGRATION TEST ===");

  const { clip1Path, clip2Path, musicPath } = await createSyntheticMedia();

  console.log("Probing generated test clips...");
  const probe1 = await probeMedia(clip1Path);
  const probe2 = await probeMedia(clip2Path);
  const probeMusic = await probeMedia(musicPath);

  console.log("Probe 1:", probe1);
  console.log("Probe 2:", probe2);
  console.log("Probe Music:", probeMusic);

  const clientProjectId = `test-project-${Date.now()}`;
  const mongoProjectId = "507f1f77bcf86cd799439011"; // Mock ObjectId

  // Mock Socket.IO server
  const emittedEvents = [];
  const mockIo = {
    emit: (event, data) => {
      console.log(`[Socket.io Event: "${event}"]`, JSON.stringify(data));
      emittedEvents.push({ event, data });
    },
  };

  // Build multi-clip timeline project structure
  const tracks = [
    {
      id: "track-video-main",
      type: "video",
      name: "Main Video Track",
      items: [
        {
          id: "clip-1",
          type: "video",
          name: "Blue Clip 1",
          sourceUri: clip1Path,
          startOffsetMs: 0,
          durationMs: 2500, // 2.5s duration on timeline
          startCutMs: 500,  // In-point cut at 0.5s
          endCutMs: 0,
          speed: 1.0,
          volume: 1.0,
          filterPreset: "vintage",
          adjustments: { brightness: 1.1, contrast: 1.2, saturation: 0.9 },
        },
        {
          id: "clip-2",
          type: "video",
          name: "Red Clip 2",
          sourceUri: clip2Path,
          startOffsetMs: 2500,
          durationMs: 2000, // 2.0s duration on timeline
          startCutMs: 0,
          endCutMs: 0,
          speed: 1.5,       // 1.5x speed (testing atempo & setpts)
          volume: 0.8,
          filterPreset: "sepia",
          adjustments: { brightness: 1.0, contrast: 1.0, saturation: 1.0 },
        },
      ],
    },
    {
      id: "track-audio-music",
      type: "audio",
      name: "Music Track",
      items: [
        {
          id: "music-1",
          type: "audio",
          name: "Background Music",
          sourceUri: musicPath,
          startOffsetMs: 500, // starts at 0.5s
          durationMs: 4000,
          volume: 0.4,
        },
      ],
    },
  ];

  console.log("\nExecuting startRenderJob with multi-clip trimming, speed, filters, and music mixing...");

  await new Promise((resolve, reject) => {
    // Override end/error in mock environment or wait for socket completion
    const checkInterval = setInterval(() => {
      const completed = emittedEvents.find((e) => e.data?.status === "completed");
      const failed = emittedEvents.find((e) => e.data?.status === "failed");

      if (completed) {
        clearInterval(checkInterval);
        resolve(completed.data);
      } else if (failed) {
        clearInterval(checkInterval);
        reject(new Error(failed.data.error || "Render failed"));
      }
    }, 500);

    startRenderJob({
      mongoProjectId,
      clientProjectId,
      tracks,
      durationMs: 4500,
      exportSettings: { resolution: "1080p", fps: 30, bitrateMbps: 15 },
      fileMap: {
        "clip-1": clip1Path,
        "clip-2": clip2Path,
        "music-1": musicPath,
      },
      io: mockIo,
      baseUrl: "https://quickstudio.app",
    });
  });

  console.log("\n=== RENDER COMPLETE! VERIFYING OUTPUT FILE ===");
  const completedEvent = emittedEvents.find((e) => e.data?.status === "completed");
  console.log("Completed event payload:", completedEvent);

  const outputFilename = path.basename(completedEvent.data.downloadUrl);
  const outputPath = path.join(uploadsDir, outputFilename);

  console.log(`Checking physical file at: ${outputPath}`);
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Output file ${outputPath} does not exist!`);
  }

  const stat = fs.statSync(outputPath);
  console.log(`Output file size: ${stat.size} bytes (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);

  if (stat.size <= 0) {
    throw new Error("Output file is empty!");
  }

  const outputProbe = await probeMedia(outputPath);
  console.log("Output Media Probe:", outputProbe);

  if (!outputProbe.hasVideo) {
    throw new Error("Output file missing video stream!");
  }
  if (!outputProbe.hasAudio) {
    throw new Error("Output file missing audio stream!");
  }

  console.log(`\n🎉 SUCCESS! Render pipeline verified:`);
  console.log(`- Video Stream: YES`);
  console.log(`- Audio Stream: YES`);
  console.log(`- Duration: ~${outputProbe.durationSeconds.toFixed(2)}s`);
  console.log(`- Size: ${(stat.size / 1024).toFixed(1)} KB`);
  console.log(`- Socket Progress Updates: ${emittedEvents.length} events logged`);
}

runPipelineTest()
  .then(() => {
    console.log("\nTest suite passed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Test suite failed:", err);
    process.exit(1);
  });
