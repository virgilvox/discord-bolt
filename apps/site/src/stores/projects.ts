import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import Dexie, { type Table } from 'dexie';
import type { FurlowSpec } from '@furlow/schema';

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  spec: FurlowSpec;
}

// Define the database
class FurlowDatabase extends Dexie {
  projects!: Table<Project>;

  constructor() {
    super('FurlowBuilderDB');
    this.version(1).stores({
      projects: 'id, name, createdAt, updatedAt',
    });
  }
}

const db = new FurlowDatabase();

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const sortedProjects = computed(() =>
    [...projects.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  );

  const loadProjects = async () => {
    loading.value = true;
    error.value = null;
    try {
      projects.value = await db.projects.toArray();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load projects';
      console.error('Failed to load projects:', e);
    } finally {
      loading.value = false;
    }
  };

  const getProject = async (id: string): Promise<Project | undefined> => {
    try {
      return await db.projects.get(id);
    } catch (e) {
      console.error('Failed to get project:', e);
      return undefined;
    }
  };

  const saveProject = async (project: Project): Promise<void> => {
    try {
      project.updatedAt = new Date();
      await db.projects.put(project);
      await loadProjects();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save project';
      console.error('Failed to save project:', e);
    }
  };

  const createProject = async (name: string, spec?: FurlowSpec): Promise<Project> => {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      spec: spec || {
        version: '1.0.0',
        identity: { name: 'MyBot' },
        commands: [],
        events: [],
        flows: [],
      },
    };

    await saveProject(project);
    return project;
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      await db.projects.delete(id);
      await loadProjects();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete project';
      console.error('Failed to delete project:', e);
    }
  };

  const duplicateProject = async (id: string): Promise<Project | undefined> => {
    const original = await getProject(id);
    if (!original) return undefined;

    return createProject(`${original.name} (Copy)`, original.spec);
  };

  const exportProject = (project: Project): string => {
    return JSON.stringify(project, null, 2);
  };

  const importProject = async (jsonString: string): Promise<Project | undefined> => {
    try {
      const data = JSON.parse(jsonString);
      const project: Project = {
        id: crypto.randomUUID(),
        name: data.name || 'Imported Project',
        createdAt: new Date(),
        updatedAt: new Date(),
        spec: data.spec || data,
      };
      await saveProject(project);
      return project;
    } catch (e) {
      error.value = 'Invalid project file';
      console.error('Failed to import project:', e);
      return undefined;
    }
  };

  const getStorageUsage = async (): Promise<{ used: number; quota: number } | null> => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // Initialize
  loadProjects();

  return {
    projects,
    sortedProjects,
    loading,
    error,
    loadProjects,
    getProject,
    saveProject,
    createProject,
    deleteProject,
    duplicateProject,
    exportProject,
    importProject,
    getStorageUsage,
  };
});
