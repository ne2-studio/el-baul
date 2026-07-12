import { BaulPreview, SharedUser } from "../types.ts";
import { IBaulRepository } from "../repositories/baul.repository.ts";
import { IAlbumRepository } from "../repositories/album.repository.ts";
import { IPhotoRepository } from "../repositories/photo.repository.ts";
import { IActivityRepository } from "../repositories/activity.repository.ts";
import { IUserRepository } from "../repositories/user.repository.ts";
import { IFileStorage } from "../repositories/file-storage.interface.ts";

export class BaulUseCases {
  constructor(
    private baulRepo: IBaulRepository,
    private userRepo: IUserRepository,
    private activityRepo: IActivityRepository,
    private photoRepo: IPhotoRepository,
    private albumRepo: IAlbumRepository,
    private fileStorage: IFileStorage,
  ) {}

  async getBaulesForUser(userId: string) {
    return await this.baulRepo.getAllForUser(userId);
  }

  async createBaul(
    userId: string,
    name: string,
    description?: string,
  ) {
    const baulId = crypto.randomUUID();
    const now = new Date().toISOString();

    const baul = {
      id: baulId,
      name,
      description,
      custodioId: userId,
      albumCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.baulRepo.create(baul);
    return baul;
  }

  async getBaulById(userId: string, baulId: string) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) return null;

    const isCustodio = baul.custodioId === userId;
    const sharedAccess = await this.baulRepo.getUserSharedAccess(
      userId,
      baulId,
    );

    if (!isCustodio && !sharedAccess) {
      throw new Error("Access denied");
    }

    return {
      ...baul,
      isCustodio,
      role: isCustodio ? "custodio" : (sharedAccess?.role || "miembro"),
    };
  }

  async getBaulPreview(baulId: string): Promise<BaulPreview | null> {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) return null;

    const photos = await this.photoRepo.getPreviewPhotos(baulId, 4);
    const previewPhotosUrls = await Promise.all(
      photos.map(async (photo) => await this.fileStorage.getSignedUrl(photo.url)),
    );

    return {
      id: baul.id,
      name: baul.name,
      description: baul.description,
      previewPhotos: previewPhotosUrls,
    };
  }

  async getAccessRequests(userId: string, baulId: string) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    return await this.baulRepo.getAccessRequests(baulId);
  }

  async createAccessRequest(
    userId: string,
    email: string,
    baulId: string,
    message?: string,
  ) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");

    const userProfile = await this.userRepo.getById(userId);
    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    const request = {
      id: requestId,
      email,
      name: userProfile?.name,
      message,
      requestDate: now,
      status: "pending" as const,
      baulId,
    };

    await this.baulRepo.createAccessRequest(request);

    // Create activity
    await this.activityRepo.create({
      id: crypto.randomUUID(),
      type: "access-request",
      baulId,
      baulName: baul.name,
      timestamp: now,
      isActionable: true,
      requesterEmail: email,
      accessRequestId: requestId,
    });

    return request;
  }

  async approveAccessRequest(
    userId: string,
    baulId: string,
    requestId: string,
    role: "miembro" | "colaborador",
  ) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    const request = await this.baulRepo.getAccessRequest(baulId, requestId);
    if (!request) throw new Error("Request not found");

    const invitedUser = await this.userRepo.getByEmail(request.email);
    if (!invitedUser) throw new Error("User not found");

    const now = new Date().toISOString();
    const sharedUser: SharedUser = {
      id: crypto.randomUUID(),
      userId: invitedUser.id,
      email: invitedUser.email,
      role,
      status: "active" as const,
      invitedDate: now,
      baulId,
    };

    await this.baulRepo.addSharedUser(sharedUser);
    await this.baulRepo.deleteAccessRequest(baulId, requestId);

    // Create activity for access granted
    await this.activityRepo.create({
      id: crypto.randomUUID(),
      type: "access-granted",
      baulId,
      baulName: baul.name,
      timestamp: now,
      isActionable: false,
      requesterEmail: request.email,
    });

    return sharedUser;
  }

  async rejectAccessRequest(userId: string, baulId: string, requestId: string) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    await this.baulRepo.deleteAccessRequest(baulId, requestId);
  }

  async getSharedUsers(_userId: string, baulId: string) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");

    const sharedUsers = await this.baulRepo.getSharedUsers(baulId);

    // Populate names if missing (e.g. for pending users or if not joined correctly)
    const sharedUsersWithNames = await Promise.all(
      sharedUsers.map(async (u) => {
        if (u.name) return u;
        if (u.userId) {
          const user = await this.userRepo.getById(u.userId);
          if (user) {
            return { ...u, name: user.name };
          }
        }
        return u;
      }),
    );

    // Get custodian info
    const custodianUser = await this.userRepo.getById(baul.custodioId);
    if (!custodianUser) throw new Error("Custodian user not found");

    const custodian: SharedUser = {
      id: "custodian-" + baul.custodioId,
      userId: baul.custodioId,
      email: custodianUser.email,
      name: custodianUser.name,
      role: "custodio",
      status: "active",
      invitedDate: baul.createdAt,
      baulId: baul.id,
    };

    return [custodian, ...sharedUsersWithNames];
  }

  async shareBaul(
    userId: string,
    baulId: string,
    email: string,
    role: "miembro" | "colaborador" | "custodio",
  ) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    // Check if user already exists
    const existingUser = await this.userRepo.getByEmail(email);

    // Check if invitation already exists to avoid 23505 error
    const sharedUsers = await this.baulRepo.getSharedUsers(baulId);
    const existingInvitation = sharedUsers.find((u) => u.email === email);

    if (existingInvitation) {
      existingInvitation.status = existingUser ? "active" : "pending";
      existingInvitation.role = role;
      existingInvitation.userId = existingUser?.id;
      await this.baulRepo.updateSharedUser(existingInvitation);
      return existingInvitation;
    }

    const invitationId = crypto.randomUUID();
    const now = new Date().toISOString();

    const invitation: SharedUser = {
      id: invitationId,
      userId: existingUser?.id,
      email,
      role,
      status: existingUser ? "active" : "pending",
      invitedDate: now,
      baulId,
    };

    await this.baulRepo.addSharedUser(invitation);
    return invitation;
  }

  async updateSharedUserRole(
    userId: string,
    baulId: string,
    sharedUserId: string,
    role: "miembro" | "colaborador" | "custodio",
  ) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    const sharedUser = await this.baulRepo.getSharedUserById(sharedUserId);
    if (!sharedUser) throw new Error("Shared user not found");

    sharedUser.role = role;
    await this.baulRepo.updateSharedUser(sharedUser);

    // Create activity for role change
    await this.activityRepo.create({
      id: crypto.randomUUID(),
      type: "role-changed",
      baulId,
      baulName: baul.name,
      timestamp: new Date().toISOString(),
      isActionable: false,
    });

    return sharedUser;
  }

  async removeSharedUser(userId: string, baulId: string, email: string) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    await this.baulRepo.removeSharedUser(baulId, email);
  }

  async acceptInvite(userId: string, email: string, baulId: string) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");

    // If the user is the owner (custodio), they already have full access.
    if (baul.custodioId === userId) {
      return;
    }

    // Check if the user already has shared access.
    const existingSharedAccess = await this.baulRepo.getUserSharedAccess(
      userId,
      baulId,
    );
    if (existingSharedAccess) {
      return;
    }

    // Add user as a member (role: "miembro", status: "active")
    const invitation: SharedUser = {
      id: crypto.randomUUID(),
      userId,
      email,
      role: "miembro",
      status: "active",
      invitedDate: new Date().toISOString(),
      baulId,
    };

    await this.baulRepo.addSharedUser(invitation);
  }

  async getSignedUrl(path: string): Promise<string> {
    return await this.fileStorage.getSignedUrl(path);
  }

  async getRemovalRequests(userId: string, baulId: string) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    const requests = await this.baulRepo.getRemovalRequests(baulId);

    // Generate signed URLs for each photo in requests
    const requestsWithUrls = await Promise.all(requests.map(async (request) => {
      if (request.photoUrl && !request.photoUrl.startsWith("http")) {
        request.photoUrl = await this.getSignedUrl(request.photoUrl);
      }
      return request;
    }));

    return requestsWithUrls;
  }

  async createRemovalRequest(
    userId: string,
    baulId: string,
    photoId: string,
    reason?: string,
  ) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");

    const photo = await this.photoRepo.getById(photoId);
    if (!photo) throw new Error("Photo not found");

    const userProfile = await this.userRepo.getById(userId);
    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();

    const request = {
      id: requestId,
      photoId,
      photoUrl: photo.url,
      photoCaption: photo.caption,
      requesterName: userProfile?.name || "Usuario",
      requesterEmail: userProfile?.email || "",
      reason,
      requestDate: now,
      status: "pending" as const,
      baulId,
    };

    await this.baulRepo.createRemovalRequest(request);

    // Create activity
    await this.activityRepo.create({
      id: crypto.randomUUID(),
      type: "photo-removal-request",
      baulId,
      baulName: baul.name,
      timestamp: now,
      isActionable: true,
      removalRequestId: requestId,
    });

    return request;
  }

  async approveRemovalRequest(
    userId: string,
    baulId: string,
    requestId: string,
  ) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    const request = await this.baulRepo.getRemovalRequest(baulId, requestId);
    if (!request) throw new Error("Request not found");

    // Update counts
    const photo = await this.photoRepo.getById(request.photoId);
    if (photo) {
      const album = await this.albumRepo.getById(photo.albumId);
      if (album) {
        album.photoCount = Math.max(0, (album.photoCount || 1) - 1);
        await this.albumRepo.update(album);
      }
    }

    // Delete the photo AFTER updating count if we need its info
    await this.photoRepo.delete(request.photoId);

    await this.baulRepo.deleteRemovalRequest(baulId, requestId);
  }

  async rejectRemovalRequest(
    userId: string,
    baulId: string,
    requestId: string,
  ) {
    const baul = await this.baulRepo.getById(baulId);
    if (!baul) throw new Error("Baul not found");
    if (baul.custodioId !== userId) throw new Error("Access denied");

    await this.baulRepo.deleteRemovalRequest(baulId, requestId);
  }
}
