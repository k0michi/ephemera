import type { Signal } from "@ephemera/shared/api/api.js";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto.js";

import { ApiError } from "./api_error.js";
import type Config from "./config.js";

export interface ISignalService {
  validate<T extends Signal>(signal: T): Promise<[boolean, string?]>;

  throwIfInvalid<T extends Signal>(signal: T): Promise<void>;
}

export class SignalService implements ISignalService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async validate<T extends Signal>(signal: T): Promise<[boolean, string?]> {
    const verified = await SignalCrypto.verify(signal);

    if (!verified) {
      return [false, 'Invalid signature'];
    }

    if (signal[0][1][0] !== this.config.host) {
      return [false, 'Host mismatch'];
    }

    const now = Date.now();
    const timestamp = signal[0][1][2];

    if (Math.abs(now - timestamp) > this.config.allowedTimeSkewMillis) {
      return [false, 'Timestamp out of range'];
    }

    return [true];
  }

  async throwIfInvalid<T extends Signal>(signal: T): Promise<void> {
    const [isValid, errorMessage] = await this.validate(signal);

    if (!isValid) {
      throw new ApiError(`Invalid signal: ${errorMessage}`, 400);
    }
  }
}