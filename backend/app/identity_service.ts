import type { GetIdentitySignal, Permission } from "@ephemera/shared/api/api.js";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto.js";

import { ApiError } from "./api_error.js";
import type Config from "./config.js";
import { IllegalArgumentError } from "./errors.js";
import type { ISignalService } from "./signal_service.js";

export interface IdentityDescriptor {
  /**
   * Public key of the identity, represented as a Base37 string.
   */
  identity: string;
  permissions: Set<Permission>;
}

export interface IIdentityService {
  getIdentityDescriptor(identity: string): Promise<IdentityDescriptor>;

  getIdentityDescriptor(signal: GetIdentitySignal): Promise<IdentityDescriptor>;

  getPermissions(identity: string): Promise<Set<Permission>>;

  throwIfNotPermitted(identity: string, permission: Permission): Promise<void>;
}

export default class IdentityService implements IIdentityService {
  private config: Config;
  private signalService: ISignalService;

  constructor(config: Config, signalService: ISignalService) {
    this.config = config;
    this.signalService = signalService;
  }

  async getIdentityDescriptor(...args: [string] | [GetIdentitySignal]): Promise<IdentityDescriptor> {
    if (args.length === 1 && typeof args[0] === 'string') {
      return this.getIdentityDescriptor0(args[0]);
    } else if (args.length === 1 && Array.isArray(args[0])) {
      return this.getIdentityDescriptor1(args[0]);
    } else {
      throw new IllegalArgumentError(`Invalid arguments for getIdentityDescriptor`);
    }
  }

  async getIdentityDescriptor0(identity: string): Promise<IdentityDescriptor> {
    const permissions = await this.getPermissions(identity);
    return { identity, permissions };
  }

  async getIdentityDescriptor1(signal: GetIdentitySignal): Promise<IdentityDescriptor> {
    await this.signalService.throwIfInvalid(signal);

    const identity = signal[0][1][1];
    const permissions = await this.getPermissions(identity);
    return { identity, permissions };
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