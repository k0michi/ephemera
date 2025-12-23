import type { CreatePostSignalPayload, Signal, SignalPayload } from "../../shared/api/api.js";
import Crypto from "./crypto.js";
import Hex from "./hex.js";

export default class SignalCrypto {
  static async digest<S extends SignalPayload>(signal: S): Promise<Uint8Array> {
    const payloadString = JSON.stringify(signal);
    const payloadUint8 = new TextEncoder().encode(payloadString);
    return await Crypto.digest(payloadUint8);
  }

  static async sign<S extends SignalPayload>(signal: S, privateKey: Uint8Array): Promise<[S, string]> {
    const payloadHash = await SignalCrypto.digest(signal);
    const signatureUint8 = Crypto.sign(payloadHash, privateKey);
    const signatureHex = Hex.fromUint8Array(signatureUint8);
    return [signal, signatureHex];
  }

  static async verify<S extends Signal>(signal: S): Promise<boolean> {
    const [payload, signatureHex] = signal;
    const payloadHash = await SignalCrypto.digest(payload);
    const signatureUint8 = Hex.toUint8Array(signatureHex);
    return Crypto.verify(payloadHash, signatureUint8, Hex.toUint8Array(payload[1][1]));
  }
}