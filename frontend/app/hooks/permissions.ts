import type { Permission } from "@ephemera/shared/api/api";
import { useReader, useSelector } from "lib/store";
import { useEffect, useState } from "react";

import { EphemeraStore } from "~/store";

export default function usePermissions(): Set<Permission> {
  const store = useReader(EphemeraStore);
  const keyPairs = useSelector(EphemeraStore, (store: EphemeraStore) => store.keyPairs);
  const [permissions, setPermissions] = useState<Set<Permission>>(() => new Set());

  useEffect(() => {
    Promise.all(Object.values(keyPairs).map(kp => store.getClient().getIdentityPermissions(kp)))
      .then(results => setPermissions(results.reduce((perms, p) => perms.union(p), new Set())));
  }, [keyPairs]);

  return permissions;
}   