
import type { GetPostsRequest, CreatePostSignal } from "@ephemera/shared/api/api";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto";
import { useReader } from "lib/store";
import React from "react";
import { Card, ListGroup, Container, Row, Col } from "react-bootstrap";
import { EphemeraStoreContext } from "~/store";

export interface TimelineProps {
}

export default function Timeline({ }: TimelineProps) {
  const [posts, setPosts] = React.useState<CreatePostSignal[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const store = useReader(EphemeraStoreContext);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPosts = React.useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);

    try {
      const response = await store.getClient().fetchPosts({ cursor });
      setPosts((prevPosts) => [...prevPosts, ...response.posts]);
      setCursor(response.nextCursor);
      setHasMore(!!response.nextCursor);
    } catch (e) {
      setError("Failed to fetch posts.");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, store, cursor]);

  React.useEffect(() => {
    const target = bottomRef.current;

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries?.[0]?.isIntersecting) {
          fetchPosts();
        }
      },
      { threshold: 0.1 }
    );

    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
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
            <div ref={bottomRef} style={{ height: 1, display: hasMore ? 'block' : 'none' }}>
              {error ? (
                <div className="d-flex align-items-center justify-content-center gap-2 alert alert-danger p-2 my-2" role="alert" style={{ minHeight: 40 }}>
                  {error}
                </div>
              ) : hasMore ? (
                loading ? (
                  <div className="d-flex align-items-center justify-content-center gap-2 alert alert-light p-2 my-2" role="status" style={{ minHeight: 40 }}>
                    <span className="spinner-border spinner-border-sm text-secondary" aria-hidden="true"></span>
                    Loading...
                  </div>
                ) : null
              ) : null}
            </div>
          }
        </ListGroup>
      </Row>
    </Container>
  );
}