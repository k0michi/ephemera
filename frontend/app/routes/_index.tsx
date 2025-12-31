import { useReader, useSelector } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import type { Route } from "./+types/_index";
import { useEffect, useMemo, useState } from "react";
import Base37 from '@ephemera/shared/lib/base37.js';
import { Button, Container, Row, Col, Toast, ToastContainer } from 'react-bootstrap';
import Composer from "components/composer";
import type { CreatePostSignal } from "@ephemera/shared/api/api";
import FileHelper from "~/file_helper";
import Timeline from "components/timeline";
import { exportedKeyPairSchema } from "@ephemera/shared/api/api_schema";
import Notifier from "components/notifier";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Ephemera" },
    { name: "description", content: "Welcome to Ephemera" },
  ];
}

export type MessageState = { type: "success" | "error"; text: string } | null;

export default function Home() {
  const publicKey = useSelector(EphemeraStoreContext, (store) => store.keyPair?.publicKey);
  const store = useReader(EphemeraStoreContext);
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    store.prepareKeyPair();
  }, [store]);


  const publicKeyMem = useMemo(() => Base37.fromUint8Array(publicKey || new Uint8Array()), [publicKey]);

  const handleSubmit = async (value: string) => {
    try {
      await store.sendPost(value);
      store.addLog("success", "Post submitted successfully!");
    } catch (error) {
      store.addLog("danger", error instanceof Error ? error.message : "Failed to submit post.");
    }
  };

  const handleExportKeyPair = () => {
    const exported = store.exportKeyPair();

    if (!exported) return;

    FileHelper.downloadFile(
      JSON.stringify(exported),
      `${publicKeyMem}.json`,
      'application/json'
    );
  };

  const handleImportKeyPair = async () => {
    try {
      const file = await FileHelper.selectFile({ accept: 'application/json' });
      const text = await file.text();
      let parsed;

      try {
        parsed = exportedKeyPairSchema.parse(JSON.parse(text));
      } catch {
        throw new Error("Invalid key pair format");
      }

      store.importKeyPair(parsed);
      store.addLog("success", "Key pair imported successfully!");
    } catch (error) {
      store.addLog("danger", error instanceof Error ? error.message : "Failed to import key pair.");
    }
  };

  return (
    <>
      <Container className="mt-5">
        <Row className="justify-content-md-center">
          <Col md={8} lg={6}>
            <Composer onSubmit={handleSubmit} />
            <hr className="my-4" />
            <div>Your public key: {publicKeyMem}</div>
            <Button variant="secondary" className="mt-2" onClick={() => store.revokeKeyPair()}>
              Revoke Key Pair
            </Button>
            <Button variant="secondary" className="mt-2" onClick={handleExportKeyPair}>
              Export Key Pair
            </Button>
            <Button variant="secondary" className="mt-2" onClick={handleImportKeyPair}>
              Import Key Pair
            </Button>
            <Timeline />
          </Col >
        </Row >
      </Container>
      <Notifier />
    </>
  );
}
