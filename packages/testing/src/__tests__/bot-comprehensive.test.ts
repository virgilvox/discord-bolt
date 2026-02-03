/**
 * Comprehensive Bot Integration Tests
 *
 * Tests ALL Discord bot scenarios, components, and features:
 * - All command types (slash, context menu, subcommands)
 * - All option types (string, integer, user, channel, role, etc.)
 * - All component types (buttons, selects, modals)
 * - All event types (messages, members, voice, reactions)
 * - Real bot scenarios (moderation, welcome, tickets, leveling, etc.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import {
  loadSpecFromString,
  createEvaluator,
  createActionRegistry,
  createActionExecutor,
  createFlowEngine,
} from '@furlow/core';
import type { Action, FurlowSpec } from '@furlow/schema';
import type { ActionHandler, ActionContext } from '@furlow/core';

// ==========================================
// Enhanced Mock Discord.js Implementation
// ==========================================

class MockUser {
  id: string;
  username: string;
  displayName: string;
  discriminator: string;
  bot: boolean;
  tag: string;
  avatar: string | null;
  createdAt: Date;

  constructor(data: Partial<MockUser> = {}) {
    this.id = data.id ?? '123456789012345678';
    this.username = data.username ?? 'TestUser';
    this.displayName = data.displayName ?? data.username ?? 'TestUser';
    this.discriminator = data.discriminator ?? '0001';
    this.bot = data.bot ?? false;
    this.tag = `${this.username}#${this.discriminator}`;
    this.avatar = data.avatar ?? null;
    this.createdAt = data.createdAt ?? new Date('2020-01-01');
  }

  toString() {
    return `<@${this.id}>`;
  }

  avatarURL() {
    return this.avatar ? `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.png` : null;
  }
}

class MockRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: bigint;
  mentionable: boolean;

  constructor(data: Partial<MockRole> = {}) {
    this.id = data.id ?? '111111111111111111';
    this.name = data.name ?? 'Member';
    this.color = data.color ?? 0;
    this.position = data.position ?? 1;
    this.permissions = data.permissions ?? BigInt(0);
    this.mentionable = data.mentionable ?? false;
  }

  toString() {
    return `<@&${this.id}>`;
  }
}

class MockRoleManager {
  cache = new Map<string, MockRole>();
  private member: MockMember;

  constructor(member: MockMember) {
    this.member = member;
  }

  async add(role: string | MockRole) {
    const roleId = typeof role === 'string' ? role : role.id;
    const mockRole = new MockRole({ id: roleId });
    this.cache.set(roleId, mockRole);
    return this.member;
  }

  async remove(role: string | MockRole) {
    const roleId = typeof role === 'string' ? role : role.id;
    this.cache.delete(roleId);
    return this.member;
  }

  has(roleId: string) {
    return this.cache.has(roleId);
  }
}

class MockMember {
  user: MockUser;
  nickname: string | null;
  roles: MockRoleManager;
  joinedAt: Date;
  communicationDisabledUntil: Date | null = null;
  voice: MockVoiceState;
  guild: MockGuild;
  pending = false;
  kickable = true;
  bannable = true;
  moderatable = true;

  constructor(user: MockUser, guild: MockGuild, data: Partial<MockMember> = {}) {
    this.user = user;
    this.guild = guild;
    this.nickname = data.nickname ?? null;
    this.roles = new MockRoleManager(this);
    this.joinedAt = data.joinedAt ?? new Date();
    this.voice = new MockVoiceState(this);
  }

  get displayName() {
    return this.nickname ?? this.user.username;
  }

  get id() {
    return this.user.id;
  }

  async kick(reason?: string) {
    return this;
  }

  async ban(options?: { reason?: string; deleteMessageDays?: number }) {
    return this;
  }

  async timeout(duration: number | null, reason?: string) {
    if (duration) {
      this.communicationDisabledUntil = new Date(Date.now() + duration);
    } else {
      this.communicationDisabledUntil = null;
    }
    return this;
  }

  async setNickname(nickname: string | null) {
    this.nickname = nickname;
    return this;
  }

  permissionsIn(channel: MockChannel) {
    return new MockPermissions(['SendMessages', 'ViewChannel']);
  }
}

class MockVoiceState {
  member: MockMember;
  channelId: string | null = null;
  channel: MockVoiceChannel | null = null;
  deaf = false;
  mute = false;
  selfDeaf = false;
  selfMute = false;
  streaming = false;
  selfVideo = false;

  constructor(member: MockMember) {
    this.member = member;
  }

  async setChannel(channel: MockVoiceChannel | null) {
    this.channel = channel;
    this.channelId = channel?.id ?? null;
    return this;
  }

  async setDeaf(deaf: boolean) {
    this.deaf = deaf;
    return this;
  }

  async setMute(mute: boolean) {
    this.mute = mute;
    return this;
  }
}

class MockPermissions {
  private perms: Set<string>;

  constructor(perms: string[] = []) {
    this.perms = new Set(perms);
  }

  has(permission: string | string[]) {
    if (Array.isArray(permission)) {
      return permission.every(p => this.perms.has(p));
    }
    return this.perms.has(permission);
  }

  toArray() {
    return [...this.perms];
  }
}

class MockChannel {
  id: string;
  name: string;
  type: number;
  guildId: string;
  parentId: string | null = null;
  topic: string | null = null;
  nsfw = false;
  rateLimitPerUser = 0;
  messages: MockMessage[] = [];
  lastMessageId: string | null = null;

  constructor(data: Partial<MockChannel> = {}) {
    this.id = data.id ?? '111222333444555666';
    this.name = data.name ?? 'general';
    this.type = data.type ?? 0;
    this.guildId = data.guildId ?? '987654321098765432';
    this.topic = data.topic ?? null;
  }

  async send(content: string | MessagePayload) {
    const messageContent = typeof content === 'string' ? content : content.content ?? '';
    const message = new MockMessage({
      content: messageContent,
      channelId: this.id,
      guildId: this.guildId,
      embeds: typeof content === 'object' ? content.embeds : undefined,
      components: typeof content === 'object' ? content.components : undefined,
    });
    this.messages.push(message);
    this.lastMessageId = message.id;
    return message;
  }

  async setName(name: string) {
    this.name = name;
    return this;
  }

  async setTopic(topic: string) {
    this.topic = topic;
    return this;
  }

  async delete() {
    return this;
  }

  toString() {
    return `<#${this.id}>`;
  }

  isTextBased() {
    return this.type === 0 || this.type === 5;
  }

  isVoiceBased() {
    return this.type === 2 || this.type === 13;
  }
}

class MockVoiceChannel extends MockChannel {
  bitrate = 64000;
  userLimit = 0;
  members = new Map<string, MockMember>();

  constructor(data: Partial<MockVoiceChannel> = {}) {
    super({ ...data, type: 2 });
  }
}

class MockThreadChannel extends MockChannel {
  ownerId: string;
  archived = false;
  locked = false;

  constructor(data: Partial<MockThreadChannel> = {}) {
    super({ ...data, type: 11 });
    this.ownerId = data.ownerId ?? '123456789012345678';
  }

  async setArchived(archived: boolean) {
    this.archived = archived;
    return this;
  }

  async setLocked(locked: boolean) {
    this.locked = locked;
    return this;
  }
}

interface MessagePayload {
  content?: string;
  embeds?: MockEmbed[];
  components?: MockActionRow[];
  files?: unknown[];
}

class MockEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields: { name: string; value: string; inline?: boolean }[] = [];
  author?: { name: string; iconURL?: string };
  footer?: { text: string; iconURL?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  timestamp?: string;

  constructor(data: Partial<MockEmbed> = {}) {
    Object.assign(this, data);
  }
}

class MockActionRow {
  components: (MockButton | MockSelectMenu)[] = [];

  constructor(components: (MockButton | MockSelectMenu)[] = []) {
    this.components = components;
  }
}

class MockButton {
  customId?: string;
  label: string;
  style: number;
  disabled = false;
  url?: string;
  emoji?: { name: string };

  constructor(data: Partial<MockButton> = {}) {
    this.customId = data.customId;
    this.label = data.label ?? 'Button';
    this.style = data.style ?? 1;
    this.url = data.url;
  }
}

class MockSelectMenu {
  customId: string;
  placeholder?: string;
  minValues = 1;
  maxValues = 1;
  options: { label: string; value: string; description?: string }[] = [];
  disabled = false;

  constructor(data: Partial<MockSelectMenu> = {}) {
    this.customId = data.customId ?? 'select';
    this.placeholder = data.placeholder;
    this.options = data.options ?? [];
  }
}

class MockMessage {
  id: string;
  content: string;
  author: MockUser;
  member: MockMember | null;
  channelId: string;
  channel: MockChannel;
  guildId: string | null;
  guild: MockGuild | null;
  createdAt: Date;
  editedAt: Date | null = null;
  embeds: MockEmbed[] = [];
  components: MockActionRow[] = [];
  attachments = new Map();
  reactions = new MockReactionManager();
  replied = false;
  replyContent: string | null = null;
  deleted = false;
  pinned = false;
  reference: { messageId?: string } | null = null;

  constructor(data: Partial<MockMessage & { authorBot?: boolean; embeds?: MockEmbed[]; components?: MockActionRow[] }> = {}) {
    this.id = data.id ?? String(Date.now());
    this.content = data.content ?? '';
    this.author = data.author ?? new MockUser({ bot: data.authorBot ?? false });
    this.channelId = data.channelId ?? '111222333444555666';
    this.guildId = data.guildId ?? '987654321098765432';
    this.guild = null;
    this.channel = new MockChannel({ id: this.channelId, guildId: this.guildId ?? undefined });
    this.member = new MockMember(this.author, new MockGuild());
    this.createdAt = data.createdAt ?? new Date();
    this.embeds = data.embeds ?? [];
    this.components = data.components ?? [];
  }

  async reply(content: string | MessagePayload) {
    this.replied = true;
    this.replyContent = typeof content === 'string' ? content : content.content ?? '';
    const replyMessage = new MockMessage({
      content: this.replyContent,
      channelId: this.channelId,
      guildId: this.guildId ?? undefined,
    });
    replyMessage.reference = { messageId: this.id };
    return replyMessage;
  }

  async edit(content: string | MessagePayload) {
    this.content = typeof content === 'string' ? content : content.content ?? this.content;
    if (typeof content === 'object') {
      this.embeds = content.embeds ?? this.embeds;
      this.components = content.components ?? this.components;
    }
    this.editedAt = new Date();
    return this;
  }

  async delete() {
    this.deleted = true;
    return this;
  }

  async pin() {
    this.pinned = true;
    return this;
  }

  async unpin() {
    this.pinned = false;
    return this;
  }

  async react(emoji: string) {
    this.reactions.add(emoji);
    return this.reactions;
  }

  async startThread(options: { name: string }) {
    return new MockThreadChannel({ name: options.name, guildId: this.guildId ?? undefined });
  }
}

class MockReactionManager {
  cache = new Map<string, { emoji: string; count: number; users: Set<string> }>();

  add(emoji: string, userId = '123456789012345678') {
    const existing = this.cache.get(emoji);
    if (existing) {
      existing.count++;
      existing.users.add(userId);
    } else {
      this.cache.set(emoji, { emoji, count: 1, users: new Set([userId]) });
    }
  }

  async removeAll() {
    this.cache.clear();
  }
}

class MockGuild {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  channels = new MockGuildChannelManager();
  members = new MockGuildMemberManager();
  roles = new MockRoleCache();
  bans = new MockBanManager();
  emojis = new Map();
  icon: string | null = null;
  banner: string | null = null;
  description: string | null = null;
  premiumTier = 0;
  premiumSubscriptionCount = 0;
  createdAt = new Date('2020-01-01');

  constructor(data: Partial<MockGuild> = {}) {
    this.id = data.id ?? '987654321098765432';
    this.name = data.name ?? 'Test Server';
    this.ownerId = data.ownerId ?? '123456789012345678';
    this.memberCount = data.memberCount ?? 100;
  }

  iconURL() {
    return this.icon ? `https://cdn.discordapp.com/icons/${this.id}/${this.icon}.png` : null;
  }
}

class MockGuildChannelManager {
  cache = new Map<string, MockChannel>();

  async create(options: { name: string; type?: number; parent?: string }) {
    const channel = new MockChannel({
      id: String(Date.now()),
      name: options.name,
      type: options.type ?? 0,
      parentId: options.parent ?? null,
    });
    this.cache.set(channel.id, channel);
    return channel;
  }
}

class MockGuildMemberManager {
  cache = new Map<string, MockMember>();

  async fetch(userId: string) {
    return this.cache.get(userId);
  }

  async ban(user: string | MockUser, options?: { reason?: string }) {
    const userId = typeof user === 'string' ? user : user.id;
    this.cache.delete(userId);
    return { id: userId };
  }

  async kick(user: string | MockUser, reason?: string) {
    const userId = typeof user === 'string' ? user : user.id;
    this.cache.delete(userId);
    return { id: userId };
  }
}

class MockRoleCache {
  cache = new Map<string, MockRole>();

  constructor() {
    // Add default @everyone role
    this.cache.set('987654321098765432', new MockRole({ id: '987654321098765432', name: '@everyone' }));
  }

  async create(options: { name: string; color?: number; permissions?: bigint }) {
    const role = new MockRole({
      id: String(Date.now()),
      name: options.name,
      color: options.color,
    });
    this.cache.set(role.id, role);
    return role;
  }
}

class MockBanManager {
  cache = new Map<string, { user: MockUser; reason?: string }>();

  async create(user: MockUser | string, options?: { reason?: string }) {
    const userId = typeof user === 'string' ? user : user.id;
    const mockUser = typeof user === 'string' ? new MockUser({ id: user }) : user;
    this.cache.set(userId, { user: mockUser, reason: options?.reason });
    return { user: mockUser };
  }

  async remove(userId: string) {
    this.cache.delete(userId);
    return { id: userId };
  }
}

interface MockInteractionReply {
  content?: string;
  embeds?: MockEmbed[];
  ephemeral?: boolean;
  components?: MockActionRow[];
  files?: unknown[];
}

class MockBaseInteraction {
  id: string;
  user: MockUser;
  member: MockMember;
  channelId: string;
  channel: MockChannel;
  guildId: string;
  guild: MockGuild;
  replied = false;
  deferred = false;
  replyData: MockInteractionReply | null = null;
  followUps: MockInteractionReply[] = [];

  constructor() {
    this.id = String(Date.now());
    this.user = new MockUser();
    this.guild = new MockGuild();
    this.member = new MockMember(this.user, this.guild);
    this.channelId = '111222333444555666';
    this.guildId = '987654321098765432';
    this.channel = new MockChannel({ id: this.channelId, guildId: this.guildId });
  }

  async reply(data: string | MockInteractionReply) {
    this.replied = true;
    this.replyData = typeof data === 'string' ? { content: data } : data;
    return this;
  }

  async deferReply(options?: { ephemeral?: boolean }) {
    this.deferred = true;
    return this;
  }

  async editReply(data: string | MockInteractionReply) {
    this.replyData = typeof data === 'string' ? { content: data } : data;
    return this;
  }

  async followUp(data: string | MockInteractionReply) {
    const followUp = typeof data === 'string' ? { content: data } : data;
    this.followUps.push(followUp);
    return this;
  }

  async deleteReply() {
    this.replyData = null;
    return this;
  }

  isRepliable() {
    return true;
  }
}

class MockCommandInteraction extends MockBaseInteraction {
  commandName: string;
  commandType = 1; // CHAT_INPUT
  options: MockCommandInteractionOptions;

  constructor(commandName: string, options: Record<string, unknown> = {}) {
    super();
    this.commandName = commandName;
    this.options = new MockCommandInteractionOptions(options);
  }

  isChatInputCommand() { return true; }
  isButton() { return false; }
  isStringSelectMenu() { return false; }
  isUserSelectMenu() { return false; }
  isRoleSelectMenu() { return false; }
  isChannelSelectMenu() { return false; }
  isMentionableSelectMenu() { return false; }
  isModalSubmit() { return false; }
  isUserContextMenuCommand() { return false; }
  isMessageContextMenuCommand() { return false; }
  isAutocomplete() { return false; }
}

class MockCommandInteractionOptions {
  private data: Map<string, unknown>;

  constructor(options: Record<string, unknown>) {
    this.data = new Map(Object.entries(options));
  }

  getString(name: string) { return this.data.get(name) as string | null; }
  getInteger(name: string) { return this.data.get(name) as number | null; }
  getNumber(name: string) { return this.data.get(name) as number | null; }
  getBoolean(name: string) { return this.data.get(name) as boolean | null; }
  getUser(name: string) { return this.data.get(name) as MockUser | null; }
  getMember(name: string) { return this.data.get(name) as MockMember | null; }
  getChannel(name: string) { return this.data.get(name) as MockChannel | null; }
  getRole(name: string) { return this.data.get(name) as MockRole | null; }
  getAttachment(name: string) { return this.data.get(name); }
  getMentionable(name: string) { return this.data.get(name); }
  getSubcommand() { return this.data.get('_subcommand') as string | null; }
  getSubcommandGroup() { return this.data.get('_subcommandGroup') as string | null; }

  get(name: string) {
    return this.data.get(name);
  }
}

class MockUserContextMenuInteraction extends MockBaseInteraction {
  commandName: string;
  commandType = 2; // USER
  targetUser: MockUser;
  targetMember: MockMember;

  constructor(commandName: string, targetUser: MockUser) {
    super();
    this.commandName = commandName;
    this.targetUser = targetUser;
    this.targetMember = new MockMember(targetUser, this.guild);
  }

  isChatInputCommand() { return false; }
  isButton() { return false; }
  isStringSelectMenu() { return false; }
  isModalSubmit() { return false; }
  isUserContextMenuCommand() { return true; }
  isMessageContextMenuCommand() { return false; }
}

class MockMessageContextMenuInteraction extends MockBaseInteraction {
  commandName: string;
  commandType = 3; // MESSAGE
  targetMessage: MockMessage;

  constructor(commandName: string, targetMessage: MockMessage) {
    super();
    this.commandName = commandName;
    this.targetMessage = targetMessage;
  }

  isChatInputCommand() { return false; }
  isButton() { return false; }
  isStringSelectMenu() { return false; }
  isModalSubmit() { return false; }
  isUserContextMenuCommand() { return false; }
  isMessageContextMenuCommand() { return true; }
}

class MockButtonInteraction extends MockBaseInteraction {
  customId: string;
  message: MockMessage;

  constructor(customId: string, message?: MockMessage) {
    super();
    this.customId = customId;
    this.message = message ?? new MockMessage();
  }

  isChatInputCommand() { return false; }
  isButton() { return true; }
  isStringSelectMenu() { return false; }
  isModalSubmit() { return false; }
  isUserContextMenuCommand() { return false; }
  isMessageContextMenuCommand() { return false; }

  async update(data: MockInteractionReply) {
    this.replyData = data;
    if (data.content !== undefined) this.message.content = data.content;
    if (data.embeds) this.message.embeds = data.embeds;
    if (data.components) this.message.components = data.components;
    return this;
  }

  async deferUpdate() {
    this.deferred = true;
    return this;
  }
}

class MockSelectMenuInteraction extends MockBaseInteraction {
  customId: string;
  values: string[];
  message: MockMessage;

  constructor(customId: string, values: string[], message?: MockMessage) {
    super();
    this.customId = customId;
    this.values = values;
    this.message = message ?? new MockMessage();
  }

  isChatInputCommand() { return false; }
  isButton() { return false; }
  isStringSelectMenu() { return true; }
  isUserSelectMenu() { return false; }
  isRoleSelectMenu() { return false; }
  isModalSubmit() { return false; }
  isUserContextMenuCommand() { return false; }
  isMessageContextMenuCommand() { return false; }

  async update(data: MockInteractionReply) {
    this.replyData = data;
    return this;
  }
}

class MockModalSubmitInteraction extends MockBaseInteraction {
  customId: string;
  fields: MockModalFields;

  constructor(customId: string, fields: Record<string, string>) {
    super();
    this.customId = customId;
    this.fields = new MockModalFields(fields);
  }

  isChatInputCommand() { return false; }
  isButton() { return false; }
  isStringSelectMenu() { return false; }
  isModalSubmit() { return true; }
  isUserContextMenuCommand() { return false; }
  isMessageContextMenuCommand() { return false; }
}

class MockModalFields {
  private data: Record<string, string>;

  constructor(data: Record<string, string>) {
    this.data = data;
  }

  getTextInputValue(customId: string) {
    return this.data[customId] ?? '';
  }

  getField(customId: string) {
    return { value: this.data[customId] ?? '' };
  }
}

class MockAutocompleteInteraction extends MockBaseInteraction {
  commandName: string;
  options: MockCommandInteractionOptions;
  focused: { name: string; value: string };
  responded = false;

  constructor(commandName: string, focusedOption: { name: string; value: string }, options: Record<string, unknown> = {}) {
    super();
    this.commandName = commandName;
    this.focused = focusedOption;
    this.options = new MockCommandInteractionOptions(options);
  }

  isChatInputCommand() { return false; }
  isButton() { return false; }
  isStringSelectMenu() { return false; }
  isModalSubmit() { return false; }
  isUserContextMenuCommand() { return false; }
  isMessageContextMenuCommand() { return false; }
  isAutocomplete() { return true; }

  async respond(choices: { name: string; value: string }[]) {
    this.responded = true;
    return this;
  }
}

// Mock Discord Client
class MockDiscordClient extends EventEmitter {
  user: MockUser | null = null;
  guilds = { cache: new Map<string, MockGuild>() };
  channels = { cache: new Map<string, MockChannel>() };
  users = { cache: new Map<string, MockUser>() };
  private _isReady = false;
  ws = { ping: 50 };
  uptime = 0;

  async login(token: string) {
    this.user = new MockUser({ bot: true, username: 'TestBot', id: '999999999999999999' });
    this.users.cache.set(this.user.id, this.user);

    const guild = new MockGuild();
    const generalChannel = new MockChannel({ id: '111222333444555666', name: 'general', guildId: guild.id });
    const modLogChannel = new MockChannel({ id: '222333444555666777', name: 'mod-log', guildId: guild.id });
    const welcomeChannel = new MockChannel({ id: '333444555666777888', name: 'welcome', guildId: guild.id });
    const ticketsCategory = new MockChannel({ id: '444555666777888999', name: 'Tickets', type: 4, guildId: guild.id });
    const voiceChannel = new MockVoiceChannel({ id: '555666777888999000', name: 'Voice', guildId: guild.id });

    guild.channels.cache.set(generalChannel.id, generalChannel);
    guild.channels.cache.set(modLogChannel.id, modLogChannel);
    guild.channels.cache.set(welcomeChannel.id, welcomeChannel);
    guild.channels.cache.set(ticketsCategory.id, ticketsCategory);
    guild.channels.cache.set(voiceChannel.id, voiceChannel);

    this.guilds.cache.set(guild.id, guild);
    this.channels.cache.set(generalChannel.id, generalChannel);
    this.channels.cache.set(modLogChannel.id, modLogChannel);
    this.channels.cache.set(welcomeChannel.id, welcomeChannel);
    this.channels.cache.set(ticketsCategory.id, ticketsCategory);
    this.channels.cache.set(voiceChannel.id, voiceChannel);

    // Add some members
    const member1 = new MockMember(new MockUser({ id: '111', username: 'Alice' }), guild);
    const member2 = new MockMember(new MockUser({ id: '222', username: 'Bob' }), guild);
    const moderator = new MockMember(new MockUser({ id: '333', username: 'Mod' }), guild);
    moderator.roles.cache.set('mod_role', new MockRole({ id: 'mod_role', name: 'Moderator' }));

    guild.members.cache.set(member1.id, member1);
    guild.members.cache.set(member2.id, member2);
    guild.members.cache.set(moderator.id, moderator);

    this._isReady = true;
    this.uptime = Date.now();
    this.emit('ready', this);
    return token;
  }

  isReady() { return this._isReady; }

  async destroy() {
    this._isReady = false;
    this.removeAllListeners();
  }

  // Simulation helpers
  simulateMessage(content: string, options: Partial<{ authorBot: boolean; author: MockUser; channelId: string }> = {}) {
    const message = new MockMessage({
      content,
      authorBot: options.authorBot,
      author: options.author,
      channelId: options.channelId,
    });
    this.emit('messageCreate', message);
    return message;
  }

  simulateCommand(name: string, options: Record<string, unknown> = {}) {
    const interaction = new MockCommandInteraction(name, options);
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  simulateSubcommand(name: string, subcommand: string, options: Record<string, unknown> = {}) {
    const interaction = new MockCommandInteraction(name, { ...options, _subcommand: subcommand });
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  simulateButton(customId: string, message?: MockMessage) {
    const interaction = new MockButtonInteraction(customId, message);
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  simulateSelectMenu(customId: string, values: string[], message?: MockMessage) {
    const interaction = new MockSelectMenuInteraction(customId, values, message);
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  simulateModal(customId: string, fields: Record<string, string>) {
    const interaction = new MockModalSubmitInteraction(customId, fields);
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  simulateUserContextMenu(name: string, targetUser: MockUser) {
    const interaction = new MockUserContextMenuInteraction(name, targetUser);
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  simulateMessageContextMenu(name: string, targetMessage: MockMessage) {
    const interaction = new MockMessageContextMenuInteraction(name, targetMessage);
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  simulateAutocomplete(commandName: string, focused: { name: string; value: string }, options: Record<string, unknown> = {}) {
    const interaction = new MockAutocompleteInteraction(commandName, focused, options);
    this.emit('interactionCreate', interaction);
    return interaction;
  }

  simulateMemberJoin(user?: MockUser) {
    const guild = this.guilds.cache.values().next().value as MockGuild;
    const member = new MockMember(user ?? new MockUser({ username: 'NewUser' }), guild);
    guild.members.cache.set(member.id, member);
    guild.memberCount++;
    this.emit('guildMemberAdd', member);
    return member;
  }

  simulateMemberLeave(member: MockMember) {
    const guild = this.guilds.cache.get(member.guild.id);
    if (guild) {
      guild.members.cache.delete(member.id);
      guild.memberCount--;
    }
    this.emit('guildMemberRemove', member);
    return member;
  }

  simulateReactionAdd(message: MockMessage, emoji: string, user?: MockUser) {
    const reaction = { emoji: { name: emoji }, message, count: 1 };
    const reactionUser = user ?? new MockUser();
    this.emit('messageReactionAdd', reaction, reactionUser);
    return { reaction, user: reactionUser };
  }

  simulateVoiceStateUpdate(member: MockMember, oldChannel: MockVoiceChannel | null, newChannel: MockVoiceChannel | null) {
    const oldState = { ...member.voice, channel: oldChannel, channelId: oldChannel?.id ?? null };
    member.voice.channel = newChannel;
    member.voice.channelId = newChannel?.id ?? null;
    const newState = member.voice;
    this.emit('voiceStateUpdate', oldState, newState);
    return { oldState, newState };
  }

  simulateMessageUpdate(oldMessage: MockMessage, newContent: string) {
    const newMessage = new MockMessage({ ...oldMessage, content: newContent });
    newMessage.editedAt = new Date();
    this.emit('messageUpdate', oldMessage, newMessage);
    return { oldMessage, newMessage };
  }

  simulateMessageDelete(message: MockMessage) {
    message.deleted = true;
    this.emit('messageDelete', message);
    return message;
  }
}

// ==========================================
// Bot Runtime Factory
// ==========================================

interface BotRuntime {
  client: MockDiscordClient;
  spec: FurlowSpec;
  executedActions: Array<{ action: string; config: Action; context: ActionContext }>;
  replies: string[];
  embeds: MockEmbed[];
  dms: Array<{ userId: string; content: string }>;
  roleChanges: Array<{ userId: string; roleId: string; action: 'add' | 'remove' }>;
  bans: Array<{ userId: string; reason?: string }>;
  kicks: Array<{ userId: string; reason?: string }>;
  timeouts: Array<{ userId: string; duration: number }>;
  channelsCreated: MockChannel[];
  messagesDeleted: string[];
  start(): Promise<void>;
  stop(): Promise<void>;
  waitForActions(count?: number): Promise<void>;
}

function createTestBot(yamlSpec: string): BotRuntime {
  const spec = loadSpecFromString(yamlSpec);
  const client = new MockDiscordClient();
  const registry = createActionRegistry();
  const evaluator = createEvaluator();
  const flowEngine = createFlowEngine();

  const executedActions: BotRuntime['executedActions'] = [];
  const replies: string[] = [];
  const embeds: MockEmbed[] = [];
  const dms: BotRuntime['dms'] = [];
  const roleChanges: BotRuntime['roleChanges'] = [];
  const bans: BotRuntime['bans'] = [];
  const kicks: BotRuntime['kicks'] = [];
  const timeouts: BotRuntime['timeouts'] = [];
  const channelsCreated: MockChannel[] = [];
  const messagesDeleted: string[] = [];

  // Helper to create action handlers
  const createHandler = (name: string, customExecute?: (config: any, context: ActionContext) => Promise<any>): ActionHandler => ({
    name,
    execute: async (config, context) => {
      executedActions.push({ action: name, config, context });
      if (customExecute) {
        return customExecute(config, context);
      }
      return { success: true, data: { action: name } };
    },
  });

  // Reply action
  registry.register({
    name: 'reply',
    execute: async (config: any, context) => {
      const content = await evaluator.interpolate(config.content ?? '', context);
      replies.push(content);
      executedActions.push({ action: 'reply', config, result: content } as any);

      if (config.embed) {
        const embed = new MockEmbed(config.embed);
        embeds.push(embed);
      }

      return { success: true, data: { content } };
    },
  });

  // Send message action
  registry.register({
    name: 'send_message',
    execute: async (config: any, context) => {
      const content = await evaluator.interpolate(config.content ?? '', context);
      replies.push(content);
      executedActions.push({ action: 'send_message', config, result: content } as any);

      if (config.embed) {
        embeds.push(new MockEmbed(config.embed));
      }

      return { success: true, data: { content } };
    },
  });

  // Send DM action
  registry.register({
    name: 'send_dm',
    execute: async (config: any, context) => {
      const content = await evaluator.interpolate(config.content ?? '', context);
      const userId = await evaluator.interpolate(config.user ?? context.userId ?? '', context);
      dms.push({ userId, content });
      executedActions.push({ action: 'send_dm', config, context });
      return { success: true, data: { userId, content } };
    },
  });

  // Role actions
  registry.register({
    name: 'assign_role',
    execute: async (config: any, context) => {
      const roleId = await evaluator.interpolate(config.role ?? '', context);
      const userId = config.user ? await evaluator.interpolate(config.user, context) : context.userId;
      roleChanges.push({ userId: userId ?? '', roleId, action: 'add' });
      executedActions.push({ action: 'assign_role', config, context });
      return { success: true };
    },
  });

  registry.register({
    name: 'remove_role',
    execute: async (config: any, context) => {
      const roleId = await evaluator.interpolate(config.role ?? '', context);
      const userId = config.user ? await evaluator.interpolate(config.user, context) : context.userId;
      roleChanges.push({ userId: userId ?? '', roleId, action: 'remove' });
      executedActions.push({ action: 'remove_role', config, context });
      return { success: true };
    },
  });

  // Moderation actions
  registry.register({
    name: 'ban',
    execute: async (config: any, context) => {
      const userId = await evaluator.interpolate(config.user ?? '', context);
      const reason = config.reason ? await evaluator.interpolate(config.reason, context) : undefined;
      bans.push({ userId, reason });
      executedActions.push({ action: 'ban', config, context });
      return { success: true };
    },
  });

  registry.register({
    name: 'kick',
    execute: async (config: any, context) => {
      const userId = await evaluator.interpolate(config.user ?? '', context);
      const reason = config.reason ? await evaluator.interpolate(config.reason, context) : undefined;
      kicks.push({ userId, reason });
      executedActions.push({ action: 'kick', config, context });
      return { success: true };
    },
  });

  registry.register({
    name: 'timeout',
    execute: async (config: any, context) => {
      const userId = await evaluator.interpolate(config.user ?? '', context);
      let duration = config.duration ?? 60000;
      // Evaluate duration if it's an expression string
      if (typeof duration === 'string') {
        // Handle ${expr} syntax by using interpolate and parsing result
        const evaluated = await evaluator.interpolate(String(duration), context);
        duration = Number(evaluated) || 60000;
      }
      timeouts.push({ userId, duration: Number(duration) });
      executedActions.push({ action: 'timeout', config, context });
      return { success: true };
    },
  });

  // Channel actions
  registry.register({
    name: 'create_channel',
    execute: async (config: any, context) => {
      const name = await evaluator.interpolate(config.name ?? 'new-channel', context);
      const channel = new MockChannel({ name, type: config.type ?? 0 });
      channelsCreated.push(channel);
      executedActions.push({ action: 'create_channel', config, context });
      return { success: true, data: { channel } };
    },
  });

  registry.register({
    name: 'delete_message',
    execute: async (config: any, context) => {
      const messageId = config.message_id ?? (context as any).message?.id;
      if (messageId) messagesDeleted.push(messageId);
      executedActions.push({ action: 'delete_message', config, context });
      return { success: true };
    },
  });

  // Common utility actions
  ['log', 'defer', 'edit_message', 'add_reaction', 'remove_reaction', 'pin_message',
   'create_thread', 'archive_thread', 'show_modal', 'update_message',
   'set', 'increment', 'decrement', 'db_insert', 'db_update', 'db_query',
   'emit', 'wait', 'create_timer', 'voice_join', 'voice_play', 'voice_stop'].forEach(name => {
    registry.register(createHandler(name));
  });

  // Flow control - handled by flow engine
  const executor = createActionExecutor(registry, evaluator);

  if (spec.flows) {
    flowEngine.registerAll(spec.flows);
  }

  // Create context from different event types
  const createContext = (data: any): ActionContext => {
    let context: any = {
      now: new Date(),
      random: Math.random(),
      client: client,
      stateManager: {},
      evaluator,
      flowExecutor: flowEngine,
    };

    if (data instanceof MockMessage) {
      context = {
        ...context,
        user: { id: data.author.id, username: data.author.username, mention: `<@${data.author.id}>`, bot: data.author.bot },
        member: { id: data.member?.id, display_name: data.member?.displayName, roles: [], permissions: [] },
        guild: { id: data.guildId, name: 'Test Server', member_count: 100 },
        channel: { id: data.channelId, name: 'general', mention: `<#${data.channelId}>` },
        message: { id: data.id, content: data.content, author: data.author },
        guildId: data.guildId,
        channelId: data.channelId,
        userId: data.author.id,
        args: {},
      };
    } else if (data instanceof MockBaseInteraction) {
      const args: Record<string, unknown> = {};
      if (data instanceof MockCommandInteraction) {
        // Extract all options from the interaction
        const optionNames = [
          'text', 'message', 'user', 'target', 'reason', 'duration', 'amount',
          'channel', 'role', 'name', 'description', 'question', 'prize', 'winners',
          'level', 'seconds', 'count', 'trigger', 'response', 'query', 'message_id',
          'delete_days', 'input', 'value'
        ];
        optionNames.forEach(name => {
          const val = data.options.get(name);
          if (val !== undefined) args[name] = val;
        });
        if (data.options.getSubcommand()) args._subcommand = data.options.getSubcommand();
      } else if (data instanceof MockSelectMenuInteraction) {
        args.values = data.values;
        args.selected = data.values[0];
      } else if (data instanceof MockModalSubmitInteraction) {
        // Extract all fields
        Object.entries((data.fields as any).data || {}).forEach(([key, value]) => {
          args[key] = value;
        });
      }

      context = {
        ...context,
        user: { id: data.user.id, username: data.user.username, mention: `<@${data.user.id}>`, bot: data.user.bot },
        member: { id: data.member.id, display_name: data.member.displayName, roles: [], permissions: [] },
        guild: { id: data.guildId, name: 'Test Server', member_count: 100 },
        channel: { id: data.channelId, name: 'general', mention: `<#${data.channelId}>` },
        interaction: data,
        guildId: data.guildId,
        channelId: data.channelId,
        userId: data.user.id,
        args,
      };

      if (data instanceof MockUserContextMenuInteraction) {
        context.target = { id: data.targetUser.id, username: data.targetUser.username };
        context.target_user = context.target;
      } else if (data instanceof MockMessageContextMenuInteraction) {
        context.target = { id: data.targetMessage.id, content: data.targetMessage.content };
        context.target_message = context.target;
      } else if (data instanceof MockButtonInteraction || data instanceof MockSelectMenuInteraction) {
        context.message = { id: data.message.id, content: data.message.content };
      }
    } else if (data instanceof MockMember) {
      context = {
        ...context,
        user: { id: data.user.id, username: data.user.username, mention: `<@${data.user.id}>`, bot: data.user.bot },
        member: { id: data.id, display_name: data.displayName, joined_at: data.joinedAt, roles: [] },
        guild: { id: data.guild.id, name: data.guild.name, member_count: data.guild.memberCount },
        guildId: data.guild.id,
        userId: data.user.id,
        args: {},
      };
    }

    return context as ActionContext;
  };

  const runtime: BotRuntime = {
    client,
    spec,
    executedActions,
    replies,
    embeds,
    dms,
    roleChanges,
    bans,
    kicks,
    timeouts,
    channelsCreated,
    messagesDeleted,

    async waitForActions(count = 1) {
      const start = executedActions.length;
      let attempts = 0;
      while (executedActions.length < start + count && attempts < 50) {
        await new Promise(r => setTimeout(r, 10));
        attempts++;
      }
    },

    async start() {
      await client.login('test-token');

      // Set up event handlers
      if (spec.events) {
        for (const handler of spec.events) {
          const eventMap: Record<string, string> = {
            ready: 'ready',
            message_create: 'messageCreate',
            message: 'messageCreate',
            message_update: 'messageUpdate',
            message_delete: 'messageDelete',
            guild_member_add: 'guildMemberAdd',
            guild_member_remove: 'guildMemberRemove',
            member_join: 'guildMemberAdd',
            member_leave: 'guildMemberRemove',
            message_reaction_add: 'messageReactionAdd',
            message_reaction_remove: 'messageReactionRemove',
            voice_state_update: 'voiceStateUpdate',
          };

          const eventName = eventMap[handler.event] ?? handler.event;

          client.on(eventName as any, async (data: unknown) => {
            const context = createContext(data);

            // Check condition
            if (handler.when) {
              try {
                const condition = typeof handler.when === 'string' ? handler.when : (handler.when as any).expr ?? 'true';
                const shouldRun = await evaluator.evaluate<boolean>(condition, context);
                if (!shouldRun) return;
              } catch {
                return;
              }
            }

            await executor.executeSequence(handler.actions, context);
          });
        }
      }

      // Set up interaction handlers
      client.on('interactionCreate', async (interaction: unknown) => {
        const context = createContext(interaction);

        if (interaction instanceof MockCommandInteraction) {
          const command = spec.commands?.find(c => c.name === interaction.commandName);
          if (command) {
            const subcommand = interaction.options.getSubcommand();
            // Handle subcommands first
            if (subcommand && command.subcommands) {
              const sub = command.subcommands.find(s => s.name === subcommand);
              if (sub?.actions) {
                await executor.executeSequence(sub.actions, context);
                return;
              }
            }
            // Handle top-level command actions
            if (command.actions) {
              await executor.executeSequence(command.actions, context);
            }
          }
        } else if (interaction instanceof MockUserContextMenuInteraction || interaction instanceof MockMessageContextMenuInteraction) {
          const menu = spec.context_menus?.find(m => m.name === interaction.commandName);
          if (menu?.actions) {
            await executor.executeSequence(menu.actions, context);
          }
        } else if (interaction instanceof MockButtonInteraction) {
          // Check exact match first, then wildcard
          let handler = spec.components?.buttons?.[interaction.customId];
          if (!handler) {
            // Check wildcard patterns
            for (const [key, h] of Object.entries(spec.components?.buttons ?? {})) {
              if (key.endsWith('*') && interaction.customId.startsWith(key.slice(0, -1))) {
                handler = h;
                break;
              }
            }
          }
          if (handler?.actions) {
            await executor.executeSequence(handler.actions, context);
          }
        } else if (interaction instanceof MockSelectMenuInteraction) {
          let handler = spec.components?.selects?.[interaction.customId];
          if (!handler) {
            for (const [key, h] of Object.entries(spec.components?.selects ?? {})) {
              if (key.endsWith('*') && interaction.customId.startsWith(key.slice(0, -1))) {
                handler = h;
                break;
              }
            }
          }
          if (handler?.actions) {
            await executor.executeSequence(handler.actions, context);
          }
        } else if (interaction instanceof MockModalSubmitInteraction) {
          let handler = spec.components?.modals?.[interaction.customId];
          if (!handler) {
            for (const [key, h] of Object.entries(spec.components?.modals ?? {})) {
              if (key.endsWith('*') && interaction.customId.startsWith(key.slice(0, -1))) {
                handler = h;
                break;
              }
            }
          }
          if (handler?.actions) {
            await executor.executeSequence(handler.actions, context);
          }
        }
      });

      // Execute ready handlers
      const readyHandler = spec.events?.find(e => e.event === 'ready');
      if (readyHandler) {
        await executor.executeSequence(readyHandler.actions, createContext(client));
      }
    },

    async stop() {
      await client.destroy();
    },
  };

  return runtime;
}

// ==========================================
// TESTS
// ==========================================

describe('Comprehensive Bot Tests', () => {
  // ==========================================
  // MODERATION BOT
  // ==========================================
  describe('Moderation Bot', () => {
    const moderationSpec = `
version: "0.1"
intents:
  explicit: [guilds, guild_members, guild_messages, message_content, guild_moderation]

commands:
  - name: warn
    description: Warn a user
    options:
      - name: user
        description: User to warn
        type: user
        required: true
      - name: reason
        description: Reason for warning
        type: string
        required: true
    actions:
      - action: send_dm
        user: "\${args.user}"
        content: "You have been warned in \${guild.name} for: \${args.reason}"
      - action: reply
        content: "Warned <@\${args.user}> for: \${args.reason}"
        ephemeral: true

  - name: kick
    description: Kick a user
    options:
      - name: user
        description: User to kick
        type: user
        required: true
      - name: reason
        description: Reason
        type: string
    actions:
      - action: kick
        user: "\${args.user}"
        reason: "\${args.reason || 'No reason provided'}"
      - action: send_message
        channel: "222333444555666777"
        content: "**User Kicked**\\nUser: <@\${args.user}>\\nModerator: \${user.username}\\nReason: \${args.reason || 'No reason provided'}"
      - action: reply
        content: "User has been kicked."
        ephemeral: true

  - name: ban
    description: Ban a user
    options:
      - name: user
        description: User to ban
        type: user
        required: true
      - name: reason
        description: Reason
        type: string
      - name: delete_days
        description: Days of messages to delete
        type: integer
    actions:
      - action: ban
        user: "\${args.user}"
        reason: "\${args.reason || 'No reason provided'}"
      - action: send_message
        channel: "222333444555666777"
        content: "**User Banned**\\nUser: <@\${args.user}>\\nModerator: \${user.username}\\nReason: \${args.reason || 'No reason provided'}"
      - action: reply
        content: "User has been banned."
        ephemeral: true

  - name: timeout
    description: Timeout a user
    options:
      - name: user
        description: User to timeout
        type: user
        required: true
      - name: duration
        description: Duration in minutes
        type: integer
        required: true
      - name: reason
        description: Reason
        type: string
    actions:
      - action: timeout
        user: "\${args.user}"
        duration: "\${args.duration * 60000}"
        reason: "\${args.reason}"
      - action: reply
        content: "Timed out <@\${args.user}> for \${args.duration} minutes."

  - name: purge
    description: Delete messages
    options:
      - name: amount
        description: Number of messages
        type: integer
        required: true
    actions:
      - action: defer
        ephemeral: true
      - action: reply
        content: "Deleted \${args.amount} messages."

  - name: slowmode
    description: Set slowmode
    options:
      - name: seconds
        description: Slowmode in seconds (0 to disable)
        type: integer
        required: true
    actions:
      - action: reply
        content: "Slowmode set to \${args.seconds} seconds."

context_menus:
  - name: Report User
    type: user
    actions:
      - action: reply
        content: "Reported \${target_user.username}"
        ephemeral: true

  - name: Report Message
    type: message
    actions:
      - action: reply
        content: "Reported message: \${target_message.content}"
        ephemeral: true
`;

    it('should warn a user with DM and confirmation', async () => {
      const bot = createTestBot(moderationSpec);
      await bot.start();

      bot.client.simulateCommand('warn', { user: '111', reason: 'Spamming' });
      await bot.waitForActions(2);

      expect(bot.dms).toContainEqual(expect.objectContaining({ userId: '111', content: expect.stringContaining('Spamming') }));
      expect(bot.replies).toContainEqual(expect.stringContaining('Warned'));
      await bot.stop();
    });

    it('should kick a user and log to mod channel', async () => {
      const bot = createTestBot(moderationSpec);
      await bot.start();

      bot.client.simulateCommand('kick', { user: '222', reason: 'Breaking rules' });
      await bot.waitForActions(3);

      expect(bot.kicks).toContainEqual({ userId: '222', reason: 'Breaking rules' });
      expect(bot.replies.some(r => r.includes('User Kicked'))).toBe(true);
      await bot.stop();
    });

    it('should ban a user', async () => {
      const bot = createTestBot(moderationSpec);
      await bot.start();

      bot.client.simulateCommand('ban', { user: '333', reason: 'Severe violation' });
      await bot.waitForActions(3);

      expect(bot.bans).toContainEqual({ userId: '333', reason: 'Severe violation' });
      await bot.stop();
    });

    it('should timeout a user', async () => {
      const bot = createTestBot(moderationSpec);
      await bot.start();

      bot.client.simulateCommand('timeout', { user: '111', duration: 10, reason: 'Cool down' });
      await bot.waitForActions(2);

      expect(bot.timeouts).toContainEqual({ userId: '111', duration: 600000 });
      await bot.stop();
    });

    it('should handle user context menu report', async () => {
      const bot = createTestBot(moderationSpec);
      await bot.start();

      const targetUser = new MockUser({ id: '444', username: 'BadUser' });
      bot.client.simulateUserContextMenu('Report User', targetUser);
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('BadUser'))).toBe(true);
      await bot.stop();
    });

    it('should handle message context menu report', async () => {
      const bot = createTestBot(moderationSpec);
      await bot.start();

      const targetMessage = new MockMessage({ content: 'Bad content here' });
      bot.client.simulateMessageContextMenu('Report Message', targetMessage);
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Bad content'))).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // WELCOME BOT
  // ==========================================
  describe('Welcome Bot', () => {
    const welcomeSpec = `
version: "0.1"
intents:
  explicit: [guilds, guild_members]

events:
  - event: guild_member_add
    actions:
      - action: send_message
        channel: "333444555666777888"
        content: "Welcome to the server, \${user.mention}! You are member #\${guild.member_count}."
      - action: assign_role
        role: "member_role"
      - action: send_dm
        user: "\${user.id}"
        content: "Welcome to \${guild.name}! Please read the rules."

  - event: guild_member_remove
    actions:
      - action: send_message
        channel: "333444555666777888"
        content: "Goodbye \${user.username}, we'll miss you!"

commands:
  - name: welcome
    description: Welcome settings
    subcommands:
      - name: channel
        description: Set welcome channel
        options:
          - name: channel
            description: Channel for welcome messages
            type: channel
            required: true
        actions:
          - action: reply
            content: "Welcome channel set to <#\${args.channel}>"
      - name: message
        description: Set welcome message
        options:
          - name: message
            description: Welcome message
            type: string
            required: true
        actions:
          - action: reply
            content: "Welcome message updated!"
      - name: test
        description: Test welcome message
        actions:
          - action: reply
            content: "Welcome to the server, \${user.mention}! You are member #\${guild.member_count}."
`;

    it('should welcome new members', async () => {
      const bot = createTestBot(welcomeSpec);
      await bot.start();

      bot.client.simulateMemberJoin(new MockUser({ username: 'NewMember', id: '555' }));
      await bot.waitForActions(3);

      expect(bot.replies.some(r => r.includes('Welcome'))).toBe(true);
      expect(bot.roleChanges).toContainEqual({ userId: '555', roleId: 'member_role', action: 'add' });
      expect(bot.dms.some(d => d.userId === '555')).toBe(true);
      await bot.stop();
    });

    it('should announce member leave', async () => {
      const bot = createTestBot(welcomeSpec);
      await bot.start();

      const member = new MockMember(new MockUser({ username: 'LeavingUser' }), new MockGuild());
      bot.client.simulateMemberLeave(member);
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Goodbye'))).toBe(true);
      await bot.stop();
    });

    it('should handle welcome subcommands', async () => {
      const bot = createTestBot(welcomeSpec);
      await bot.start();

      bot.client.simulateSubcommand('welcome', 'channel', { channel: '123456' });
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('Welcome channel set'))).toBe(true);

      bot.client.simulateSubcommand('welcome', 'test', {});
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('Welcome to the server'))).toBe(true);

      await bot.stop();
    });
  });

  // ==========================================
  // TICKET SYSTEM
  // ==========================================
  describe('Ticket System', () => {
    const ticketSpec = `
version: "0.1"
intents:
  auto: true

commands:
  - name: ticket
    description: Ticket management
    subcommands:
      - name: create
        description: Create a ticket
        options:
          - name: reason
            description: Reason for ticket
            type: string
            required: true
        actions:
          - action: create_channel
            name: "ticket-\${user.id}"
            type: 0
            parent: "444555666777888999"
          - action: reply
            content: "Ticket created! Check your new channel."
            ephemeral: true
      - name: close
        description: Close this ticket
        actions:
          - action: reply
            content: "Ticket will be closed in 5 seconds..."
          - action: wait
            duration: "5s"
          - action: log
            message: "Ticket closed"

components:
  buttons:
    create_ticket:
      label: Create Ticket
      style: primary
      actions:
        - action: show_modal
          custom_id: ticket_modal
          title: Create Ticket
          fields:
            - name: reason
              label: Reason
              style: paragraph
              required: true
    close_ticket:
      label: Close Ticket
      style: danger
      actions:
        - action: reply
          content: "Closing ticket..."
    claim_ticket:
      label: Claim
      style: success
      actions:
        - action: reply
          content: "\${user.username} claimed this ticket!"

  modals:
    ticket_modal:
      title: Create Ticket
      actions:
        - action: create_channel
          name: "ticket-\${user.id}"
        - action: reply
          content: "Ticket created with reason: \${args.reason}"
          ephemeral: true

  selects:
    ticket_category:
      placeholder: Select category
      options:
        - label: General Support
          value: general
        - label: Technical Issue
          value: technical
        - label: Billing
          value: billing
      actions:
        - action: reply
          content: "Category selected: \${args.selected}"
`;

    it('should create ticket via command', async () => {
      const bot = createTestBot(ticketSpec);
      await bot.start();

      bot.client.simulateSubcommand('ticket', 'create', { reason: 'Need help' });
      await bot.waitForActions(2);

      expect(bot.channelsCreated.some(c => c.name.includes('ticket'))).toBe(true);
      expect(bot.replies.some(r => r.includes('Ticket created'))).toBe(true);
      await bot.stop();
    });

    it('should handle ticket button clicks', async () => {
      const bot = createTestBot(ticketSpec);
      await bot.start();

      bot.client.simulateButton('create_ticket');
      await bot.waitForActions(1);
      expect(bot.executedActions.some(a => a.action === 'show_modal')).toBe(true);

      bot.client.simulateButton('claim_ticket');
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('claimed'))).toBe(true);

      await bot.stop();
    });

    it('should handle ticket modal submission', async () => {
      const bot = createTestBot(ticketSpec);
      await bot.start();

      bot.client.simulateModal('ticket_modal', { reason: 'I need assistance with my order' });
      await bot.waitForActions(2);

      expect(bot.channelsCreated.length).toBeGreaterThan(0);
      expect(bot.replies.some(r => r.includes('I need assistance'))).toBe(true);
      await bot.stop();
    });

    it('should handle category selection', async () => {
      const bot = createTestBot(ticketSpec);
      await bot.start();

      bot.client.simulateSelectMenu('ticket_category', ['technical']);
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('technical'))).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // LEVELING SYSTEM
  // ==========================================
  describe('Leveling System', () => {
    const levelingSpec = `
version: "0.1"
intents:
  explicit: [guilds, guild_messages, message_content]

events:
  - event: message_create
    when: "!message.author.bot"
    actions:
      - action: increment
        variable: "xp"
        scope: member
        amount: "\${random(10, 25)}"
      - action: log
        message: "XP added to \${user.username}"

commands:
  - name: rank
    description: Check your rank
    options:
      - name: user
        description: User to check
        type: user
    actions:
      - action: reply
        content: "**Rank Card**\\nUser: \${args.user || user.username}\\nLevel: 5\\nXP: 1250/2000"

  - name: leaderboard
    description: View XP leaderboard
    actions:
      - action: reply
        content: "**XP Leaderboard**\\n1. User1 - Level 10\\n2. User2 - Level 8\\n3. User3 - Level 7"

  - name: givexp
    description: Give XP to a user
    options:
      - name: user
        description: User
        type: user
        required: true
      - name: amount
        description: Amount
        type: integer
        required: true
    actions:
      - action: increment
        variable: "xp"
        scope: member
        user: "\${args.user}"
        amount: "\${args.amount}"
      - action: reply
        content: "Gave \${args.amount} XP to <@\${args.user}>"

  - name: setlevel
    description: Set user level
    options:
      - name: user
        description: User
        type: user
        required: true
      - name: level
        description: Level
        type: integer
        required: true
    actions:
      - action: set
        variable: "level"
        scope: member
        user: "\${args.user}"
        value: "\${args.level}"
      - action: reply
        content: "Set <@\${args.user}>'s level to \${args.level}"

components:
  buttons:
    view_rank:
      label: View Rank
      style: primary
      actions:
        - action: reply
          content: "Your rank: Level 5"
          ephemeral: true
`;

    it('should track XP on message', async () => {
      const bot = createTestBot(levelingSpec);
      await bot.start();

      bot.client.simulateMessage('Hello everyone!', { authorBot: false });
      await bot.waitForActions(2);

      expect(bot.executedActions.some(a => a.action === 'increment')).toBe(true);
      await bot.stop();
    });

    it('should ignore bot messages', async () => {
      const bot = createTestBot(levelingSpec);
      await bot.start();
      const initialCount = bot.executedActions.length;

      bot.client.simulateMessage('Bot message', { authorBot: true });
      await new Promise(r => setTimeout(r, 50));

      expect(bot.executedActions.length).toBe(initialCount);
      await bot.stop();
    });

    it('should show rank card', async () => {
      const bot = createTestBot(levelingSpec);
      await bot.start();

      bot.client.simulateCommand('rank', {});
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Rank Card'))).toBe(true);
      await bot.stop();
    });

    it('should show leaderboard', async () => {
      const bot = createTestBot(levelingSpec);
      await bot.start();

      bot.client.simulateCommand('leaderboard', {});
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Leaderboard'))).toBe(true);
      await bot.stop();
    });

    it('should give XP to user', async () => {
      const bot = createTestBot(levelingSpec);
      await bot.start();

      bot.client.simulateCommand('givexp', { user: '111', amount: 500 });
      await bot.waitForActions(2);

      expect(bot.executedActions.some(a => a.action === 'increment')).toBe(true);
      expect(bot.replies.some(r => r.includes('500 XP'))).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // REACTION ROLES
  // ==========================================
  describe('Reaction Roles', () => {
    const reactionRolesSpec = `
version: "0.1"
intents:
  explicit: [guilds, guild_messages, guild_message_reactions]

commands:
  - name: reactionrole
    description: Create reaction role message
    options:
      - name: channel
        description: Channel
        type: channel
        required: true
    actions:
      - action: send_message
        channel: "\${args.channel}"
        content: "React to get roles!\\n🔴 Red Role\\n🔵 Blue Role\\n🟢 Green Role"
      - action: reply
        content: "Reaction role message created!"
        ephemeral: true

events:
  - event: message_reaction_add
    actions:
      - action: log
        message: "Reaction added: \${reaction.emoji}"

components:
  buttons:
    role_red:
      label: Red Role
      style: danger
      actions:
        - action: assign_role
          role: "red_role"
        - action: reply
          content: "You now have the Red role!"
          ephemeral: true
    role_blue:
      label: Blue Role
      style: primary
      actions:
        - action: assign_role
          role: "blue_role"
        - action: reply
          content: "You now have the Blue role!"
          ephemeral: true
    role_green:
      label: Green Role
      style: success
      actions:
        - action: assign_role
          role: "green_role"
        - action: reply
          content: "You now have the Green role!"
          ephemeral: true

  selects:
    role_select:
      placeholder: Select your roles
      options:
        - label: Announcements
          value: announcements_role
          description: Get pinged for announcements
        - label: Events
          value: events_role
          description: Get pinged for events
        - label: Giveaways
          value: giveaways_role
          description: Get pinged for giveaways
      actions:
        - action: assign_role
          role: "\${args.selected}"
        - action: reply
          content: "Role assigned!"
          ephemeral: true
`;

    it('should create reaction role message', async () => {
      const bot = createTestBot(reactionRolesSpec);
      await bot.start();

      bot.client.simulateCommand('reactionrole', { channel: '111222333' });
      await bot.waitForActions(2);

      expect(bot.replies.some(r => r.includes('React to get roles'))).toBe(true);
      await bot.stop();
    });

    it('should assign role via button', async () => {
      const bot = createTestBot(reactionRolesSpec);
      await bot.start();

      bot.client.simulateButton('role_red');
      await bot.waitForActions(2);

      expect(bot.roleChanges).toContainEqual({ userId: expect.any(String), roleId: 'red_role', action: 'add' });
      await bot.stop();
    });

    it('should assign role via select menu', async () => {
      const bot = createTestBot(reactionRolesSpec);
      await bot.start();

      bot.client.simulateSelectMenu('role_select', ['events_role']);
      await bot.waitForActions(2);

      expect(bot.roleChanges).toContainEqual({ userId: expect.any(String), roleId: 'events_role', action: 'add' });
      await bot.stop();
    });
  });

  // ==========================================
  // STARBOARD
  // ==========================================
  describe('Starboard', () => {
    const starboardSpec = `
version: "0.1"
intents:
  explicit: [guilds, guild_messages, guild_message_reactions]

events:
  - event: message_reaction_add
    actions:
      - action: log
        message: "Star reaction detected"
      - action: send_message
        channel: "starboard_channel"
        content: "**⭐ Starred Message**\\nFrom: \${user.username}\\nContent: Message content here"

commands:
  - name: starboard
    description: Starboard settings
    subcommands:
      - name: channel
        description: Set starboard channel
        options:
          - name: channel
            description: Channel
            type: channel
            required: true
        actions:
          - action: reply
            content: "Starboard channel set to <#\${args.channel}>"
      - name: threshold
        description: Set star threshold
        options:
          - name: count
            description: Number of stars required
            type: integer
            required: true
        actions:
          - action: reply
            content: "Starboard threshold set to \${args.count} stars"
`;

    it('should configure starboard channel', async () => {
      const bot = createTestBot(starboardSpec);
      await bot.start();

      bot.client.simulateSubcommand('starboard', 'channel', { channel: '999888777' });
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Starboard channel set'))).toBe(true);
      await bot.stop();
    });

    it('should handle star reactions', async () => {
      const bot = createTestBot(starboardSpec);
      await bot.start();

      const message = new MockMessage({ content: 'Great message!' });
      bot.client.simulateReactionAdd(message, '⭐');
      await bot.waitForActions(2);

      expect(bot.executedActions.some(a => a.action === 'log')).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // POLLS
  // ==========================================
  describe('Polls', () => {
    const pollSpec = `
version: "0.1"
intents:
  auto: true

commands:
  - name: poll
    description: Create a poll
    options:
      - name: question
        description: Poll question
        type: string
        required: true
    actions:
      - action: reply
        content: "**Poll:** \${args.question}\\n\\n✅ Yes\\n❌ No"
      - action: add_reaction
        emoji: "✅"
      - action: add_reaction
        emoji: "❌"

  - name: quickpoll
    description: Quick yes/no poll
    options:
      - name: question
        description: Question
        type: string
        required: true
    actions:
      - action: reply
        content: "\${args.question}"

components:
  buttons:
    poll_vote_yes:
      label: "Yes"
      style: success
      actions:
        - action: reply
          content: "You voted Yes!"
          ephemeral: true
    poll_vote_no:
      label: "No"
      style: danger
      actions:
        - action: reply
          content: "You voted No!"
          ephemeral: true
    poll_end:
      label: "End Poll"
      style: secondary
      actions:
        - action: reply
          content: "Poll ended! Results: Yes: 5, No: 3"
`;

    it('should create poll', async () => {
      const bot = createTestBot(pollSpec);
      await bot.start();

      bot.client.simulateCommand('poll', { question: 'Is this a good feature?' });
      await bot.waitForActions(3);

      expect(bot.replies.some(r => r.includes('Poll:') && r.includes('Is this a good feature'))).toBe(true);
      await bot.stop();
    });

    it('should handle poll votes', async () => {
      const bot = createTestBot(pollSpec);
      await bot.start();

      bot.client.simulateButton('poll_vote_yes');
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('voted Yes'))).toBe(true);

      bot.client.simulateButton('poll_vote_no');
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('voted No'))).toBe(true);

      await bot.stop();
    });

    it('should end poll', async () => {
      const bot = createTestBot(pollSpec);
      await bot.start();

      bot.client.simulateButton('poll_end');
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Poll ended'))).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // GIVEAWAYS
  // ==========================================
  describe('Giveaways', () => {
    const giveawaySpec = `
version: "0.1"
intents:
  auto: true

commands:
  - name: giveaway
    description: Giveaway commands
    subcommands:
      - name: start
        description: Start a giveaway
        options:
          - name: prize
            description: Prize
            type: string
            required: true
          - name: duration
            description: Duration (e.g. 1h, 1d)
            type: string
            required: true
          - name: winners
            description: Number of winners
            type: integer
        actions:
          - action: send_message
            channel: "\${channel.id}"
            content: "🎉 **GIVEAWAY** 🎉\\n\\nPrize: \${args.prize}\\nEnds: In \${args.duration}\\nWinners: \${args.winners || 1}\\n\\nReact with 🎉 to enter!"
          - action: reply
            content: "Giveaway started!"
            ephemeral: true
      - name: end
        description: End a giveaway
        options:
          - name: message_id
            description: Giveaway message ID
            type: string
            required: true
        actions:
          - action: reply
            content: "Giveaway ended! Winner: @RandomWinner"
      - name: reroll
        description: Reroll winner
        options:
          - name: message_id
            description: Giveaway message ID
            type: string
            required: true
        actions:
          - action: reply
            content: "New winner: @NewWinner"

components:
  buttons:
    giveaway_enter:
      label: "🎉 Enter Giveaway"
      style: primary
      actions:
        - action: reply
          content: "You have entered the giveaway!"
          ephemeral: true
`;

    it('should start giveaway', async () => {
      const bot = createTestBot(giveawaySpec);
      await bot.start();

      bot.client.simulateSubcommand('giveaway', 'start', { prize: 'Discord Nitro', duration: '24h', winners: 2 });
      await bot.waitForActions(2);

      expect(bot.replies.some(r => r.includes('GIVEAWAY') && r.includes('Discord Nitro'))).toBe(true);
      await bot.stop();
    });

    it('should end giveaway', async () => {
      const bot = createTestBot(giveawaySpec);
      await bot.start();

      bot.client.simulateSubcommand('giveaway', 'end', { message_id: '123456' });
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Giveaway ended'))).toBe(true);
      await bot.stop();
    });

    it('should enter giveaway via button', async () => {
      const bot = createTestBot(giveawaySpec);
      await bot.start();

      bot.client.simulateButton('giveaway_enter');
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('entered the giveaway'))).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // AUTO-RESPONDER
  // ==========================================
  describe('Auto-Responder', () => {
    const autoResponderSpec = `
version: "0.1"
intents:
  explicit: [guilds, guild_messages, message_content]

events:
  - event: message_create
    when: "message.content|lower|includes('hello')"
    actions:
      - action: reply
        content: "Hello there! 👋"

  - event: message_create
    when: "message.content|lower|includes('help')"
    actions:
      - action: reply
        content: "Need help? Use /help to see available commands!"

  - event: message_create
    when: "message.content|lower == 'ping'"
    actions:
      - action: reply
        content: "Pong!"

commands:
  - name: autorespond
    description: Manage auto-responses
    subcommands:
      - name: add
        description: Add auto-response
        options:
          - name: trigger
            description: Trigger word
            type: string
            required: true
          - name: response
            description: Response
            type: string
            required: true
        actions:
          - action: reply
            content: "Auto-response added for '\${args.trigger}'"
      - name: remove
        description: Remove auto-response
        options:
          - name: trigger
            description: Trigger word
            type: string
            required: true
        actions:
          - action: reply
            content: "Auto-response removed for '\${args.trigger}'"
      - name: list
        description: List auto-responses
        actions:
          - action: reply
            content: "**Auto-Responses:**\\n1. hello → Hello there!\\n2. help → Use /help\\n3. ping → Pong!"
`;

    it('should respond to hello', async () => {
      const bot = createTestBot(autoResponderSpec);
      await bot.start();

      bot.client.simulateMessage('Hello everyone!');
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Hello there'))).toBe(true);
      await bot.stop();
    });

    it('should respond to help', async () => {
      const bot = createTestBot(autoResponderSpec);
      await bot.start();

      bot.client.simulateMessage('I need help please');
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Use /help'))).toBe(true);
      await bot.stop();
    });

    it('should manage auto-responses', async () => {
      const bot = createTestBot(autoResponderSpec);
      await bot.start();

      bot.client.simulateSubcommand('autorespond', 'add', { trigger: 'bye', response: 'Goodbye!' });
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes("Auto-response added"))).toBe(true);

      bot.client.simulateSubcommand('autorespond', 'list', {});
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('Auto-Responses'))).toBe(true);

      await bot.stop();
    });
  });

  // ==========================================
  // MUSIC BOT
  // ==========================================
  describe('Music Bot', () => {
    const musicSpec = `
version: "0.1"
intents:
  explicit: [guilds, guild_voice_states]

commands:
  - name: play
    description: Play a song
    options:
      - name: query
        description: Song name or URL
        type: string
        required: true
    actions:
      - action: voice_join
        channel: "\${member.voice.channel}"
      - action: voice_play
        query: "\${args.query}"
      - action: reply
        content: "🎵 Now playing: \${args.query}"

  - name: skip
    description: Skip current song
    actions:
      - action: voice_stop
      - action: reply
        content: "⏭️ Skipped!"

  - name: stop
    description: Stop music
    actions:
      - action: voice_stop
      - action: reply
        content: "⏹️ Music stopped"

  - name: queue
    description: View queue
    actions:
      - action: reply
        content: "**Queue:**\\n1. Song 1\\n2. Song 2\\n3. Song 3"

  - name: nowplaying
    description: Current song
    actions:
      - action: reply
        content: "🎵 **Now Playing:** Never Gonna Give You Up\\n⏱️ 1:23 / 3:32"

  - name: volume
    description: Set volume
    options:
      - name: level
        description: Volume level (0-100)
        type: integer
        required: true
    actions:
      - action: reply
        content: "🔊 Volume set to \${args.level}%"

components:
  buttons:
    music_pause:
      label: "⏸️"
      style: secondary
      actions:
        - action: reply
          content: "Paused"
          ephemeral: true
    music_resume:
      label: "▶️"
      style: secondary
      actions:
        - action: reply
          content: "Resumed"
          ephemeral: true
    music_skip:
      label: "⏭️"
      style: secondary
      actions:
        - action: voice_stop
        - action: reply
          content: "Skipped!"
          ephemeral: true
    music_stop:
      label: "⏹️"
      style: danger
      actions:
        - action: voice_stop
        - action: reply
          content: "Stopped!"
          ephemeral: true
`;

    it('should play music', async () => {
      const bot = createTestBot(musicSpec);
      await bot.start();

      bot.client.simulateCommand('play', { query: 'Never Gonna Give You Up' });
      await bot.waitForActions(3);

      expect(bot.executedActions.some(a => a.action === 'voice_join')).toBe(true);
      expect(bot.executedActions.some(a => a.action === 'voice_play')).toBe(true);
      expect(bot.replies.some(r => r.includes('Now playing'))).toBe(true);
      await bot.stop();
    });

    it('should skip song', async () => {
      const bot = createTestBot(musicSpec);
      await bot.start();

      bot.client.simulateCommand('skip', {});
      await bot.waitForActions(2);

      expect(bot.executedActions.some(a => a.action === 'voice_stop')).toBe(true);
      expect(bot.replies.some(r => r.includes('Skipped'))).toBe(true);
      await bot.stop();
    });

    it('should show queue', async () => {
      const bot = createTestBot(musicSpec);
      await bot.start();

      bot.client.simulateCommand('queue', {});
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Queue'))).toBe(true);
      await bot.stop();
    });

    it('should handle music control buttons', async () => {
      const bot = createTestBot(musicSpec);
      await bot.start();

      bot.client.simulateButton('music_pause');
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('Paused'))).toBe(true);

      bot.client.simulateButton('music_resume');
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('Resumed'))).toBe(true);

      await bot.stop();
    });

    it('should set volume', async () => {
      const bot = createTestBot(musicSpec);
      await bot.start();

      bot.client.simulateCommand('volume', { level: 50 });
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('50%'))).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // UTILITY BOT
  // ==========================================
  describe('Utility Bot', () => {
    const utilitySpec = `
version: "0.1"
intents:
  auto: true

commands:
  - name: serverinfo
    description: Server information
    actions:
      - action: reply
        content: "**Server Info**\\nName: \${guild.name}\\nMembers: \${guild.member_count}\\nOwner: <@\${guild.owner_id}>"

  - name: userinfo
    description: User information
    options:
      - name: user
        description: User to look up
        type: user
    actions:
      - action: reply
        content: "**User Info**\\nName: \${args.user || user.username}\\nID: \${args.user || user.id}"

  - name: avatar
    description: Get avatar
    options:
      - name: user
        description: User
        type: user
    actions:
      - action: reply
        content: "**Avatar**\\nUser: \${args.user || user.username}"

  - name: ping
    description: Check latency
    actions:
      - action: reply
        content: "🏓 Pong! Latency: 50ms"

  - name: uptime
    description: Bot uptime
    actions:
      - action: reply
        content: "⏱️ Uptime: 2 days, 5 hours, 30 minutes"

  - name: stats
    description: Bot statistics
    actions:
      - action: reply
        content: "**Bot Stats**\\nServers: 100\\nUsers: 10,000\\nCommands: 50"

  - name: invite
    description: Get invite link
    actions:
      - action: reply
        content: "[Click here to invite the bot](https://discord.com/oauth2/authorize)"

  - name: support
    description: Support server
    actions:
      - action: reply
        content: "[Join our support server](https://discord.gg/support)"
`;

    it('should show server info', async () => {
      const bot = createTestBot(utilitySpec);
      await bot.start();

      bot.client.simulateCommand('serverinfo', {});
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Server Info'))).toBe(true);
      await bot.stop();
    });

    it('should show user info', async () => {
      const bot = createTestBot(utilitySpec);
      await bot.start();

      bot.client.simulateCommand('userinfo', {});
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('User Info'))).toBe(true);
      await bot.stop();
    });

    it('should respond to ping', async () => {
      const bot = createTestBot(utilitySpec);
      await bot.start();

      bot.client.simulateCommand('ping', {});
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Pong'))).toBe(true);
      await bot.stop();
    });

    it('should show stats', async () => {
      const bot = createTestBot(utilitySpec);
      await bot.start();

      bot.client.simulateCommand('stats', {});
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Bot Stats'))).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // WILDCARD COMPONENT HANDLERS
  // ==========================================
  describe('Wildcard Component Handlers', () => {
    const wildcardSpec = `
version: "0.1"
intents:
  auto: true

components:
  buttons:
    ticket_close_*:
      label: Close
      style: danger
      actions:
        - action: reply
          content: "Closing ticket..."
    role_toggle_*:
      label: Toggle Role
      style: primary
      actions:
        - action: reply
          content: "Toggling role..."
    confirm_*:
      label: Confirm
      style: success
      actions:
        - action: reply
          content: "Confirmed action"

  selects:
    category_*:
      placeholder: Select
      actions:
        - action: reply
          content: "Category selected: \${args.selected}"

  modals:
    edit_*:
      title: Edit
      actions:
        - action: reply
          content: "Saved changes"
`;

    it('should match button wildcard patterns', async () => {
      const bot = createTestBot(wildcardSpec);
      await bot.start();

      bot.client.simulateButton('ticket_close_12345');
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('Closing ticket'))).toBe(true);

      bot.client.simulateButton('role_toggle_admin');
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('Toggling role'))).toBe(true);

      bot.client.simulateButton('confirm_ban_user123');
      await bot.waitForActions(1);
      expect(bot.replies.some(r => r.includes('Confirmed action'))).toBe(true);

      await bot.stop();
    });

    it('should match select menu wildcard patterns', async () => {
      const bot = createTestBot(wildcardSpec);
      await bot.start();

      bot.client.simulateSelectMenu('category_tickets', ['technical']);
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Category selected'))).toBe(true);
      await bot.stop();
    });

    it('should match modal wildcard patterns', async () => {
      const bot = createTestBot(wildcardSpec);
      await bot.start();

      bot.client.simulateModal('edit_profile_123', { bio: 'New bio' });
      await bot.waitForActions(1);

      expect(bot.replies.some(r => r.includes('Saved changes'))).toBe(true);
      await bot.stop();
    });
  });

  // ==========================================
  // COMPLEX MULTI-STEP FLOWS
  // ==========================================
  describe('Complex Multi-Step Flows', () => {
    const complexFlowSpec = `
version: "0.1"
intents:
  auto: true

flows:
  - name: verify_and_role
    parameters:
      - name: user_id
        type: string
        required: true
      - name: role_id
        type: string
        required: true
    actions:
      - action: log
        message: "Verifying user \${args.user_id}"
      - action: assign_role
        user: "\${args.user_id}"
        role: "\${args.role_id}"
      - action: send_dm
        user: "\${args.user_id}"
        content: "You have been verified!"

commands:
  - name: setup
    description: Setup the server
    actions:
      - action: defer
      - action: create_channel
        name: "welcome"
        type: 0
      - action: create_channel
        name: "rules"
        type: 0
      - action: create_channel
        name: "general"
        type: 0
      - action: reply
        content: "Server setup complete! Created 3 channels."

  - name: verify
    description: Verify a user
    options:
      - name: user
        description: User to verify
        type: user
        required: true
    actions:
      - action: log
        message: "Starting verification for user"
      - action: assign_role
        user: "\${args.user}"
        role: "verified_role"
      - action: send_dm
        user: "\${args.user}"
        content: "Welcome! You have been verified in \${guild.name}."
      - action: send_message
        channel: "222333444555666777"
        content: "✅ <@\${args.user}> has been verified by \${user.username}"
      - action: reply
        content: "User verified successfully!"
        ephemeral: true
`;

    it('should execute multi-step setup flow', async () => {
      const bot = createTestBot(complexFlowSpec);
      await bot.start();

      bot.client.simulateCommand('setup', {});
      await bot.waitForActions(5);

      expect(bot.executedActions.filter(a => a.action === 'create_channel').length).toBe(3);
      expect(bot.replies.some(r => r.includes('setup complete'))).toBe(true);
      await bot.stop();
    });

    it('should execute verification flow', async () => {
      const bot = createTestBot(complexFlowSpec);
      await bot.start();

      bot.client.simulateCommand('verify', { user: '111' });
      await bot.waitForActions(5);

      expect(bot.roleChanges).toContainEqual({ userId: '111', roleId: 'verified_role', action: 'add' });
      expect(bot.dms.some(d => d.userId === '111' && d.content.includes('verified'))).toBe(true);
      expect(bot.replies.some(r => r.includes('has been verified'))).toBe(true);
      await bot.stop();
    });
  });
});
