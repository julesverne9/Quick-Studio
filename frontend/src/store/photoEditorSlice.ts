import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface PhotoLayer {
  id: string;
  type: 'sticker' | 'image';
  uri: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  scale: number;
  rotation: number;
  opacity: number;
}

export interface PhotoProject {
  id: string;
  name: string;
  assetUri: string;
  assetType: 'photo' | 'video';
  preset: string;
  adjustments: { brightness: number; contrast: number; saturation: number };
  layers: PhotoLayer[];
  createdAt: string;
  updatedAt: string;
}

interface PhotoEditorState {
  projects: PhotoProject[];
  currentProject: PhotoProject | null;
}

const initialState: PhotoEditorState = {
  projects: [],
  currentProject: null,
};

const photoEditorSlice = createSlice({
  name: "photoEditor",
  initialState,
  reducers: {
    loadProjects: (state, action: PayloadAction<PhotoProject[]>) => {
      state.projects = action.payload;
    },
    createProject: (
      state,
      action: PayloadAction<{ name: string; assetUri: string; assetType: 'photo' | 'video' }>
    ) => {
      const now = new Date().toISOString();
      const newProject: PhotoProject = {
        id: `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        name: action.payload.name,
        assetUri: action.payload.assetUri,
        assetType: action.payload.assetType,
        preset: "original",
        adjustments: { brightness: 1, contrast: 1, saturation: 1 },
        layers: [],
        createdAt: now,
        updatedAt: now,
      };
      state.projects.unshift(newProject);
      state.currentProject = newProject;
    },
    deleteProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter((p) => p.id !== action.payload);
      if (state.currentProject?.id === action.payload) {
        state.currentProject = null;
      }
    },
    selectProject: (state, action: PayloadAction<string>) => {
      const project = state.projects.find((p) => p.id === action.payload);
      if (project) {
        state.currentProject = project;
      }
    },
    closeProject: (state) => {
      state.currentProject = null;
    },
    updateProject: (
      state,
      action: PayloadAction<{ preset?: string; adjustments?: Partial<{ brightness: number; contrast: number; saturation: number }> }>
    ) => {
      if (state.currentProject) {
        if (action.payload.preset !== undefined) {
          state.currentProject.preset = action.payload.preset;
        }
        if (action.payload.adjustments) {
          state.currentProject.adjustments = {
            ...state.currentProject.adjustments,
            ...action.payload.adjustments,
          };
        }
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },
    updateLayers: (state, action: PayloadAction<PhotoLayer[]>) => {
      if (state.currentProject) {
        state.currentProject.layers = action.payload;
        state.currentProject.updatedAt = new Date().toISOString();
      }
    },
    saveCurrentProjectToDrafts: (state) => {
      if (state.currentProject) {
        const index = state.projects.findIndex((p) => p.id === state.currentProject!.id);
        if (index !== -1) {
          state.projects[index] = state.currentProject;
        } else {
          state.projects.unshift(state.currentProject);
        }
      }
    },
  },
});

export const {
  loadProjects,
  createProject,
  deleteProject,
  selectProject,
  closeProject,
  updateProject,
  updateLayers,
  saveCurrentProjectToDrafts,
} = photoEditorSlice.actions;

export default photoEditorSlice.reducer;
