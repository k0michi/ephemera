import { useReader, useSelector } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import type { Route } from "./+types/_layout._index";
import Composer from "components/composer";
import Timeline from "components/timeline";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Ephemera" },
    { name: "description", content: "Welcome to Ephemera" },
  ];
}

export default function Home() {
  const store = useReader(EphemeraStoreContext);

  const handleSubmit = async (value: string) => {
    try {
      await store.sendPost(value);
      store.addLog("success", "Post submitted successfully!");
      return true;
    } catch (error) {
      store.addLog("danger", error instanceof Error ? error.message : "Failed to submit post.");
      return false;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <Composer onSubmit={handleSubmit} />
      <Timeline />
    </div>
  );
}
