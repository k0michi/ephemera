import type { Permission } from "@ephemera/shared/api/api";
import { useEffect, useState } from "react";

import type { EphemeraStore } from "~/store";

export default function usePermissions(store: EphemeraStore): Set<Permission> {
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());

  useEffect(() => {
    const keys = Object.keys(store.keyPairs);

    Promise.all(keys.map(k => store.getClient().getIdentityPermissions(k)))
      .then(results => setPermissions(results.reduce((perms, p) => perms.union(p), new Set())));
  }, [store.keyPairs]);

  return permissions;
}   