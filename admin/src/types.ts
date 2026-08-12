import type { components } from './api/generated/schema';

type ApiSchemas = components['schemas'];
type AdminBaulChapterDto = ApiSchemas['AdminBaulChapterDto'];
type AdminBaulDetailDto = ApiSchemas['AdminBaulDetailDto'];
type AdminBaulListItemDto = ApiSchemas['AdminBaulListItemDto'];
type AdminBaulPersonaDto = ApiSchemas['AdminBaulPersonaDto'];
type AdminBaulStatsDto = ApiSchemas['AdminBaulStatsDto'];
type AdminChatContextDebugDto = ApiSchemas['AdminChatContextDebugDto'];
type AdminDashboardResponse = ApiSchemas['AdminDashboardResponse'];
type AdminExternalLinkDto = ApiSchemas['AdminExternalLinkDto'];
type AdminSentEmailDto = ApiSchemas['AdminSentEmailDto'];
type AdminUserBaulMembershipDto = ApiSchemas['AdminUserBaulMembershipDto'];
type AdminUserDetailDto = ApiSchemas['AdminUserDetailDto'];
type AdminUserListItemDto = ApiSchemas['AdminUserListItemDto'];

export class ExternalLink {
  label: string;
  url: string;

  constructor(data: AdminExternalLinkDto) {
    this.label = data.label;
    this.url = data.url;
  }
}

export class DashboardKpis {
  registeredUsers: number;
  totalBaules: number;
  totalPhotos: number;
  photosUploadedToday: number;
  emailsSentLast30Days: number;
  emailsOpenedLast30Days: number;
  externalLinks: ExternalLink[];

  constructor(data: AdminDashboardResponse) {
    this.registeredUsers = data.registeredUsers;
    this.totalBaules = data.totalBaules;
    this.totalPhotos = data.totalPhotos;
    this.photosUploadedToday = data.photosUploadedToday;
    this.emailsSentLast30Days = data.emailsSentLast30Days;
    this.emailsOpenedLast30Days = data.emailsOpenedLast30Days;
    this.externalLinks = data.externalLinks.map((l) => new ExternalLink(l));
  }
}

export class AdminUser {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  lastAccessAt?: string;
  baulCount: number;

  constructor(data: AdminUserListItemDto) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name ?? undefined;
    this.createdAt = data.createdAt;
    this.lastAccessAt = data.lastAccessAt ?? undefined;
    this.baulCount = data.baulCount;
  }
}

export class AdminUserBaulMembership {
  baulId: string;
  baulName: string;
  role: string;
  isCustodio: boolean;
  personId: string;

  constructor(data: AdminUserBaulMembershipDto) {
    this.baulId = data.baulId;
    this.baulName = data.baulName;
    this.role = data.role;
    this.isCustodio = data.isCustodio;
    this.personId = data.personId;
  }
}

export class AdminUserDetail {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  lastAccessAt?: string;
  baules: AdminUserBaulMembership[];
  hasPushToken: boolean;

  constructor(data: AdminUserDetailDto) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name ?? undefined;
    this.createdAt = data.createdAt;
    this.lastAccessAt = data.lastAccessAt ?? undefined;
    this.baules = data.baules.map((b) => new AdminUserBaulMembership(b));
    this.hasPushToken = data.hasPushToken;
  }
}

export class AdminSentEmail {
  id: string;
  userId: string;
  type: string;
  subject: string;
  recipientEmail: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  firstClickedAt?: string;
  firstOpenedAt?: string;

  constructor(data: AdminSentEmailDto) {
    this.id = data.id;
    this.userId = data.userId;
    this.type = data.type;
    this.subject = data.subject;
    this.recipientEmail = data.recipientEmail;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.sentAt = data.sentAt ?? undefined;
    this.firstClickedAt = data.firstClickedAt ?? undefined;
    this.firstOpenedAt = data.firstOpenedAt ?? undefined;
  }
}

export class AdminChatContextDebug {
  baulId: string;
  message: string;
  context: string;

  constructor(data: AdminChatContextDebugDto) {
    this.baulId = data.baulId;
    this.message = data.message;
    this.context = data.context;
  }
}

export class AdminBaul {
  id: string;
  name: string;
  custodioName: string;
  memberCount: number;
  linkedUserCount: number;
  photoCount: number;
  chapterCount: number;
  createdAt: string;

  constructor(data: AdminBaulListItemDto) {
    this.id = data.id;
    this.name = data.name;
    this.custodioName = data.custodioName;
    this.memberCount = data.memberCount;
    this.linkedUserCount = data.linkedUserCount;
    this.photoCount = data.photoCount;
    this.chapterCount = data.chapterCount;
    this.createdAt = data.createdAt;
  }
}

export class AdminBaulPersona {
  personId: string;
  nickname: string;
  name?: string;
  role: string;
  isCustodio: boolean;
  linkedUserId?: string;
  linkedUserName?: string;

  constructor(data: AdminBaulPersonaDto) {
    this.personId = data.personId;
    this.nickname = data.nickname;
    this.name = data.name ?? undefined;
    this.role = data.role;
    this.isCustodio = data.isCustodio;
    this.linkedUserId = data.linkedUserId ?? undefined;
    this.linkedUserName = data.linkedUserName ?? undefined;
  }
}

export class AdminBaulChapter {
  id: string;
  name: string;
  photoCount: number;

  constructor(data: AdminBaulChapterDto) {
    this.id = data.id;
    this.name = data.name;
    this.photoCount = data.photoCount;
  }
}

export class AdminBaulStats {
  photos: number;
  recuerdos: number;
  personas: number;
  chapters: number;
  totalSizeBytes: number;

  constructor(data: AdminBaulStatsDto) {
    this.photos = data.photos;
    this.recuerdos = data.recuerdos;
    this.personas = data.personas;
    this.chapters = data.chapters;
    this.totalSizeBytes = data.totalSizeBytes;
  }
}

export class AdminBaulDetail {
  id: string;
  name: string;
  createdAt: string;
  personas: AdminBaulPersona[];
  chapters: AdminBaulChapter[];
  stats: AdminBaulStats;

  constructor(data: AdminBaulDetailDto) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.personas = data.personas.map((p) => new AdminBaulPersona(p));
    this.chapters = data.chapters.map((c) => new AdminBaulChapter(c));
    this.stats = new AdminBaulStats(data.stats);
  }
}
