import { useReader, useSelector } from "lib/store";
import { Container, Dropdown, Row, Col } from "react-bootstrap";
import { Link, useNavigate } from "react-router";
import { EphemeraStoreContext } from "~/store";
import Identicon from "./identicon";
import Base37 from "@ephemera/shared/lib/base37";
import { ServersLink } from "./link";
import ServerIdenticon from "./server_identicon";

function UserMenu() {
  const navigate = useNavigate();

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
        <Dropdown.Item onClick={
          () => {
            navigate('/settings');
          }
        }>Settings</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default function Nav() {
  const store = useReader(EphemeraStoreContext);

  return (
    <nav style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000, background: "#fff", borderBottom: "1px solid #e8ecef" }}>
      <Container>
        <Row className="align-items-center" style={{ height: "56px" }}>
          <Col style={{ display: "flex", blockSize: "100%" }}>
            <div style={{ display: "flex", alignItems: "stretch", gap: "12px", blockSize: "100%" }}>
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

              <ServersLink />
            </div>
          </Col>
          <Col xs="auto">
            <UserMenu />
          </Col>
        </Row>
      </Container>
    </nav>);
}