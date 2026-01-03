
import type { GetPostsRequest, CreatePostSignal } from "@ephemera/shared/api/api";
import { useReader } from "lib/store";
import React from "react";
import { EphemeraStoreContext } from "~/store";
import Post from "./post";
import postStyles from "./post.module.css";
import { Card } from "react-bootstrap";

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
    <div>
      {posts.map((post) => {
        return (
          <Post post={post} key={post[1]} onDelete={(deletedPost) => {
            setPosts((prevPosts) => prevPosts.filter((p) => p !== deletedPost));
          }} />
        );
      })}
      {hasMore ? (
        <Card ref={bottomRef} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 64,
        }} className={postStyles.post}>
          {loading ? (
            <div>
              <span className="spinner-border spinner-border-sm text-secondary" aria-hidden="true"></span>
              {' '}Loading...
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}