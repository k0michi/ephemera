import type { Permission } from "@ephemera/shared/api/api";
import { useReader, useSelector } from "lib/store";
import { useEffect, useState } from "react";

import { EphemeraStore } from "~/store";

export default function usePermissions(): Set<Permission> {
  const store = useReader(EphemeraStore);
  const keyPairs = useSelector(EphemeraStore, (store: EphemeraStore) => store.keyPairs);
  const [permissions, setPermissions] = useState<Set<Permission>>(() => new Set());

  useEffect(() => {
    Promise.all(Object.values(keyPairs).map(kp => store.getIdentityInfoCached(kp)))
      .then(results => {
        const allPermissions = results.reduce((perms, info) => {
          return perms.union(info.permissions);
        }, new Set<Permission>());
        setPermissions(allPermissions);
      });
  }, [keyPairs]);

  return permissions;
}