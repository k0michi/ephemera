import type { CreatePostSignal } from "@ephemera/shared/api/api";
import styles from "./post.module.css";
import { Card, Dropdown, OverlayTrigger, Tooltip, Modal, Button, Spinner } from "react-bootstrap";
import { RoundedIdenticon } from "./identicon";
import Base37 from "@ephemera/shared/lib/base37";
import { useReader } from "lib/store";
import { Link } from "react-router";
import { BsThreeDots, BsTrash } from "react-icons/bs";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto";
import Hex from "@ephemera/shared/lib/hex";
import React from "react";
import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import { EphemeraStore } from "~/store";
import { useMutex } from "../app/hooks/mutex";

export interface PostProps {
  post: CreatePostSignal;
  onDelete?: (post: CreatePostSignal) => void;
}

export default function Post({ post, onDelete }: PostProps) {
  const [now, setNow] = React.useState(Date.now());
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const { isLocked, tryLock } = useMutex();

  React.useEffect(() => {
    const timeout = getRenderTimeout(post[0][1][2], now);

    const timer = setTimeout(() => {
      setNow(Date.now());
    }, timeout);

    return () => {
      clearTimeout(timer);
    };
  }, [post, now]);

  const store = useReader(EphemeraStore);
  const publicKeys = Object.keys(store.keyPairs);
  const postPublicKey = post[0][1][1];

  const handleDeletePost = async () => {
    using lock = tryLock();

    if (lock === null) {
      return;
    }

    try {
      const keyPair = NullableHelper.unwrap(store.keyPairs[post[0][1][1]]);
      const digest = await SignalCrypto.digest(post[0]);
      await store.getClient().deletePost(keyPair, Hex.fromUint8Array(digest));

      if (onDelete) {
        onDelete(post);
      }
    } catch (e) {
      store.addLog("danger", e instanceof Error ? e.message : "Failed to delete post.");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const blank = post[0][2] === "";

  return (
    <>
      <Card className={styles.post}>
        <Card.Body style={{ padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            {/* Icon */}
            <div style={{ flexShrink: 0 }}>
              <Link to={`/${postPublicKey}`}>
                <RoundedIdenticon data={Base37.toUint8Array(post[0][1][1])} style={{
                  display: 'block',
                  verticalAlign: 'middle',
                }} size={48} />
              </Link>
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Username & Date Row */}
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
                {!isLocal(post[0][1][0]) && (
                  <>
                    {'•'}
                    <span style={{ flexShrink: 0 }}>
                      <Link to={`https://${post[0][1][0]}`} style={{ color: 'inherit' }} className={styles.postHostLink}>
                        {post[0][1][0]}
                      </Link>
                    </span>
                  </>
                )}
                {'•'}
                <OverlayTrigger
                  placement="top"
                  delay={{ show: 500, hide: 0 }}
                  overlay={(props) => (
                    <Tooltip {...props} placement="top">
                      {new Date(post[0][1][2]).toLocaleString()}
                    </Tooltip>
                  )}
                >
                  <span style={{ flexShrink: 0 }}>
                    {formatDate(post[0][1][2], now)}
                  </span>
                </OverlayTrigger>
              </div>

              {/* Body */}
              <div style={{ marginBottom: 8 }}>
                <Card.Text
                  style={{
                    whiteSpace: 'pre-wrap',
                    ...(blank && { color: '#999', fontStyle: 'italic' })
                  }}
                >
                  {blank ? "(intentionally left blank)" : post[0][2]}
                </Card.Text>
              </div>

              {/* Attachments */}
              <div>
                {post[0][3]?.filter((footer) => footer[0] === 'attachment').map((footer) => {
                  const type = footer[1];
                  const attachmentHash = footer[2];
                  const url = store.getClient().getAttachmentUrl(attachmentHash, post[0][1][0]);

                  return type.startsWith('image/') ? (
                    <img key={attachmentHash} src={url} alt="post attachment" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #eee', marginTop: 4 }} />
                  ) : type.startsWith('video/') ? (
                    <video key={attachmentHash} src={url} controls style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #eee', marginTop: 4 }} />
                  ) : null;
                })}
              </div>

              {/* Menu */}
              <div>
                <Dropdown>
                  <Dropdown.Toggle variant="link" bsPrefix="btn p-0 border-0" id={`dropdown-${post[1]}`} aria-label="Post options">
                    <BsThreeDots className="text-secondary" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', }}>
                    {canDelete(post, publicKeys) ? (
                      <Dropdown.Item
                        onClick={() => setShowDeleteModal(true)}
                        className="text-danger d-flex align-items-center gap-2"
                      >
                        <BsTrash /> Delete post
                      </Dropdown.Item>
                    ) : null}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Modal
        show={showDeleteModal}
        onHide={() => !isLocked && setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton={!isLocked}>
          <Modal.Title>Delete Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this post?</p>
          <p className="text-danger fw-bold">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isLocked}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeletePost}
            disabled={isLocked}
          >
            {isLocked ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

function isLocal(host: string): boolean {
  return host === window.location.host;
}

function canDelete(post: CreatePostSignal, myPublicKeys: string[]): boolean {
  return myPublicKeys.includes(post[0][1][1]) && isLocal(post[0][1][0]);
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