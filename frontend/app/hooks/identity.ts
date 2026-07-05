import Base37 from "@ephemera/shared/lib/base37";
import type { IdentityInfo } from "@ephemera/shared/lib/client";
import type { KeyPair } from "@ephemera/shared/lib/crypto";
import { useReader, useSelector } from "lib/store";
import { useEffect, useState } from "react";

import { EphemeraStore } from "~/store";

export function useIdentityInfo(keyPair: KeyPair | null): IdentityInfo | null {
  const store = useReader(EphemeraStore);
  const [identityInfo, setIdentityInfo] = useState<IdentityInfo | null>(null);

  useEffect(() => {
    if (!keyPair) {
      setIdentityInfo(null);
      return;
    }

    store.getIdentityInfoCached(keyPair).then(info => {
      setIdentityInfo(info);
    });
  }, [keyPair]);

  return identityInfo;
}