import type { Permission } from "@ephemera/shared/api/api";
import { useReader, useSelector } from "lib/store";

import { useAsyncMemo } from "~/hooks/async_memo";
import { EphemeraStore } from "~/store";

export default function usePermissions(): Set<Permission> {
  const store = useReader(EphemeraStore);
  const keyPairs = useSelector(EphemeraStore, (store: EphemeraStore) => store.keyPairs);

  return useAsyncMemo(
    () => Promise.all(Object.values(keyPairs).map(kp => store.getIdentityInfoCached(kp)))
      .then(results => results.reduce((perms, info) => perms.union(info.permissions), new Set<Permission>())),
    [keyPairs],
    new Set<Permission>()
  );
}