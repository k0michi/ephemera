import { useReader, useSelector } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import type { Route } from "./+types/_index";
import { useEffect, useMemo } from "react";
import Base37 from "~/base37";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const publicKey = useSelector(EphemeraStoreContext, (store) => store.keyPair?.publicKey);
  const store = useReader(EphemeraStoreContext);

  useEffect(() => {
    store.prepareKeyPair();
  }, [store]);

  const publicKeyMem = useMemo(() => Base37.fromUint8Array(publicKey || new Uint8Array()), [publicKey]);

  return <>
    <div>Your public key: {publicKeyMem}</div>
    <button onClick={() => store.revokeKeyPair()}>Revoke Key Pair</button>
  </>;
}
