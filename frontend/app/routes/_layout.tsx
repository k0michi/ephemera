import Notifier from "components/notifier";
import { Col, Container, Row } from "react-bootstrap";
import { Link, Outlet, useNavigate } from "react-router";

import { EphemeraStoreContext } from "~/store";
import { useReader, useSelector } from "lib/store";
import { useEffect } from "react";
import Nav from "components/nav";

export default function Layout() {
  const store = useReader(EphemeraStoreContext);

  useEffect(() => {
    store.initialize();
  }, [store]);

  return (
    <>
      <Nav />
      <main style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        <Container>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <Row className="justify-content-md-center">
              <Col md={8} lg={6}>
                <Outlet />
              </Col>
            </Row>

            <div
              style={{
                textAlign: "center",
                color: "#bbb",
                fontSize: "0.8rem",
              }}
            >
              <Link to="https://github.com/k0michi/ephemera" style={{ color: "inherit" }}>
                Ephemera
              </Link>{" "}
              {import.meta.env.EPHEMERA_COMMIT_HASH}
            </div>
          </div>
        </Container>
      </main>
      <Notifier />
    </>
  );
}