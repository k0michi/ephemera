import { useReader, useSelector } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import type { Route } from "./+types/_index";
import { useEffect, useMemo } from "react";
import Base37 from "~/base37";
import { Form, Button, Container, Row, Col } from 'react-bootstrap';

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Ephemera" },
    { name: "description", content: "Welcome to Ephemera" },
  ];
}

export default function Home() {
  const publicKey = useSelector(EphemeraStoreContext, (store) => store.keyPair?.publicKey);
  const store = useReader(EphemeraStoreContext);

  useEffect(() => {
    store.prepareKeyPair();
  }, [store]);

  const publicKeyMem = useMemo(() => Base37.fromUint8Array(publicKey || new Uint8Array()), [publicKey]);

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md={8} lg={6}>
          <Form>
            <Form.Group className="mb-3" controlId="postContent">
              <Form.Control as="textarea" rows={4} placeholder="Write here..." />
            </Form.Group>
            <Button variant="primary" type="submit" onClick={() => {
              // TODO
            }}>
              Submit
            </Button>
          </Form>
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
