import AsyncStorage from "@react-native-async-storage/async-storage";
import { VideoProject } from "../types";

const PROJECTS_STORAGE_KEY = "@quickstudio_video_projects";
const RECENT_DRAFT_KEY = "@quickstudio_video_recent_draft";

/**
 * Save all video projects to local device storage.
 */
export const saveProjectsToDisk = async (projects: VideoProject[]): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(projects);
    await AsyncStorage.setItem(PROJECTS_STORAGE_KEY, jsonValue);
    return true;
  } catch (error) {
    console.error("Failed to save projects to disk:", error);
    return false;
  }
};

/**
 * Retrieve all video projects from local storage.
 */
export const loadProjectsFromDisk = async (): Promise<VideoProject[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(PROJECTS_STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error("Failed to load projects from disk:", error);
    return [];
  }
};

/**
 * Save the ID of the most recently open project for crash recovery or quick resuming.
 */
export const saveRecentActiveProject = async (projectId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(RECENT_DRAFT_KEY, projectId);
  } catch (error) {
    console.error("Failed to save recent active project id:", error);
  }
};

/**
 * Retrieve the ID of the most recently open project.
 */
export const loadRecentActiveProject = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(RECENT_DRAFT_KEY);
  } catch (error) {
    console.error("Failed to load recent active project id:", error);
    return null;
  }
};
