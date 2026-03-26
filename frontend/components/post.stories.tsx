import Crypto from "@ephemera/shared/lib/crypto";
import Post from "./post";
import 'bootstrap/dist/css/bootstrap.css';
import Base37 from "@ephemera/shared/lib/base37";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto";
import type { CreatePostSignalPayload } from "@ephemera/shared/api/api";

const keyPair = Crypto.generateKeyPair();

export const PostExample = async () => {
  const payload: CreatePostSignalPayload = [
    0,
    [
      "example.com",
      Base37.fromUint8Array(keyPair.publicKey),
      Date.now(),
      'create_post'
    ],
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    [],
  ];
  const signed = await SignalCrypto.sign(payload, keyPair.privateKey);

  return (
    <Post post={signed} />
  );
};