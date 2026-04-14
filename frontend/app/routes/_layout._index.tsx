import type { Route } from "./+types/_layout._index";
import Composer from "components/composer";
import Timeline from "components/timeline";

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
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <Composer />
      <Timeline />
    </div>
  );
}
