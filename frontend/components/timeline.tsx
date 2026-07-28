
import type { CreatePostSignal } from "@ephemera/shared/api/api";
import { PostStream } from "@ephemera/shared/lib/client";
import Hex from "@ephemera/shared/lib/hex";
import { KeyedCache } from "@ephemera/shared/lib/keyed_cache";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto";
import { useReader, useSelector } from "lib/store";
import React from "react";
import { Card } from "react-bootstrap";

import { useDisposableState } from "~/hooks/disposable_state";
import { EphemeraStore } from "~/store";

import Post from "./post";
import postStyles from "./post.module.css";

export interface TimelineProps {
  author?: string | undefined;
}

export default function Timeline({ author }: TimelineProps) {
  const [posts, setPosts] = React.useState<CreatePostSignal[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const store = useReader(EphemeraStore);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const mutedIdentities = useSelector(EphemeraStore, s => s.mutedIdentities);
  const mutedIdentitySet = new Set(mutedIdentities);
  const mutedServers = useSelector(EphemeraStore, s => s.mutedServers);
  const mutedServerSet = new Set(mutedServers);
  const filteredPosts = posts.filter(post => {
    const postHost = post[0][1][0];
    const postAuthor = post[0][1][1];
    return !(mutedIdentitySet.has(postAuthor) || mutedServerSet.has(postHost));
  });

  const postIdCache = React.useRef(new KeyedCache<string, string>({ maxSize: 512 })).current;

  const cachePostId = React.useCallback(async (post: CreatePostSignal) => {
    const digest = await SignalCrypto.digest(post[0]);
    postIdCache.set(post[1], Hex.fromUint8Array(digest));
  }, [postIdCache]);

  const fetchPosts = React.useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);

    try {
      const response = await store.getClient().fetchPosts({ cursor, author });
      response.posts.forEach(cachePostId);
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
  }, [loading, hasMore, store, cursor, author, cachePostId]);

  const [, setStream] = useDisposableState<PostStream>();

  React.useEffect(() => {
    setStream(store.getClient().openPostStream(async (event) => {
      if (event.type === 'post_created') {
        await cachePostId(event.post);
        setPosts((prevPosts) => prevPosts.some((p) => p[1] === event.post[1]) ? prevPosts : [event.post, ...prevPosts]);
      } else {
        const deletedId = event.post[0][2][0];
        setPosts((prevPosts) => prevPosts.filter((p) => postIdCache.get(p[1]) !== deletedId));
      }
    }, author !== undefined ? { author } : {}));
  }, [store, author, cachePostId, postIdCache, setStream]);

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
      {filteredPosts.map((post) => {
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