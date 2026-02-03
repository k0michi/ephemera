import Notifier from "components/notifier";
import { Col, Container, Row } from "react-bootstrap";
import { Link, Outlet } from "react-router";

import { Dropdown } from "react-bootstrap";
import Identicon from "components/identicon";
import { EphemeraStoreContext } from "~/store";
import { useReader, useSelector } from "lib/store";
import Base37 from "@ephemera/shared/lib/base37";
import { useEffect } from "react";
import ServerIdenticon from "components/server_identicon";

function UserMenu() {
  const key = useSelector(EphemeraStoreContext, (store) => {
    return store.keyPair?.publicKey || null;
  });

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="link"
        bsPrefix="btn p-0 border-0"
        id="user-menu"
        aria-label="User menu"
        style={{ padding: 0 }}
      >
        {key !== null ?
          <Identicon data={key} style={{ width: 32, height: 32, borderRadius: 4 }} />
          :
          <div style={{ width: 32, height: 32, borderRadius: 4, backgroundColor: '#e0e0e0' }}></div>
        }
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item disabled>{
          key !== null ? `@${Base37.fromUint8Array(key)}` : 'Not signed in'
        }</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item href="/settings">Settings</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default function Layout() {
  const store = useReader(EphemeraStoreContext);

  useEffect(() => {
    store.prepareKeyPair();
  }, [store]);

  return (
    <>
      <nav style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000, background: "#fff", borderBottom: "1px solid #e8ecef" }}>
        <Container>
          <Row className="align-items-center" style={{ height: "56px" }}>
            <Col>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <Link to="/" style={{ textDecoration: "none" }}>
                  <ServerIdenticon
                    style={{
                      width: 24
                    }}
                    data={new TextEncoder().encode(store.getHost() || '')}
                  />
                </Link>
                <Link to="/" style={{ textDecoration: "none" }}>
                  <div style={{ fontSize: "1.5rem", color: "black" }}>Ephemera</div>
                </Link>
              </div>
            </Col>
            <Col xs="auto">
              <UserMenu />
            </Col>
          </Row>
        </Container>
      </nav>
      <Container style={{ paddingTop: "72px" }}>
        <Row className="justify-content-md-center">
          <Col md={8} lg={6}>
            <Outlet />
          </Col>
        </Row>
        <div style={{ textAlign: 'center', color: '#bbb', fontSize: '0.8rem', marginTop: `2rem`, marginBottom: `2rem` }}>
          Ephemera {import.meta.env.EPHEMERA_COMMIT_HASH}
        </div>
      </Container>
      <Notifier />
    </>
  );
}