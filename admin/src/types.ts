export class ExternalLink {
  label: string;
  url: string;

  constructor(data: any) {
    this.label = data.label;
    this.url = data.url;
  }
}

export class DashboardKpis {
  registeredUsers: number;
  totalBaules: number;
  totalPhotos: number;
  photosUploadedToday: number;
  externalLinks: ExternalLink[];

  constructor(data: any) {
    this.registeredUsers = data.registeredUsers;
    this.totalBaules = data.totalBaules;
    this.totalPhotos = data.totalPhotos;
    this.photosUploadedToday = data.photosUploadedToday;
    this.externalLinks = (data.externalLinks ?? []).map((l: any) => new ExternalLink(l));
  }
}

export class AdminUser {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  lastAccessAt?: string;
  baulCount: number;

  constructor(data: any) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.lastAccessAt = data.lastAccessAt;
    this.baulCount = data.baulCount;
  }
}

export class AdminUserBaulMembership {
  baulId: string;
  baulName: string;
  role: string;
  personId: string;

  constructor(data: any) {
    this.baulId = data.baulId;
    this.baulName = data.baulName;
    this.role = data.role;
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

  constructor(data: any) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.lastAccessAt = data.lastAccessAt;
    this.baules = (data.baules ?? []).map((b: any) => new AdminUserBaulMembership(b));
  }
}

export class AdminBaul {
  id: string;
  name: string;
  custodioName: string;
  memberCount: number;
  photoCount: number;
  albumCount: number;
  createdAt: string;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.custodioName = data.custodioName;
    this.memberCount = data.memberCount;
    this.photoCount = data.photoCount;
    this.albumCount = data.albumCount;
    this.createdAt = data.createdAt;
  }
}

export class AdminBaulPersona {
  personId: string;
  nickname: string;
  name?: string;
  role: string;
  linkedUserId?: string;
  linkedUserName?: string;

  constructor(data: any) {
    this.personId = data.personId;
    this.nickname = data.nickname;
    this.name = data.name;
    this.role = data.role;
    this.linkedUserId = data.linkedUserId;
    this.linkedUserName = data.linkedUserName;
  }
}

export class AdminBaulAlbum {
  id: string;
  name: string;
  photoCount: number;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.photoCount = data.photoCount;
  }
}

export class AdminBaulStats {
  photos: number;
  recuerdos: number;
  personas: number;
  capitulos: number;

  constructor(data: any) {
    this.photos = data.photos;
    this.recuerdos = data.recuerdos;
    this.personas = data.personas;
    this.capitulos = data.capitulos;
  }
}

export class AdminBaulDetail {
  id: string;
  name: string;
  createdAt: string;
  personas: AdminBaulPersona[];
  capitulos: AdminBaulAlbum[];
  stats: AdminBaulStats;

  constructor(data: any) {
    this.id = data.id;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.personas = (data.personas ?? []).map((p: any) => new AdminBaulPersona(p));
    this.capitulos = (data.capitulos ?? []).map((c: any) => new AdminBaulAlbum(c));
    this.stats = new AdminBaulStats(data.stats);
  }
}
