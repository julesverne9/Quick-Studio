export interface Keyframe {
  timeOffsetMs: number;
  position?: { x: number; y: number };
  scale?: number;
  rotation?: number;
  opacity?: number;
  blur?: number;
  easeCurve?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | string; // Bezier definition
}

export interface Transition {
  type: 'none' | 'fade' | 'crossfade' | 'zoom' | 'slide' | 'glitch' | 'shake' | 'whip';
  durationMs: number;
}

export interface MaskConfig {
  type: 'none' | 'rectangle' | 'circle' | 'linear' | 'mirror';
  feather: number;
  invert: boolean;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  color: string; // Hex color
  tolerance: number;
  feather: number;
}

export interface TrackItem {
  id: string;
  type: 'video' | 'audio' | 'text' | 'sticker' | 'overlay' | 'effect';
  sourceUri?: string;
  name: string;
  
  // Timeline boundaries
  startOffsetMs: number; // When does the item start playing relative to project start
  durationMs: number;    // Playback duration in the project
  startCutMs: number;    // Head cut offset in source file
  endCutMs: number;      // Tail cut offset in source file
  
  // Basic properties
  x: number;             // Percentage coordinate (0-100) or pixels
  y: number;             // Percentage coordinate (0-100) or pixels
  scale: number;         // 1.0 is default
  rotation: number;      // Degrees
  opacity: number;       // 0 to 1
  volume: number;        // 0 to 1
  
  // Custom configurations
  speed: number;         // Playback speed multiplier (0.5 to 10.0)
  speedCurve?: { x: number; y: number }[]; // Curve control points
  
  // Filters & Adjustments
  filterPreset: 'original' | 'bw' | 'sepia' | 'vintage' | 'cool' | 'warm' | string;
  adjustments: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  
  // Transitions
  transitionIn?: Transition;
  transitionOut?: Transition;
  
  // Keyframes (sorted by timeOffsetMs)
  keyframes: Keyframe[];
  
  // Mask & Chroma
  mask?: MaskConfig;
  chromaKey?: ChromaKeyConfig;
  
  // Sub-type specific variables
  textStyle?: {
    text: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    backgroundColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    glowColor?: string;
    shadowColor?: string;
    alignment: 'left' | 'center' | 'right';
    tracking: number;
    animationType?: 'none' | 'typing' | 'fade' | 'zoom' | 'word-by-word';
  };
  
  stickerStyle?: {
    stickerId: string;
    isAnimated: boolean;
  };
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'text' | 'sticker' | 'overlay' | 'effect';
  name: string;
  isLocked: boolean;
  isHidden: boolean;
  items: TrackItem[];
}

export interface VideoProject {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  coverUri?: string;
  tracks: Track[];
  createdAt: string;
  updatedAt: string;
}

export interface VideoEditorState {
  projects: VideoProject[];
  currentProject: VideoProject | null;
  activeItemId: string | null;     // Currently selected clip/item ID
  activeTrackId: string | null;    // Currently selected track ID
  currentTimeMs: number;           // Playhead position
  isPlaying: boolean;              // Playback status
  zoomLevel: number;               // Pixels per second zoom factor
  activeTool: 'split' | 'trim' | 'speed' | 'volume' | 'filter' | 'text' | 'keyframe' | 'ai' | 'chroma' | 'mask' | 'transition' | null;
  undoStack: VideoProject[];       // Deep copies of projects for undo
  redoStack: VideoProject[];       // Deep copies of projects for redo
  exportSettings: {
    resolution: '1080p' | '2k' | '4k' | '8k';
    fps: 24 | 30 | 60 | 120;
    codec: 'h264' | 'hevc';
    bitrateMbps: number;
    removeWatermark: boolean;
  };
}
