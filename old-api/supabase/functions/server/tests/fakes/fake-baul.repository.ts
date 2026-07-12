import { IBaulRepository } from "../../repositories/baul.repository.ts";
import {
  AccessRequest,
  Baul,
  RemovalRequest,
  SharedUser,
} from "../../types.ts";

export class FakeBaulRepository implements IBaulRepository {
  private baules: Map<string, Baul> = new Map();
  private sharedUsers: Map<string, SharedUser[]> = new Map();
  private accessRequests: Map<string, AccessRequest[]> = new Map();
  private removalRequests: Map<string, RemovalRequest[]> = new Map();
  private userSharedAccess: Map<string, SharedUser> = new Map();

  getById(id: string): Promise<Baul | null> {
    return Promise.resolve(this.baules.get(id) || null);
  }

  getAllForUser(userId: string): Promise<Baul[]> {
    const owned = Array.from(this.baules.values()).filter((b) =>
      b.custodioId === userId
    );
    const shared = Array.from(this.userSharedAccess.entries())
      .filter(([key]) => key.startsWith(`baul:shared:${userId}:`))
      .map(([_, val]) => this.baules.get(val.baulId))
      .filter((b): b is Baul => b !== undefined);

    return Promise.resolve([...owned, ...shared].map((b) => ({
      ...b,
      isCustodio: b.custodioId === userId,
      role: b.custodioId === userId ? "custodio" : "miembro", // Simplified for fake
    })));
  }

  create(baul: Baul): Promise<void> {
    this.baules.set(baul.id, baul);
    return Promise.resolve();
  }

  update(baul: Baul): Promise<void> {
    this.baules.set(baul.id, baul);
    return Promise.resolve();
  }

  getSharedUsers(baulId: string): Promise<SharedUser[]> {
    return Promise.resolve(this.sharedUsers.get(baulId) || []);
  }

  getSharedUser(
    baulId: string,
    userId: string,
  ): Promise<SharedUser | null> {
    const users = this.sharedUsers.get(baulId) || [];
    return Promise.resolve(users.find((u) => u.userId === userId) || null);
  }

  addSharedUser(sharedUser: SharedUser): Promise<void> {
    const users = this.sharedUsers.get(sharedUser.baulId) || [];
    users.push(sharedUser);
    this.sharedUsers.set(sharedUser.baulId, users);
    if (sharedUser.userId) {
      this.userSharedAccess.set(
        `baul:shared:${sharedUser.userId}:${sharedUser.baulId}`,
        sharedUser,
      );
    }
    return Promise.resolve();
  }

  updateSharedUser(sharedUser: SharedUser): Promise<void> {
    const users = this.sharedUsers.get(sharedUser.baulId) || [];
    const index = users.findIndex((u) => u.email === sharedUser.email);
    if (index !== -1) {
      users[index] = sharedUser;
      this.sharedUsers.set(sharedUser.baulId, users);
      if (sharedUser.userId) {
        this.userSharedAccess.set(
          `baul:shared:${sharedUser.userId}:${sharedUser.baulId}`,
          sharedUser,
        );
      }
    }
    return Promise.resolve();
  }

  removeSharedUser(baulId: string, email: string): Promise<void> {
    const users = this.sharedUsers.get(baulId) || [];
    const userToRemove = users.find((u) => u.email === email);
    this.sharedUsers.set(baulId, users.filter((u) => u.email !== email));
    if (userToRemove?.userId) {
      this.userSharedAccess.delete(`baul:shared:${userToRemove.userId}:${baulId}`);
    }
    return Promise.resolve();
  }

  getUserSharedAccess(
    userId: string,
    baulId: string,
  ): Promise<SharedUser | null> {
    return Promise.resolve(
      this.userSharedAccess.get(`baul:shared:${userId}:${baulId}`) || null,
    );
  }

  getSharedUserById(sharedUserId: string): Promise<SharedUser | null> {
    const sharedUser = Array.from(this.sharedUsers.values())
      .flat()
      .find((u) => u.id === sharedUserId);
    return Promise.resolve(sharedUser || null);
  }

  getAccessRequests(baulId: string): Promise<AccessRequest[]> {
    return Promise.resolve(this.accessRequests.get(baulId) || []);
  }

  getAccessRequest(
    baulId: string,
    requestId: string,
  ): Promise<AccessRequest | null> {
    const requests = this.accessRequests.get(baulId) || [];
    return Promise.resolve(requests.find((r) => r.id === requestId) || null);
  }

  createAccessRequest(request: AccessRequest): Promise<void> {
    const requests = this.accessRequests.get(request.baulId) || [];
    requests.push(request);
    this.accessRequests.set(request.baulId, requests);
    return Promise.resolve();
  }

  deleteAccessRequest(baulId: string, requestId: string): Promise<void> {
    const requests = this.accessRequests.get(baulId) || [];
    this.accessRequests.set(baulId, requests.filter((r) => r.id !== requestId));
    return Promise.resolve();
  }

  getRemovalRequests(baulId: string): Promise<RemovalRequest[]> {
    return Promise.resolve(this.removalRequests.get(baulId) || []);
  }

  getRemovalRequest(
    baulId: string,
    requestId: string,
  ): Promise<RemovalRequest | null> {
    const requests = this.removalRequests.get(baulId) || [];
    return Promise.resolve(requests.find((r) => r.id === requestId) || null);
  }

  createRemovalRequest(request: RemovalRequest): Promise<void> {
    const requests = this.removalRequests.get(request.baulId) || [];
    requests.push(request);
    this.removalRequests.set(request.baulId, requests);
    return Promise.resolve();
  }

  deleteRemovalRequest(baulId: string, requestId: string): Promise<void> {
    const requests = this.removalRequests.get(baulId) || [];
    this.removalRequests.set(
      baulId,
      requests.filter((r) => r.id !== requestId),
    );
    return Promise.resolve();
  }
}
