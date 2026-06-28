import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Keyframe, Track, TrackItem, VideoEditorState, VideoProject } from "../video-editor/types";

// Helper to generate IDs
const generateId = () => `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

const initialProjectState = (): VideoProject => ({
  id: generateId(),
  name: "Untitled Video Project",
  width: 1080,
  height: 1920,
  fps: 30,
  durationMs: 0,
  tracks: [
    { id: "track-video-main", type: "video", name: "Main Video Track", isLocked: false, isHidden: false, items: [] },
    { id: "track-video-overlay", type: "overlay", name: "Overlays (PIP)", isLocked: false, isHidden: false, items: [] },
    { id: "track-audio-music", type: "audio", name: "Music Track", isLocked: false, isHidden: false, items: [] },
    { id: "track-audio-voice", type: "audio", name: "Voice-over Track", isLocked: false, isHidden: false, items: [] },
    { id: "track-text-subs", type: "text", name: "Subtitles / Captions", isLocked: false, isHidden: false, items: [] },
    { id: "track-stickers", type: "sticker", name: "Stickers Track", isLocked: false, isHidden: false, items: [] },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const initialState: VideoEditorState = {
  projects: [],
  currentProject: null,
  activeItemId: null,
  activeTrackId: null,
  currentTimeMs: 0,
  isPlaying: false,
  zoomLevel: 15, // pixels per second representation on screen
  activeTool: null,
  undoStack: [],
  redoStack: [],
  exportSettings: {
    resolution: "1080p",
    fps: 30,
    codec: "h264",
    bitrateMbps: 15,
    removeWatermark: true,
  },
};

// Deep copy a project
const cloneProject = (project: VideoProject): VideoProject => {
  return JSON.parse(JSON.stringify(project));
};

export const videoEditorSlice = createSlice({
  name: "videoEditor",
  initialState,
  reducers: {
    loadProjects(state: VideoEditorState, action: PayloadAction<VideoProject[]>) {
      state.projects = action.payload;
    },
    
    createProject(state: VideoEditorState, action: PayloadAction<{ name: string; initialAsset?: { uri: string; name: string; durationMs: number } }>) {
      const newProj = initialProjectState();
      newProj.name = action.payload.name;
      
      if (action.payload.initialAsset) {
        const { uri, name, durationMs } = action.payload.initialAsset;
        const mainVideoTrack = newProj.tracks.find((t: Track) => t.id === "track-video-main");
        
        if (mainVideoTrack) {
          const item: TrackItem = {
            id: generateId(),
            type: "video",
            sourceUri: uri,
            name: name,
            startOffsetMs: 0,
            durationMs: durationMs,
            startCutMs: 0,
            endCutMs: 0,
            x: 0,
            y: 0,
            scale: 1.0,
            rotation: 0,
            opacity: 1.0,
            volume: 1.0,
            speed: 1.0,
            filterPreset: "original",
            adjustments: { brightness: 1, contrast: 1, saturation: 1 },
            keyframes: [],
          };
          mainVideoTrack.items.push(item);
          newProj.durationMs = durationMs;
          newProj.coverUri = uri; // Use first frame or clip URI as cover
        }
      }
      
      state.projects.push(newProj);
      state.currentProject = newProj;
      state.currentTimeMs = 0;
      state.isPlaying = false;
      state.activeItemId = null;
      state.activeTrackId = null;
      state.undoStack = [];
      state.redoStack = [];
    },
    
    deleteProject(state: VideoEditorState, action: PayloadAction<string>) {
      state.projects = state.projects.filter((p: VideoProject) => p.id !== action.payload);
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null;
        state.activeItemId = null;
        state.activeTrackId = null;
        state.currentTimeMs = 0;
        state.isPlaying = false;
      }
    },
    
    selectProject(state: VideoEditorState, action: PayloadAction<string>) {
      const proj = state.projects.find((p: VideoProject) => p.id === action.payload);
      if (proj) {
        state.currentProject = cloneProject(proj);
        state.currentTimeMs = 0;
        state.isPlaying = false;
        state.activeItemId = null;
        state.activeTrackId = null;
        state.undoStack = [];
        state.redoStack = [];
      }
    },
    
    saveToHistory(state: VideoEditorState) {
      if (state.currentProject) {
        state.undoStack.push(cloneProject(state.currentProject));
        state.redoStack = []; // Clear redo stack on new action
        
        // Limit history to 30 steps
        if (state.undoStack.length > 30) {
          state.undoStack.shift();
        }
      }
    },
    
    undo(state: VideoEditorState) {
      if (state.undoStack.length > 0 && state.currentProject) {
        const prev = state.undoStack.pop()!;
        state.redoStack.push(cloneProject(state.currentProject));
        state.currentProject = prev;
        
        // Recalculate duration
        let maxDuration = 0;
        state.currentProject.tracks.forEach((track: Track) => {
          track.items.forEach((item: TrackItem) => {
            const end = item.startOffsetMs + item.durationMs;
            if (end > maxDuration) maxDuration = end;
          });
        });
        state.currentProject.durationMs = maxDuration;
      }
    },
    
    redo(state: VideoEditorState) {
      if (state.redoStack.length > 0 && state.currentProject) {
        const next = state.redoStack.pop()!;
        state.undoStack.push(cloneProject(state.currentProject));
        state.currentProject = next;
      }
    },
    
    setCurrentTime(state: VideoEditorState, action: PayloadAction<number>) {
      state.currentTimeMs = Math.max(0, action.payload);
      if (state.currentProject && state.currentTimeMs > state.currentProject.durationMs + 2000) {
        state.currentTimeMs = state.currentProject.durationMs + 2000;
      }
    },
    
    setPlaying(state: VideoEditorState, action: PayloadAction<boolean>) {
      state.isPlaying = action.payload;
    },
    
    setZoomLevel(state: VideoEditorState, action: PayloadAction<number>) {
      state.zoomLevel = Math.min(Math.max(action.payload, 1), 100);
    },
    
    setActiveTool(state: VideoEditorState, action: PayloadAction<VideoEditorState["activeTool"]>) {
      state.activeTool = action.payload;
    },
    
    setActiveItem(state: VideoEditorState, action: PayloadAction<{ trackId: string; itemId: string } | null>) {
      if (action.payload) {
        state.activeItemId = action.payload.itemId;
        state.activeTrackId = action.payload.trackId;
      } else {
        state.activeItemId = null;
        state.activeTrackId = null;
      }
    },
    
    addTrackItem(state: VideoEditorState, action: PayloadAction<{ trackId: string; item: TrackItem }>) {
      if (!state.currentProject) return;
      
      const track = state.currentProject.tracks.find((t: Track) => t.id === action.payload.trackId);
      if (track) {
        // Save to undo stack
        state.undoStack.push(cloneProject(state.currentProject));
        state.redoStack = [];
        
        track.items.push(action.payload.item);
        
        // Recalculate project duration
        let maxDuration = 0;
        state.currentProject.tracks.forEach((t: Track) => {
          t.items.forEach((itm: TrackItem) => {
            const end = itm.startOffsetMs + itm.durationMs;
            if (end > maxDuration) maxDuration = end;
          });
        });
        state.currentProject.durationMs = maxDuration;
        state.currentProject.updatedAt = new Date().toISOString();
        
        // Auto select newly added item
        state.activeItemId = action.payload.item.id;
        state.activeTrackId = action.payload.trackId;
      }
    },
    
    removeTrackItem(state: VideoEditorState, action: PayloadAction<{ trackId: string; itemId: string }>) {
      if (!state.currentProject) return;
      
      const track = state.currentProject.tracks.find((t: Track) => t.id === action.payload.trackId);
      if (track) {
        state.undoStack.push(cloneProject(state.currentProject));
        state.redoStack = [];
        
        track.items = track.items.filter((itm: TrackItem) => itm.id !== action.payload.itemId);
        
        if (state.activeItemId === action.payload.itemId) {
          state.activeItemId = null;
          state.activeTrackId = null;
        }
        
        // Recalculate project duration
        let maxDuration = 0;
        state.currentProject.tracks.forEach((t: Track) => {
          t.items.forEach((itm: TrackItem) => {
            const end = itm.startOffsetMs + itm.durationMs;
            if (end > maxDuration) maxDuration = end;
          });
        });
        state.currentProject.durationMs = maxDuration;
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },
    
    updateTrackItem(state: VideoEditorState, action: PayloadAction<{ trackId: string; itemId: string; updates: Partial<TrackItem> }>) {
      if (!state.currentProject) return;
      
      const track = state.currentProject.tracks.find((t: Track) => t.id === action.payload.trackId);
      if (track) {
        const item = track.items.find((itm: TrackItem) => itm.id === action.payload.itemId);
        if (item) {
          // Check if we need history tracking (e.g. not for continuous drag, but done in separate stages. 
          // We will save to history before updating properties.
          // Note: In Redux, key changes like Split or filter selection call saveToHistory first, then update.
          Object.assign(item, action.payload.updates);
          
          // Recalculate duration
          let maxDuration = 0;
          state.currentProject.tracks.forEach((t: Track) => {
            t.items.forEach((itm: TrackItem) => {
              const end = itm.startOffsetMs + itm.durationMs;
              if (end > maxDuration) maxDuration = end;
            });
          });
          state.currentProject.durationMs = maxDuration;
          state.currentProject.updatedAt = new Date().toISOString();
        }
      }
    },
    
    splitTrackItem(state: VideoEditorState, action: PayloadAction<{ trackId: string; itemId: string; splitTimeMs: number }>) {
      if (!state.currentProject) return;
      
      const track = state.currentProject.tracks.find((t: Track) => t.id === action.payload.trackId);
      if (track) {
        const itemIndex = track.items.findIndex((itm: TrackItem) => itm.id === action.payload.itemId);
        if (itemIndex > -1) {
          const item = track.items[itemIndex];
          const splitTime = action.payload.splitTimeMs;
          
          // Verify split time sits within the clip bounds
          if (splitTime > item.startOffsetMs && splitTime < (item.startOffsetMs + item.durationMs)) {
            state.undoStack.push(cloneProject(state.currentProject));
            state.redoStack = [];
            
            const firstHalfDuration = splitTime - item.startOffsetMs;
            const secondHalfDuration = item.durationMs - firstHalfDuration;
            
            // Clone first half
            const secondHalf: TrackItem = {
              ...cloneProject(state.currentProject).tracks.find((t: Track) => t.id === action.payload.trackId)!.items[itemIndex],
              id: generateId(),
              startOffsetMs: splitTime,
              durationMs: secondHalfDuration,
              // Calculate correct source cut points based on speed
              startCutMs: item.startCutMs + (firstHalfDuration * item.speed),
              keyframes: item.keyframes
                .filter((k: Keyframe) => k.timeOffsetMs >= firstHalfDuration)
                .map((k: Keyframe) => ({ ...k, timeOffsetMs: k.timeOffsetMs - firstHalfDuration })),
            };
            
            // Update first half in place
            item.durationMs = firstHalfDuration;
            item.keyframes = item.keyframes.filter((k: Keyframe) => k.timeOffsetMs < firstHalfDuration);
            
            // Insert second half right after the first half
            track.items.splice(itemIndex + 1, 0, secondHalf);
            
            // Select the newly created second half
            state.activeItemId = secondHalf.id;
            state.currentProject.updatedAt = new Date().toISOString();
          }
        }
      }
    },
    
    addKeyframe(state: VideoEditorState, action: PayloadAction<{ trackId: string; itemId: string; keyframe: Keyframe }>) {
      if (!state.currentProject) return;
      
      const track = state.currentProject.tracks.find((t: Track) => t.id === action.payload.trackId);
      if (track) {
        const item = track.items.find((itm: TrackItem) => itm.id === action.payload.itemId);
        if (item) {
          state.undoStack.push(cloneProject(state.currentProject));
          state.redoStack = [];
          
          // Remove existing keyframe at same offset if present
          item.keyframes = item.keyframes.filter((k: Keyframe) => k.timeOffsetMs !== action.payload.keyframe.timeOffsetMs);
          
          // Insert and sort keyframes chronologically
          item.keyframes.push(action.payload.keyframe);
          item.keyframes.sort((a: Keyframe, b: Keyframe) => a.timeOffsetMs - b.timeOffsetMs);
          
          state.currentProject.updatedAt = new Date().toISOString();
        }
      }
    },
    
    removeKeyframe(state: VideoEditorState, action: PayloadAction<{ trackId: string; itemId: string; timeOffsetMs: number }>) {
      if (!state.currentProject) return;
      
      const track = state.currentProject.tracks.find((t: Track) => t.id === action.payload.trackId);
      if (track) {
        const item = track.items.find((itm: TrackItem) => itm.id === action.payload.itemId);
        if (item) {
          state.undoStack.push(cloneProject(state.currentProject));
          state.redoStack = [];
          
          item.keyframes = item.keyframes.filter((k: Keyframe) => k.timeOffsetMs !== action.payload.timeOffsetMs);
          state.currentProject.updatedAt = new Date().toISOString();
        }
      }
    },
    
    updateExportSettings(state: VideoEditorState, action: PayloadAction<Partial<VideoEditorState["exportSettings"]>>) {
      state.exportSettings = {
        ...state.exportSettings,
        ...action.payload,
      };
    },
    
    saveCurrentProjectToSavedDrafts(state: VideoEditorState) {
      if (!state.currentProject) return;
      const idx = state.projects.findIndex((p: VideoProject) => p.id === state.currentProject!.id);
      if (idx > -1) {
        state.projects[idx] = cloneProject(state.currentProject);
      } else {
        state.projects.push(cloneProject(state.currentProject));
      }
    }
  },
});

export const {
  loadProjects,
  createProject,
  deleteProject,
  selectProject,
  saveToHistory,
  undo,
  redo,
  setCurrentTime,
  setPlaying,
  setZoomLevel,
  setActiveTool,
  setActiveItem,
  addTrackItem,
  removeTrackItem,
  updateTrackItem,
  splitTrackItem,
  addKeyframe,
  removeKeyframe,
  updateExportSettings,
  saveCurrentProjectToSavedDrafts,
} = videoEditorSlice.actions;

export default videoEditorSlice.reducer;
