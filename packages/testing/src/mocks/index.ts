/**
 * Mock implementations for testing
 */

export interface MockUser {
  id: string;
  username: string;
  discriminator: string;
  tag: string;
  avatar: string | null;
  bot: boolean;
}

export interface MockMember extends MockUser {
  nickname: string | null;
  roles: string[];
  joinedAt: Date;
}

export interface MockGuild {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
}

export interface MockChannel {
  id: string;
  name: string;
  type: string;
  guildId: string;
}

export interface MockMessage {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  guildId: string;
  createdAt: Date;
}

/**
 * Create a mock user
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: '123456789012345678',
    username: 'testuser',
    discriminator: '0001',
    tag: 'testuser#0001',
    avatar: null,
    bot: false,
    ...overrides,
  };
}

/**
 * Create a mock member
 */
export function createMockMember(overrides: Partial<MockMember> = {}): MockMember {
  return {
    ...createMockUser(),
    nickname: null,
    roles: [],
    joinedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock guild
 */
export function createMockGuild(overrides: Partial<MockGuild> = {}): MockGuild {
  return {
    id: '987654321098765432',
    name: 'Test Server',
    ownerId: '123456789012345678',
    memberCount: 100,
    ...overrides,
  };
}

/**
 * Create a mock channel
 */
export function createMockChannel(overrides: Partial<MockChannel> = {}): MockChannel {
  return {
    id: '111222333444555666',
    name: 'general',
    type: 'text',
    guildId: '987654321098765432',
    ...overrides,
  };
}

/**
 * Create a mock message
 */
export function createMockMessage(overrides: Partial<MockMessage> = {}): MockMessage {
  return {
    id: '999888777666555444',
    content: 'Hello, world!',
    authorId: '123456789012345678',
    channelId: '111222333444555666',
    guildId: '987654321098765432',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Mock Discord client for testing
 */
export class MockDiscordClient {
  public user = createMockUser({ bot: true, username: 'TestBot' });
  public guilds = new Map<string, MockGuild>();
  public channels = new Map<string, MockChannel>();
  private listeners = new Map<string, Function[]>();

  constructor() {
    // Add a default guild
    const guild = createMockGuild();
    this.guilds.set(guild.id, guild);

    // Add a default channel
    const channel = createMockChannel({ guildId: guild.id });
    this.channels.set(channel.id, channel);
  }

  on(event: string, listener: Function): this {
    const existing = this.listeners.get(event) ?? [];
    existing.push(listener);
    this.listeners.set(event, existing);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.listeners.get(event) ?? [];
    for (const listener of listeners) {
      listener(...args);
    }
    return listeners.length > 0;
  }

  async login(_token: string): Promise<string> {
    this.emit('ready');
    return 'mock-token';
  }

  async destroy(): Promise<void> {
    this.listeners.clear();
  }

  isReady(): boolean {
    return true;
  }
}
