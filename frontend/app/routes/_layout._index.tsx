import Composer from "components/composer";
import Timeline from "components/timeline";
import { useReader } from "lib/store";

import usePermissions from "~/hooks/permissions";
import { EphemeraStore } from "~/store";

import type { Route } from "./+types/_layout._index";

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
