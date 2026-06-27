import { configureStore, createSlice } from "@reduxjs/toolkit";
import videoEditorReducer from "./videoEditorSlice";

const editorSlice = createSlice({
  name: "editor",
  initialState: {
    activeTool: null,
    undoStack: [],
    redoStack: [],
    timelineTracks: []
  },
  reducers: {
    setActiveTool(state, action) {
      state.activeTool = action.payload;
    }
  }
});

export const { setActiveTool } = editorSlice.actions;

export const store = configureStore({
  reducer: {
    editor: editorSlice.reducer,
    videoEditor: videoEditorReducer
  }
});
