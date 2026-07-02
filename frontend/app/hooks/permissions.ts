import type { Permission } from "@ephemera/shared/api/api";
import { useEffect, useState } from "react";

import type { EphemeraStore } from "~/store";

export default function usePermissions(store: EphemeraStore): Set<Permission> {
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());

  useEffect(() => {
    const keyPairs = Object.values(store.keyPairs);

    Promise.all(keyPairs.map(kp => store.getClient().getIdentityPermissions(kp)))
      .then(results => setPermissions(results.reduce((perms, p) => perms.union(p), new Set())));
  }, [store.keyPairs]);

  return permissions;
}   