import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { stringify } from 'yaml';
import type { FurlowSpec } from '@furlow/schema';

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  spec: FurlowSpec;
}

const createEmptySpec = (): FurlowSpec => ({
  version: '1.0.0',
  identity: {
    name: 'MyBot',
  },
  commands: [],
  events: [],
  flows: [],
});

export const useSchemaStore = defineStore('schema', () => {
  const currentProject = ref<Project | null>(null);
  const spec = ref<FurlowSpec>(createEmptySpec());
  const savedProjects = ref<Project[]>([]);

  // Load projects from localStorage on init
  const loadSavedProjects = () => {
    try {
      const saved = localStorage.getItem('furlow-projects');
      if (saved) {
        savedProjects.value = JSON.parse(saved);
      }
    } catch {
      savedProjects.value = [];
    }
  };

  // Save projects to localStorage
  const persistProjects = () => {
    localStorage.setItem('furlow-projects', JSON.stringify(savedProjects.value));
  };

  // Create a new project
  const newProject = (name?: string) => {
    const project: Project = {
      id: crypto.randomUUID(),
      name: name || 'Untitled Bot',
      createdAt: new Date(),
      updatedAt: new Date(),
      spec: createEmptySpec(),
    };
    currentProject.value = project;
    spec.value = project.spec;
  };

  // Load an existing project
  const loadProject = (projectId: string) => {
    const project = savedProjects.value.find((p) => p.id === projectId);
    if (project) {
      currentProject.value = { ...project };
      spec.value = { ...project.spec };
    }
  };

  // Save current project
  const saveProject = () => {
    if (!currentProject.value) {
      newProject();
    }

    currentProject.value!.spec = { ...spec.value };
    currentProject.value!.updatedAt = new Date();

    const existingIndex = savedProjects.value.findIndex(
      (p) => p.id === currentProject.value!.id
    );

    if (existingIndex >= 0) {
      savedProjects.value[existingIndex] = { ...currentProject.value! };
    } else {
      savedProjects.value.push({ ...currentProject.value! });
    }

    persistProjects();
  };

  // Delete a project
  const deleteProject = (projectId: string) => {
    savedProjects.value = savedProjects.value.filter((p) => p.id !== projectId);
    persistProjects();

    if (currentProject.value?.id === projectId) {
      currentProject.value = null;
      spec.value = createEmptySpec();
    }
  };

  // Update a section of the spec
  const updateSection = <K extends keyof FurlowSpec>(
    section: K,
    value: FurlowSpec[K]
  ) => {
    spec.value[section] = value;
  };

  // Get the current YAML output
  const yamlOutput = computed(() => {
    // Filter out empty arrays and undefined values
    const cleanSpec = Object.fromEntries(
      Object.entries(spec.value).filter(([_, v]) => {
        if (v === undefined || v === null) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        if (typeof v === 'object' && Object.keys(v).length === 0) return false;
        return true;
      })
    );
    return stringify(cleanSpec, { indent: 2 });
  });

  // Export as .furlow.yaml file
  const exportYaml = () => {
    const yaml = yamlOutput.value;
    const filename = `${currentProject.value?.name || 'bot'}.furlow.yaml`;

    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Initialize
  loadSavedProjects();
  if (!currentProject.value) {
    newProject();
  }

  return {
    currentProject,
    spec,
    savedProjects,
    newProject,
    loadProject,
    saveProject,
    deleteProject,
    updateSection,
    yamlOutput,
    exportYaml,
  };
});
