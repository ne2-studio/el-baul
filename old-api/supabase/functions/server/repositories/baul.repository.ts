import { AccessRequest, Baul, RemovalRequest, SharedUser } from "../types.ts";

export interface IBaulRepository {
  getById(id: string): Promise<Baul | null>;
  getAllForUser(userId: string): Promise<Baul[]>;
  create(baul: Baul): Promise<void>;
  update(baul: Baul): Promise<void>;

  // Sharing
  getSharedUsers(baulId: string): Promise<SharedUser[]>;
  getSharedUser(baulId: string, userId: string): Promise<SharedUser | null>;
  getSharedUserById(sharedUserId: string): Promise<SharedUser | null>;
  addSharedUser(sharedUser: SharedUser): Promise<void>;
  updateSharedUser(sharedUser: SharedUser): Promise<void>;
  removeSharedUser(baulId: string, email: string): Promise<void>;
  getUserSharedAccess(userId: string, baulId: string): Promise<SharedUser | null>;

  // Access Requests
  getAccessRequests(baulId: string): Promise<AccessRequest[]>;
  getAccessRequest(
    baulId: string,
    requestId: string,
  ): Promise<AccessRequest | null>;
  createAccessRequest(request: AccessRequest): Promise<void>;
  deleteAccessRequest(baulId: string, requestId: string): Promise<void>;

  // Removal Requests
  getRemovalRequests(baulId: string): Promise<RemovalRequest[]>;
  getRemovalRequest(
    baulId: string,
    requestId: string,
  ): Promise<RemovalRequest | null>;
  createRemovalRequest(request: RemovalRequest): Promise<void>;
  deleteRemovalRequest(baulId: string, requestId: string): Promise<void>;
}
