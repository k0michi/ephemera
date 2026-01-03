
import type { GetPostsRequest, CreatePostSignal } from "@ephemera/shared/api/api";
import { useReader } from "lib/store";
import React from "react";
import { Card, ListGroup, Container, Row, Col, Dropdown } from "react-bootstrap";
import { EphemeraStoreContext } from "~/store";
import Post from "./post";

export interface TimelineProps {
  author?: string | undefined;
}

export default function Timeline({ author }: TimelineProps) {
  const [posts, setPosts] = React.useState<CreatePostSignal[]>([]);
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

    try {
      const response = await store.getClient().fetchPosts({ cursor, author });
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
  }, [loading, hasMore, store, cursor, author]);

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
    <ListGroup>
      {posts.map((post) => {
        return (
          <ListGroup.Item key={post[1]} className="mb-3 p-0 border-0">
            <Post post={post} onDelete={(deletedPost) => {
              setPosts((prevPosts) => prevPosts.filter((p) => p !== deletedPost));
            }} />
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
  );
}