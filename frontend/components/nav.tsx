import { useSelector } from "lib/store";
import { Col, Container, Row } from "react-bootstrap";
import { BsGear, BsHddNetwork } from "react-icons/bs";
import { Link } from "react-router";

import { EphemeraStore } from "~/store";

import { NavLink } from "./nav_link";
import ServerIdenticon from "./server_identicon";

export default function Nav() {
  const host = useSelector(EphemeraStore, s => s.host);

  return (
    <nav style={{ position: "sticky", top: 0, left: 0, width: "100%", zIndex: 1000, background: "#fff", boxShadow: "0 0 2px #00000080" }}>
      <Container>
        <Row className="align-items-center" style={{ height: "48px" }}>
          <Col style={{ display: "flex", blockSize: "100%" }}>
            <div style={{ display: "flex", alignItems: "stretch", gap: "12px", blockSize: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <Link to="/" style={{ textDecoration: "none" }}>
                  <ServerIdenticon
                    style={{
                      width: 24
                    }}
                    data={new TextEncoder().encode(host)}
                  />
                </Link>
              </div>

              <NavLink to="/servers" label="Servers" icon={<BsHddNetwork size={16} />} />
              <NavLink to="/settings" label="Settings" icon={<BsGear size={16} />} />
            </div>
          </Col>
        </Row>
      </Container>
    </nav>);
}