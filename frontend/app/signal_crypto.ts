import type { CreatePostSignalPayload, Signal, SignalPayload } from "../../shared/api/api.js";
import Crypto from "./crypto.js";
import Hex from "./hex.js";

export default class SignalCrypto {
  static async digest<Header, Body, Footer>
    (signal: SignalPayload<Header, Body, Footer>): Promise<Uint8Array> {
    const payloadString = JSON.stringify(signal);
    const payloadUint8 = new TextEncoder().encode(payloadString);
    return await Crypto.digest(payloadUint8);
  }

  static async sign<Header, Body, Footer>
    (signal: SignalPayload<Header, Body, Footer>, privateKey: Uint8Array): Promise<Signal<SignalPayload<Header, Body, Footer>>> {
    const payloadHash = await SignalCrypto.digest(signal);
    const signatureUint8 = Crypto.sign(payloadHash, privateKey);
    const signatureHex = Hex.fromUint8Array(signatureUint8);
    return [signal, signatureHex];
  }

  static async verify<Header, Body, Footer>
    (signal: Signal<SignalPayload<Header, Body, Footer>>, publicKey: Uint8Array): Promise<boolean> {
    const [payload, signatureHex] = signal;
    const payloadHash = await SignalCrypto.digest(payload);
    const signatureUint8 = Hex.toUint8Array(signatureHex);

    // TODO: Check structure

    return Crypto.verify(payloadHash, signatureUint8, publicKey);
  }
}