import Composer from "components/composer";
import Timeline from "components/timeline";

import type { Route } from "./+types/_layout._index";
import { useReader } from "lib/store";
import { EphemeraStore } from "~/store";
import { useEffect, useState } from "react";
import type { Permission } from "@ephemera/shared/api/api";

export function loader() {
  return {
    host: process.env.EPHEMERA_HOST
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `Ephemera@${loaderData.host}` },
    { name: "description", content: "A decentralized bulletin board." },
  ];
}

function usePermissions() {
  const store = useReader(EphemeraStore);
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());

  useEffect(() => {
    const keys = Object.keys(store.keyPairs);

    Promise.all(keys.map(k => store.getClient().getIdentityPermissions(k)))
      .then(results => setPermissions(results.reduce((perms, p) => perms.union(p), new Set())));
  }, [store.keyPairs]);

  return permissions;
}

export default function Home() {
  const permissions = usePermissions();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      {permissions.has('write') && <Composer />}
      <Timeline />
    </div>
  );
}
