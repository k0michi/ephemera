
import type { PostSignal } from "@ephemera/shared/api/api";
import { Card, ListGroup, Container, Row, Col } from "react-bootstrap";

export interface TimelineProps {
  posts: PostSignal[];
}

export default function Timeline({ posts }: TimelineProps) {
  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <ListGroup>
            {posts.map((post) => (
              <ListGroup.Item key={post[0][1][1]} className="mb-3 p-0 border-0">
                <Card>
                  <Card.Body>
                    <Card.Title>
                      <span className="text-primary">{post[0][1][1]}</span>
                    </Card.Title>
                    <Card.Text style={{ whiteSpace: 'pre-line' }}>{post[0][2]}</Card.Text>
                  </Card.Body>
                  <Card.Footer className="text-end text-muted" style={{ fontSize: '0.9em' }}>
                    {new Date(post[0][1][2]).toLocaleString()}
                  </Card.Footer>
                </Card>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
      </Row>
    </Container>
  );
}