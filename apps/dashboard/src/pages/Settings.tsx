/**
 * Guild Settings Page
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { guildApi, userApi, type Guild, type GuildSettings, type User } from '../api/client';
import { Layout } from '../components/Layout';
import { useGuildWebSocket } from '../hooks/useWebSocket';

export function Settings() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { botStatus } = useGuildWebSocket(id);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      userApi.getUser(),
      guildApi.getGuilds().then((guilds) => guilds.find((g) => g.id === id) || null),
      guildApi.getSettings(id),
    ])
      .then(([userData, guildData, settingsData]) => {
        setUser(userData);
        setGuild(guildData);
        setSettings(settingsData);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id || !settings) return;

    setSaving(true);
    try {
      await guildApi.updateSettings(id, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof GuildSettings>(key: K, value: GuildSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  const toggleModule = (module: keyof GuildSettings['modules']) => {
    if (!settings) return;
    setSettings({
      ...settings,
      modules: {
        ...settings.modules,
        [module]: { enabled: !settings.modules[module].enabled },
      },
    });
    setSaved(false);
  };

  if (loading || !guild || !settings) {
    return (
      <Layout user={user} guild={guild} botStatus={botStatus}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: '#b9bbbe' }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} guild={guild} botStatus={botStatus}>
      <div style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#fff' }}>Server Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{
              padding: '0.75rem 1.5rem',
              background: saved ? '#43b581' : '#e94560',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* General Settings */}
        <Section title="General">
          <Field label="Command Prefix">
            <input
              type="text"
              value={settings.prefix}
              onChange={(e) => updateSetting('prefix', e.target.value)}
              style={inputStyle}
              maxLength={5}
            />
          </Field>

          <Field label="Language">
            <select
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
              style={inputStyle}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
            </select>
          </Field>

          <Field label="Timezone">
            <select
              value={settings.timezone}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              style={inputStyle}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </Field>
        </Section>

        {/* Modules */}
        <Section title="Modules">
          <p style={{ color: '#b9bbbe', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Enable or disable bot modules for this server.
          </p>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <ModuleToggle
              name="Moderation"
              description="Warnings, kicks, bans, mutes, and more"
              enabled={settings.modules.moderation.enabled}
              onToggle={() => toggleModule('moderation')}
            />
            <ModuleToggle
              name="Welcome"
              description="Welcome messages and auto-roles for new members"
              enabled={settings.modules.welcome.enabled}
              onToggle={() => toggleModule('welcome')}
            />
            <ModuleToggle
              name="Leveling"
              description="XP system with levels and rewards"
              enabled={settings.modules.leveling.enabled}
              onToggle={() => toggleModule('leveling')}
            />
            <ModuleToggle
              name="Logging"
              description="Log server events to designated channels"
              enabled={settings.modules.logging.enabled}
              onToggle={() => toggleModule('logging')}
            />
            <ModuleToggle
              name="Music"
              description="Music playback in voice channels"
              enabled={settings.modules.music.enabled}
              onToggle={() => toggleModule('music')}
            />
            <ModuleToggle
              name="Tickets"
              description="Support ticket system"
              enabled={settings.modules.tickets.enabled}
              onToggle={() => toggleModule('tickets')}
            />
          </div>
        </Section>
      </div>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#16213e',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    }}>
      <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '1.5rem' }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{
        display: 'block',
        color: '#b9bbbe',
        marginBottom: '0.5rem',
        fontSize: '0.875rem',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ModuleToggle({
  name,
  description,
  enabled,
  onToggle,
}: {
  name: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      background: '#0f3460',
      borderRadius: '8px',
    }}>
      <div>
        <div style={{ color: '#fff', fontWeight: 500 }}>{name}</div>
        <div style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>{description}</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          width: '48px',
          height: '24px',
          borderRadius: '12px',
          border: 'none',
          background: enabled ? '#43b581' : '#4f545c',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute',
          top: '2px',
          left: enabled ? '26px' : '2px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '300px',
  padding: '0.75rem',
  background: '#0f3460',
  border: '1px solid #0f3460',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '1rem',
};

export default Settings;
