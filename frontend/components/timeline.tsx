
import type { GetPostsRequest, PostSignal } from "@ephemera/shared/api/api";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto";
import { useReader } from "lib/store";
import React from "react";
import { Card, ListGroup, Container, Row, Col } from "react-bootstrap";
import { EphemeraStoreContext } from "~/store";

export interface TimelineProps {
}

export default function Timeline({ }: TimelineProps) {
  const [posts, setPosts] = React.useState<PostSignal[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const store = useReader(EphemeraStoreContext);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  const fetchPosts = React.useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);
    const response = await store.getClient().fetchPosts({ cursor });
    setPosts((prevPosts) => [...prevPosts, ...response.posts]);
    setCursor(response.nextCursor);
    setHasMore(!!response.nextCursor);
    setLoading(false);
  }, [loading, hasMore, store, cursor]);

  React.useEffect(() => {
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts();
        }
      },
      { threshold: 0.1 }
    );

    if (bottomRef.current) {
      observer.observe(bottomRef.current);
    }

    return () => {
      if (bottomRef.current) {
        observer.unobserve(bottomRef.current);
      }
    };
  }, [fetchPosts, hasMore]);

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <ListGroup>
          {posts.map((post) => (
            // Assumes signatures are unique.
            <ListGroup.Item key={post[1]} className="mb-3 p-0 border-0">
              <Card>
                <Card.Body>
                  <Card.Title>
                    <span
                      className="text-secondary fs-6"
                      style={{
                        fontFamily: 'monospace',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'bottom'
                      }}
                    >
                      @{post[0][1][1]}
                    </span>
                  </Card.Title>
                  <Card.Text style={{ whiteSpace: 'pre-line' }}>{post[0][2]}</Card.Text>
                </Card.Body>
                <Card.Footer className="text-end text-muted" style={{ fontSize: '0.9em' }}>
                  {new Date(post[0][1][2]).toLocaleString()}
                </Card.Footer>
              </Card>
            </ListGroup.Item>
          ))}
          {
            hasMore ? <div ref={bottomRef} style={{ height: 1 }}>
              {loading ?
                <span>Loading...</span>
                : null
              }
            </div> : null
          }
        </ListGroup>
      </Row>
    </Container>
  );
}