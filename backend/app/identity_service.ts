import type { Permission } from "@ephemera/shared/api/api.js";

import { ApiError } from "./api_error.js";
import type Config from "./config.js";

export interface IIdentityService {
  getPermissions(identity: string): Promise<Set<Permission>>;

  throwIfNotPermitted(identity: string, permission: Permission): Promise<void>;
}

export default class IdentityService implements IIdentityService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async getPermissions(identity: string): Promise<Set<Permission>> {
    const permissions = new Set<Permission>();
    const { allowedIdentities, deniedIdentities } = this.config;

    if (!deniedIdentities.includes(identity)) {
      if (allowedIdentities.length === 0 || allowedIdentities.includes(identity)) {
        permissions.add('write');
      }
    }

    return permissions;
  }

  async throwIfNotPermitted(identity: string, permission: Permission): Promise<void> {
    const permissions = await this.getPermissions(identity);
    if (!permissions.has(permission)) {
      throw new ApiError('Permission denied', 403);
    }
  }
}