import { IUserRepository } from "../../repositories/user.repository.ts";
import { User } from "../../types.ts";

export class FakeUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  getById(id: string): Promise<User | null> {
    return Promise.resolve(this.users.get(id) || null);
  }

  getByEmail(email: string): Promise<User | null> {
    return Promise.resolve(
      Array.from(this.users.values()).find((u) => u.email === email) ||
        null,
    );
  }

  create(user: User): Promise<void> {
    this.users.set(user.id, user);
    return Promise.resolve();
  }
}
