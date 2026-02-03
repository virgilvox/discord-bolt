/**
 * Dashboard API Routes
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express';
import type { Profile } from 'passport-discord';

const router: RouterType = Router();

// Type augmentation for session user
declare global {
  namespace Express {
    interface User extends Profile {}
  }
}

// Middleware to check authentication
function requireAuth(req: Request, res: Response, next: () => void): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

// Middleware to check guild access
function requireGuildAccess(req: Request, res: Response, next: () => void): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const guildId = req.params.id;
  const user = req.user as Profile;
  const guild = user.guilds?.find((g) => g.id === guildId);

  if (!guild) {
    res.status(404).json({ error: 'Guild not found' });
    return;
  }

  // Check for MANAGE_GUILD permission (0x20)
  if ((parseInt(guild.permissions) & 0x20) !== 0x20) {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  next();
}

// ========================================
// User Routes
// ========================================

/**
 * GET /api/user
 * Get the current authenticated user
 */
router.get('/user', requireAuth, (req: Request, res: Response): void => {
  const user = req.user as Profile;
  res.json({
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    email: user.email,
  });
});

// ========================================
// Guild Routes
// ========================================

/**
 * GET /api/guilds
 * Get all guilds the user can manage
 */
router.get('/guilds', requireAuth, (req: Request, res: Response): void => {
  const user = req.user as Profile;
  const guilds = user.guilds?.filter(
    (g) => (parseInt(g.permissions) & 0x20) === 0x20
  ).map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.icon,
    owner: g.owner,
    permissions: g.permissions,
  }));
  res.json(guilds ?? []);
});

/**
 * GET /api/guilds/:id
 * Get guild details
 */
router.get('/guilds/:id', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const guildId = req.params.id;
  const user = req.user as Profile;
  const guild = user.guilds?.find((g) => g.id === guildId);

  // In a real implementation, this would fetch from the bot's cache or Discord API
  res.json({
    id: guild?.id,
    name: guild?.name,
    icon: guild?.icon,
    owner: guild?.owner,
    memberCount: 0, // Would come from bot
    botJoined: false, // Would check if bot is in guild
  });
});

/**
 * GET /api/guilds/:id/settings
 * Get guild settings
 */
router.get('/guilds/:id/settings', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const guildId = req.params.id;

  // In production, fetch from storage adapter
  // const storage = getStorage();
  // const settings = await storage.get(`guild:${guildId}:settings`);

  // Return default settings for now
  res.json({
    prefix: '!',
    language: 'en',
    timezone: 'UTC',
    modules: {
      moderation: { enabled: true },
      welcome: { enabled: false },
      leveling: { enabled: false },
      logging: { enabled: false },
      music: { enabled: false },
      tickets: { enabled: false },
    },
  });
});

/**
 * POST /api/guilds/:id/settings
 * Update guild settings
 */
router.post('/guilds/:id/settings', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const guildId = req.params.id;
  const settings = req.body;

  // Validate settings
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'Invalid settings' });
    return;
  }

  // In production, save to storage adapter
  // const storage = getStorage();
  // await storage.set(`guild:${guildId}:settings`, settings);

  res.json({ success: true, settings });
});

/**
 * GET /api/guilds/:id/stats
 * Get guild statistics
 */
router.get('/guilds/:id/stats', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const guildId = req.params.id;

  // In production, fetch from bot's metrics
  res.json({
    memberCount: 0,
    onlineCount: 0,
    messageCount24h: 0,
    commandsUsed24h: 0,
    activeUsers7d: 0,
    topChannels: [],
    topCommands: [],
    growth: {
      members: [],
      messages: [],
    },
  });
});

// ========================================
// Moderation Routes
// ========================================

/**
 * GET /api/guilds/:id/warnings
 * Get moderation warnings/cases
 */
router.get('/guilds/:id/warnings', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const guildId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  // In production, fetch from storage
  res.json({
    warnings: [],
    total: 0,
    page,
    limit,
    pages: 0,
  });
});

/**
 * GET /api/guilds/:id/warnings/:caseId
 * Get a specific moderation case
 */
router.get('/guilds/:id/warnings/:caseId', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const { id: guildId, caseId } = req.params;

  // In production, fetch specific case
  res.json({
    id: caseId,
    guildId,
    type: 'warning',
    userId: '',
    moderatorId: '',
    reason: '',
    createdAt: new Date().toISOString(),
  });
});

/**
 * DELETE /api/guilds/:id/warnings/:caseId
 * Delete/revoke a moderation case
 */
router.delete('/guilds/:id/warnings/:caseId', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const { id: guildId, caseId } = req.params;

  // In production, delete from storage
  res.json({ success: true, caseId });
});

// ========================================
// Leveling Routes
// ========================================

/**
 * GET /api/guilds/:id/levels
 * Get leveling leaderboard
 */
router.get('/guilds/:id/levels', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const guildId = req.params.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  // In production, fetch from storage
  res.json({
    leaderboard: [],
    total: 0,
    page,
    limit,
    pages: 0,
  });
});

/**
 * GET /api/guilds/:id/levels/:userId
 * Get a user's level info
 */
router.get('/guilds/:id/levels/:userId', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const { id: guildId, userId } = req.params;

  // In production, fetch from storage
  res.json({
    userId,
    guildId,
    xp: 0,
    level: 0,
    rank: 0,
    messages: 0,
  });
});

/**
 * POST /api/guilds/:id/levels/:userId
 * Update a user's XP/level
 */
router.post('/guilds/:id/levels/:userId', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const { id: guildId, userId } = req.params;
  const { xp, level } = req.body;

  // In production, update storage
  res.json({
    success: true,
    userId,
    xp: xp ?? 0,
    level: level ?? 0,
  });
});

// ========================================
// Module-specific Routes
// ========================================

/**
 * GET /api/guilds/:id/welcome
 * Get welcome settings
 */
router.get('/guilds/:id/welcome', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  res.json({
    enabled: false,
    channel: null,
    message: 'Welcome {user} to {server}!',
    dm: false,
    dmMessage: null,
    roles: [],
  });
});

/**
 * POST /api/guilds/:id/welcome
 * Update welcome settings
 */
router.post('/guilds/:id/welcome', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const settings = req.body;
  res.json({ success: true, ...settings });
});

/**
 * GET /api/guilds/:id/logging
 * Get logging settings
 */
router.get('/guilds/:id/logging', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  res.json({
    enabled: false,
    channels: {
      messages: null,
      members: null,
      moderation: null,
      server: null,
    },
    events: [],
  });
});

/**
 * POST /api/guilds/:id/logging
 * Update logging settings
 */
router.post('/guilds/:id/logging', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const settings = req.body;
  res.json({ success: true, ...settings });
});

/**
 * GET /api/guilds/:id/automod
 * Get automod settings
 */
router.get('/guilds/:id/automod', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  res.json({
    enabled: false,
    rules: [],
    exemptRoles: [],
    exemptChannels: [],
  });
});

/**
 * POST /api/guilds/:id/automod
 * Update automod settings
 */
router.post('/guilds/:id/automod', requireAuth, requireGuildAccess, async (req: Request, res: Response): Promise<void> => {
  const settings = req.body;
  res.json({ success: true, ...settings });
});

export default router;
