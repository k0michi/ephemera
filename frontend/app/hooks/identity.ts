import type { IdentityInfo } from "@ephemera/shared/lib/client";
import type { KeyPair } from "@ephemera/shared/lib/crypto";
import { useReader } from "lib/store";

import { useAsyncMemo } from "~/hooks/async_memo";
import { EphemeraStore } from "~/store";

export function useIdentityInfo(keyPair: KeyPair | null): IdentityInfo | null {
  const store = useReader(EphemeraStore);

  return useAsyncMemo(
    () => keyPair ? store.getIdentityInfoCached(keyPair) : null,
    [keyPair],
    null
  );
}