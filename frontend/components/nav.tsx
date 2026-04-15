import { useReader, useSelector } from "lib/store";
import { Container, Dropdown, Row, Col } from "react-bootstrap";
import { Link, useNavigate } from "react-router";
import ServerIdenticon from "./server_identicon";
import { NavLink } from "./nav_link";
import { BsGear, BsHddNetwork, BsHouse } from "react-icons/bs";
import { EphemeraStore } from "~/store";

export default function Nav() {
  const store = useReader(EphemeraStore);

  return (
    <nav style={{ position: "sticky", top: 0, left: 0, width: "100%", zIndex: 1000, background: "#fff", borderBottom: "1px solid #e8ecef" }}>
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
              </div>

              <NavLink to="/" label="Home" icon={<BsHouse size={16} />} end />
              <NavLink to="/servers" label="Servers" icon={<BsHddNetwork size={16} />} />
              <NavLink to="/settings" label="Settings" icon={<BsGear size={16} />} />
            </div>
          </Col>
        </Row>
      </Container>
    </nav>);
}