import type { CreatePostSignal } from "@ephemera/shared/api/api";
import styles from "./post.module.css";
import { Card, Dropdown, OverlayTrigger, Tooltip } from "react-bootstrap";
import Identicon from "./identicon";
import Base37 from "@ephemera/shared/lib/base37";
import { EphemeraStoreContext } from "~/store";
import { useReader } from "lib/store";
import { Link } from "react-router";
import { BsThreeDots } from "react-icons/bs";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto";
import Hex from "@ephemera/shared/lib/hex";
import React from "react";

export interface PostProps {
  post: CreatePostSignal;
  onDelete?: (post: CreatePostSignal) => void;
}

export default function Post({ post, onDelete }: PostProps) {
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const timeout = getRenderTimeout(post[0][1][2], now);

    const timer = setTimeout(() => {
      setNow(Date.now());
    }, timeout);

    return () => {
      clearTimeout(timer);
    };
  }, [post, now]);

  const store = useReader(EphemeraStoreContext);
  const myPublicKeyBase37 = store.keyPair ? Base37.fromUint8Array(store.keyPair.publicKey) : null;

  const postPublicKey = post[0][1][1];
  const isMine = myPublicKeyBase37 === postPublicKey;

  const handleDeletePost = async (post: CreatePostSignal) => {
    try {
      const digest = await SignalCrypto.digest(post[0]);
      await store.getClient().deletePost(Hex.fromUint8Array(digest));

      if (onDelete) {
        onDelete(post);
      }
    } catch (e) {
      store.addLog("danger", e instanceof Error ? e.message : "Failed to delete post.");
    }
  };

  return (
    <Card className={styles.post}>
      <Card.Body style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Icon */}
          <div style={{ flexShrink: 0 }}>
            <Link to={`/${postPublicKey}`}>
              <Identicon data={Base37.toUint8Array(post[0][1][1])} style={{
                display: 'block',
                width: 48,
                height: 48,
                borderRadius: 6,
                verticalAlign: 'middle',
              }} />
            </Link>
          </div>
          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Username */}
            <div className="text-secondary fs-6" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Link
                to={`/${postPublicKey}`}
                className={styles.postUsernameLink}
                style={{
                  color: 'inherit',
                  minWidth: 0,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                @{post[0][1][1]}
              </Link>
              {'•'}
              <OverlayTrigger
                placement="top"
                delay={{ show: 500, hide: 0 }}
                overlay={(props) => {
                  return <Tooltip {...props} placement="top">
                    {new Date(post[0][1][2]).toLocaleString()}
                  </Tooltip>;
                }}
              >
                <span style={{ flexShrink: 0 }}>
                  {formatDate(post[0][1][2], now)}
                </span>
              </OverlayTrigger>
            </div>
            {/* Body */}
            <div style={{ marginBottom: 8 }}>
              <Card.Text style={{ whiteSpace: 'pre-wrap' }}>{post[0][2]}</Card.Text>
            </div>
            <div>
              {post[0][3]?.filter((footer) => footer[0] === 'attachment').map((footer) => {
                const type = footer[1];
                const attachmentHash = footer[2];

                return (
                  type.startsWith('image/') ? (
                    <img
                      key={attachmentHash}
                      src={`${store.getClient().getAttachmentUrl(attachmentHash)}`}
                      alt="post attachment"
                      style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #eee', marginTop: 4 }}
                    />
                  ) : type.startsWith('video/') ? (
                    <video
                      key={attachmentHash}
                      src={`${store.getClient().getAttachmentUrl(attachmentHash)}`}
                      controls
                      style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #eee', marginTop: 4 }}
                    />
                  ) : null
                );
              })}
            </div>
            {/* Footer */}
            <div>
              <Dropdown>
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
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

function formatDate(timestamp: number, now: number): string {
  const diff = now - timestamp;

  const diffSeconds = Math.floor(diff / 1000);

  if (diffSeconds < 0) {
    return '0s';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const date = new Date(timestamp);
  const nowDate = new Date();
  const isSameYear = date.getFullYear() === nowDate.getFullYear();

  if (isSameYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

/**
 * Get the timeout duration until the next render update is needed.
 */
function getRenderTimeout(timestamp: number, now: number): number {
  const diff = now - timestamp;

  const diffSeconds = Math.floor(diff / 1000);

  if (diffSeconds < 60) {
    return 1000 - (diff % 1000);
  }

  if (diffSeconds < 60 * 60) {
    return 60 * 1000 - (diff % (60 * 1000));
  }

  if (diffSeconds < 24 * 60 * 60) {
    return 60 * 60 * 1000 - (diff % (60 * 60 * 1000));
  }

  return 24 * 60 * 60 * 1000 - (diff % (24 * 60 * 60 * 1000));
}