import { useReader, useSelector } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import type { Route } from "./+types/_index";
import { useEffect, useMemo, useState } from "react";
import Base37 from '@ephemera/shared/lib/base37.js';
import { Button, Container, Row, Col, Alert } from 'react-bootstrap';
import Composer from "components/composer";

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
      setMessage({ type: "success", text: "Post submitted successfully!" });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to submit post."
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={8} lg={6}>
          {message && (
            <Alert
              variant={message.type === "success" ? "success" : "danger"}
              onClose={() => setMessage(null)}
              dismissible
            >
              {message.text}
            </Alert>
          )}
          <Composer onSubmit={handleSubmit} />
          <hr className="my-4" />
          <div>Your public key: {publicKeyMem}</div>
          <Button variant="secondary" className="mt-2" onClick={() => store.revokeKeyPair()}>
            Revoke Key Pair
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
