/**
 * Section schemas for the Furlow Schema Builder
 * Defines the structure and fields for each spec section
 */

export interface SectionField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'color' | 'object' | 'array';
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ label: string; value: string }>;
  nested?: SectionField[];
}

export interface SectionSchema {
  id: string;
  title: string;
  icon: string;
  description: string;
  fields: SectionField[];
}

export const sectionSchemas: SectionSchema[] = [
  {
    id: 'identity',
    title: 'Identity',
    icon: 'fas fa-robot',
    description: 'Bot identity and branding configuration',
    fields: [
      { name: 'name', type: 'text', label: 'Bot Name', placeholder: 'MyBot', required: true },
      { name: 'avatar', type: 'text', label: 'Avatar URL', placeholder: 'https://...' },
      { name: 'banner', type: 'text', label: 'Banner URL', placeholder: 'https://...' },
      { name: 'description', type: 'textarea', label: 'Description', placeholder: 'A helpful Discord bot...' },
    ],
  },
  {
    id: 'presence',
    title: 'Presence',
    icon: 'fas fa-circle-dot',
    description: 'Bot presence and activity settings',
    fields: [
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        options: [
          { label: 'Online', value: 'online' },
          { label: 'Idle', value: 'idle' },
          { label: 'Do Not Disturb', value: 'dnd' },
          { label: 'Invisible', value: 'invisible' },
        ],
      },
      {
        name: 'activity.type',
        type: 'select',
        label: 'Activity Type',
        options: [
          { label: 'Playing', value: 'playing' },
          { label: 'Streaming', value: 'streaming' },
          { label: 'Listening', value: 'listening' },
          { label: 'Watching', value: 'watching' },
          { label: 'Competing', value: 'competing' },
        ],
      },
      { name: 'activity.name', type: 'text', label: 'Activity Name', placeholder: 'with YAML' },
      { name: 'activity.url', type: 'text', label: 'Stream URL', placeholder: 'https://twitch.tv/...' },
    ],
  },
  {
    id: 'permissions',
    title: 'Permissions',
    icon: 'fas fa-shield',
    description: 'Permission levels and access control',
    fields: [
      {
        name: 'default_level',
        type: 'select',
        label: 'Default Level',
        options: [
          { label: 'None', value: '0' },
          { label: 'User', value: '1' },
          { label: 'Moderator', value: '2' },
          { label: 'Admin', value: '3' },
          { label: 'Owner', value: '4' },
        ],
      },
      { name: 'owner_ids', type: 'text', label: 'Owner IDs', placeholder: 'Comma-separated IDs' },
    ],
  },
  {
    id: 'state',
    title: 'State',
    icon: 'fas fa-database',
    description: 'State variables and storage configuration',
    fields: [
      {
        name: 'storage',
        type: 'select',
        label: 'Storage Backend',
        options: [
          { label: 'Memory', value: 'memory' },
          { label: 'SQLite', value: 'sqlite' },
          { label: 'PostgreSQL', value: 'postgres' },
        ],
      },
      { name: 'database_url', type: 'text', label: 'Database URL', placeholder: 'sqlite://./data.db' },
    ],
  },
  {
    id: 'theme',
    title: 'Theme',
    icon: 'fas fa-palette',
    description: 'Theme colors for embeds and messages',
    fields: [
      { name: 'primary_color', type: 'color', label: 'Primary Color', default: '#ff6b35' },
      { name: 'success_color', type: 'color', label: 'Success Color', default: '#8bd649' },
      { name: 'error_color', type: 'color', label: 'Error Color', default: '#e05555' },
      { name: 'warning_color', type: 'color', label: 'Warning Color', default: '#f0c040' },
      { name: 'info_color', type: 'color', label: 'Info Color', default: '#5ba8f5' },
    ],
  },
  {
    id: 'voice',
    title: 'Voice',
    icon: 'fas fa-microphone',
    description: 'Voice channel and music configuration',
    fields: [
      { name: 'enabled', type: 'boolean', label: 'Enable Voice' },
      { name: 'default_volume', type: 'number', label: 'Default Volume', placeholder: '50' },
      { name: 'max_queue_size', type: 'number', label: 'Max Queue Size', placeholder: '100' },
      { name: 'leave_on_empty', type: 'boolean', label: 'Leave on Empty Channel' },
      { name: 'leave_delay', type: 'text', label: 'Leave Delay', placeholder: '5m' },
    ],
  },
  {
    id: 'automod',
    title: 'Automod',
    icon: 'fas fa-gavel',
    description: 'Automatic moderation settings',
    fields: [
      { name: 'enabled', type: 'boolean', label: 'Enable Automod' },
      { name: 'log_channel', type: 'text', label: 'Log Channel ID' },
    ],
  },
  {
    id: 'scheduler',
    title: 'Scheduler',
    icon: 'fas fa-clock',
    description: 'Scheduled tasks and cron jobs',
    fields: [
      { name: 'enabled', type: 'boolean', label: 'Enable Scheduler' },
      { name: 'timezone', type: 'text', label: 'Timezone', placeholder: 'UTC' },
    ],
  },
  {
    id: 'locale',
    title: 'Locale',
    icon: 'fas fa-globe',
    description: 'Localization and language settings',
    fields: [
      { name: 'default', type: 'text', label: 'Default Locale', placeholder: 'en-US' },
      { name: 'fallback', type: 'text', label: 'Fallback Locale', placeholder: 'en' },
    ],
  },
  {
    id: 'canvas',
    title: 'Canvas',
    icon: 'fas fa-image',
    description: 'Image generation configuration',
    fields: [
      { name: 'enabled', type: 'boolean', label: 'Enable Canvas' },
      { name: 'fonts_dir', type: 'text', label: 'Fonts Directory', placeholder: './fonts' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: 'fas fa-chart-line',
    description: 'Analytics and metrics configuration',
    fields: [
      { name: 'enabled', type: 'boolean', label: 'Enable Analytics' },
      { name: 'prometheus.enabled', type: 'boolean', label: 'Enable Prometheus' },
      { name: 'prometheus.port', type: 'number', label: 'Prometheus Port', placeholder: '9090' },
      { name: 'prometheus.path', type: 'text', label: 'Metrics Path', placeholder: '/metrics' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'fas fa-gauge-high',
    description: 'Web dashboard configuration',
    fields: [
      { name: 'enabled', type: 'boolean', label: 'Enable Dashboard' },
      { name: 'port', type: 'number', label: 'Port', placeholder: '3000' },
      { name: 'host', type: 'text', label: 'Host', placeholder: 'localhost' },
      { name: 'branding.name', type: 'text', label: 'Dashboard Name', placeholder: 'Bot Dashboard' },
      { name: 'branding.logo', type: 'text', label: 'Logo URL' },
    ],
  },
  {
    id: 'errors',
    title: 'Errors',
    icon: 'fas fa-triangle-exclamation',
    description: 'Error handling configuration',
    fields: [
      { name: 'default_handler', type: 'text', label: 'Default Handler' },
      { name: 'log_errors', type: 'boolean', label: 'Log Errors' },
    ],
  },
];

export const getSectionSchema = (id: string): SectionSchema | undefined => {
  return sectionSchemas.find((s) => s.id === id);
};
