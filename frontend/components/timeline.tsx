
import type { GetPostsRequest, CreatePostSignal } from "@ephemera/shared/api/api";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto";
import { useReader } from "lib/store";
import React from "react";
import { Card, ListGroup, Container, Row, Col, Dropdown } from "react-bootstrap";
import { EphemeraStoreContext } from "~/store";
import { BsThreeDots } from "react-icons/bs";
import Hex from "@ephemera/shared/lib/hex";
import Base37 from "@ephemera/shared/lib/base37";
import Identicon from "./identicon";

export interface TimelineProps {
}

export default function Timeline({ }: TimelineProps) {
  const [posts, setPosts] = React.useState<CreatePostSignal[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const store = useReader(EphemeraStoreContext);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const myPublicKeyBase37 = store.keyPair ? Base37.fromUint8Array(store.keyPair.publicKey) : null;

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
      store.addLog("danger", e instanceof Error ? e.message : "Failed to fetch posts.");
      // Stop loading more
      setHasMore(false);
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

  const handleDeletePost = async (post: CreatePostSignal) => {
    try {
      const digest = await SignalCrypto.digest(post[0]);
      await store.getClient().deletePost(Hex.fromUint8Array(digest));
      setPosts((prevPosts) => prevPosts.filter((p) => p !== post));
    } catch (e) {
      store.addLog("danger", e instanceof Error ? e.message : "Failed to delete post.");
    }
  };

  return (
    <Container className="mt-4">
      <Row className="justify-content-center">
        <ListGroup>
          {posts.map((post) => {
            const postPublicKey = post[0][1][1];
            const isMine = myPublicKeyBase37 === postPublicKey;
            return (
              <ListGroup.Item key={post[1]} className="mb-3 p-0 border-0">
                <Card>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <Card.Title className="mb-0">
                        <span className="d-inline-flex align-items-center gap-2">
                          <Identicon data={Base37.toUint8Array(post[0][1][1])} style={{
                            display: 'inline-block',
                            width: 32,
                            height: 32,
                            borderRadius: 4,
                            verticalAlign: 'middle',
                          }} />
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
                        </span>
                      </Card.Title>
                      <Dropdown align="end">
                        <Dropdown.Toggle variant="link" bsPrefix="btn p-0 border-0" id={`dropdown-${post[1]}`} aria-label="Post options">
                          <BsThreeDots className="text-secondary" />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          {isMine && (
                            <Dropdown.Item onClick={() => handleDeletePost(post)}>
                              Delete post
                            </Dropdown.Item>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                    <Card.Text style={{ whiteSpace: 'pre-wrap' }}>{post[0][2]}</Card.Text>
                  </Card.Body>
                  <Card.Footer className="text-end text-muted" style={{ fontSize: '0.9em' }}>
                    {new Date(post[0][1][2]).toLocaleString()}
                  </Card.Footer>
                </Card>
              </ListGroup.Item>
            );
          })}
          {
            <div ref={bottomRef} style={{ height: 1, display: hasMore ? 'block' : 'none' }}>
              {hasMore ? (
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