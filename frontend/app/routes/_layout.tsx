import Notifier from "components/notifier";
import { Col, Container, Row } from "react-bootstrap";
import { Link, Outlet } from "react-router";

export default function Layout() {
  return (
    <>
      <nav style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 1000, background: "#fff", borderBottom: "1px solid #e8ecef" }}>
        <Container>
          <Row className="align-items-center" style={{ height: "56px" }}>
            <Col>
              <Link to="/" style={{ textDecoration: "none" }}>
                <span style={{ fontWeight: "bold", fontSize: "1.5rem", color: "#8939cb" }}>Ephemera</span>
              </Link>
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