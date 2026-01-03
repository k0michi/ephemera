import type { CreatePostSignal } from "@ephemera/shared/api/api";
import { Card, Dropdown } from "react-bootstrap";
import Identicon from "./identicon";
import Base37 from "@ephemera/shared/lib/base37";
import { EphemeraStoreContext } from "~/store";
import { useReader } from "lib/store";
import { Link } from "react-router";
import { BsThreeDots } from "react-icons/bs";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto";
import Hex from "@ephemera/shared/lib/hex";

export interface PostProps {
  post: CreatePostSignal;
  onDelete?: (post: CreatePostSignal) => void;
}

export default function Post({ post, onDelete }: PostProps) {
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
              <Link to={`/${postPublicKey}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
              </Link>
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
  );
}
