import SignalCrypto from "../app/signal_crypto";
import Crypto from "../app/crypto";
import type { CreatePostSignalPayload } from "../../shared/api/api";
import { describe, expect, it, vi } from "vitest";
import Hex from "~/hex";

describe("SignalCrypto.sign", () => {
  it("should return the result of signing the payload digest in hex", async () => {
    const keyPair = Crypto.generateKeyPair();
    const payload: CreatePostSignalPayload = [
      0,
      ["host", Hex.fromUint8Array(keyPair.publicKey), 0, "create_post"],
      "body text",
      []
    ];

    vi.spyOn(Crypto, "sign").mockReturnValueOnce(new Uint8Array([1, 2, 3, 4]));

    const result = await SignalCrypto.sign(payload, keyPair.privateKey);

    expect(result).toEqual([payload, "01020304"]);
  });

  it("should compute the digest of the payload before signing", async () => {
    const keyPair = Crypto.generateKeyPair();
    const payload: CreatePostSignalPayload = [
      0,
      ["host", Hex.fromUint8Array(keyPair.publicKey), 0, "create_post"],
      "body text",
      []
    ];

    const payloadString = JSON.stringify(payload);
    const payloadUint8 = new TextEncoder().encode(payloadString);
    const expectedDigest = await Crypto.digest(payloadUint8);

    const signSpy = vi.spyOn(Crypto, "sign").mockReturnValueOnce(new Uint8Array([1, 2, 3, 4]));

    await SignalCrypto.sign(payload, keyPair.privateKey);

    expect(signSpy).toHaveBeenCalledWith(expectedDigest, keyPair.privateKey);
  });

  it("should return a verifiable signature", async () => {
    const keyPair = Crypto.generateKeyPair();

    const payload: CreatePostSignalPayload = [
      0,
      ["host", Hex.fromUint8Array(keyPair.publicKey), 0, "create_post"],
      "body text",
      []
    ];

    const signed = await SignalCrypto.sign(payload, keyPair.privateKey);
    const isValid = await SignalCrypto.verify(signed, keyPair.publicKey);

    expect(isValid).toBe(true);
  });
});
