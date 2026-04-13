import { useState, useRef, useEffect } from "react";
import { Form, Button, Card, Spinner, Dropdown } from "react-bootstrap";
import PostUtil from "@ephemera/shared/lib/post_util.js";
import { useReader, useSelector } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import { BsImage, BsPersonCircle } from "react-icons/bs";
import { useMutex } from "~/hooks/mutex";
import { useDisposableState } from "~/hooks/disposable_state";
import { DisposableURL } from "lib/disposable_url";
import { BsXLg } from "react-icons/bs";
import Crypto from "@ephemera/shared/lib/crypto";
import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import Hex from "@ephemera/shared/lib/hex";
import ArrayHelper from "@ephemera/shared/lib/array_helper";
import Base37 from "@ephemera/shared/lib/base37";
import Identicon from "./identicon";
import { BsCheckLg } from "react-icons/bs";

export interface ComposerProps {
}

const allowedFileTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
]);

const maxAttachmentCount = 4;

interface FilePreviewProps {
  file: File;
  style?: React.CSSProperties;
  className?: string;
  alt?: string;
}

function FilePreview(props: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useDisposableState<DisposableURL>();

  useEffect(() => {
    setPreviewUrl(new DisposableURL(props.file));
  }, [props.file]);

  if (!previewUrl) {
    return null;
  }

  if (props.file.type.startsWith("video/")) {
    return <video src={previewUrl.url} controls style={props.style} className={props.className} />;
  } else {
    return <img src={previewUrl.url} alt={props.alt} style={props.style} className={props.className} />;
  }
}

interface AttachmentEntry {
  file: File;
  digest: Uint8Array;
}

function containsAttachable(files: FileList): boolean {
  for (const file of files) {
    if (allowedFileTypes.has(file.type)) {
      return true;
    }
  }

  return false;
}

export default function Composer({ }: ComposerProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isLocked: isReading, tryLock: tryLockReading } = useMutex();
  const { isLocked: isSubmitting, tryLock: tryLockSubmitting } = useMutex();
  const keyPairs = [...NullableHelper.toIterable(useSelector(EphemeraStoreContext, state => state.keyPair))];

  const [selectedPublicKey, setSelectedPublicKey] = useState(keyPairs[0]?.publicKey ?? null);

  useEffect(() => {
    if (selectedPublicKey == null && keyPairs.length > 0) {
      setSelectedPublicKey(NullableHelper.unwrap(keyPairs[0]?.publicKey));
    }
  }, [keyPairs, selectedPublicKey]);

  const selectedPublicKeyBase37 = selectedPublicKey ? Base37.fromUint8Array(selectedPublicKey) : null;

  const minLength = PostUtil.kMinPostLength;
  const maxLength = PostUtil.kMaxPostLength;
  const count = PostUtil.weightedLength(value);
  const store = useReader(EphemeraStoreContext);

  const addAttachedFiles = async (files: File[]) => {
    const attachableFiles = files.filter(file => allowedFileTypes.has(file.type));
    let candidates: AttachmentEntry[];

    {
      using lock = tryLockReading();

      if (lock === null) {
        return false;
      }

      candidates = await Promise.all(attachableFiles.map(async (file) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const digest = await Crypto.digest(bytes);
        return { file, digest };
      }));
    }

    setAttachments((prev) => {
      const next = [...prev];

      for (const candidate of candidates) {
        const alreadyExists = next.some((a) =>
          ArrayHelper.equals(a.digest, candidate.digest)
        );

        if (!alreadyExists) {
          next.push(candidate);
        }

        if (next.length >= maxAttachmentCount) {
          break;
        }
      }

      return next;
    });
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addAttachedFiles(Array.from(e.target.files ?? []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);

    if (files.length > 0) {
      if (containsAttachable(e.clipboardData.files)) {
        addAttachedFiles(files);
        e.preventDefault();
      }
    }
  };

  //const handleDrop = (e:React.DragEvent) => {}

  const handleRemoveAttachment = () => {
    setAttachments([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    using submitLock = tryLockSubmitting();

    if (submitLock === null) {
      return;
    }

    using readLock = tryLockReading();

    if (readLock === null) {
      return;
    }

    try {
      await store.getClient().sendPost(value, attachments.map(a => a.file));
      store.addLog("success", "Post submitted successfully!");
      setValue("");
      handleRemoveAttachment();
    } catch (error) {
      store.addLog("danger", error instanceof Error ? error.message : "Failed to submit post.");
    }
  };

  const isUnder = count < minLength;
  const isOver = count > maxLength;

  return (
    <Card>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
            width: '100%'
          }}>
            <span style={{
              fontWeight: 'bold',
              color: '#666',
              flexShrink: 0,
              userSelect: 'none'
            }}>
              From
            </span>

            <Dropdown
              style={{ flexGrow: 1, minWidth: 0 }}
              onSelect={(id) => {
                const kp = keyPairs.find(k => Base37.fromUint8Array(k.publicKey) === id);
                if (kp) setSelectedPublicKey(kp.publicKey);
              }}
            >
              <Dropdown.Toggle
                variant="light"
                className="d-flex align-items-center w-100"
                style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  padding: '0.375rem 0.75rem',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  boxShadow: 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexGrow: 1,
                  minWidth: 0,
                  textAlign: 'left'
                }}>
                  {NullableHelper.map(selectedPublicKey, (pk) => (
                    <Identicon data={pk} style={{ width: 22, height: 22, borderRadius: '3px', flexShrink: 0 }} />
                  ))}

                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexGrow: 1
                  }}>
                    {selectedPublicKeyBase37 ? `@${selectedPublicKeyBase37}` : '(No identity)'}
                  </span>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu style={{
                width: '100%',
                maxHeight: '300px',
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '1px solid #dee2e6'
              }}>
                {keyPairs.length > 0 ? (
                  keyPairs.map((kp) => {
                    const id = Base37.fromUint8Array(kp.publicKey);
                    const isSelected = selectedPublicKeyBase37 === id;
                    return (
                      <Dropdown.Item
                        key={id}
                        eventKey={id}
                        className="d-flex align-items-center"
                        style={{
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem'
                        }}
                      >
                        <div style={{
                          width: '1.25rem',
                          display: 'flex',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSelected && (
                            <BsCheckLg
                              style={{
                                fontSize: '1rem',
                                color: 'inherit'
                              }}
                            />
                          )}
                        </div>

                        <Identicon data={kp.publicKey} style={{ width: 20, height: 20, borderRadius: '2px', flexShrink: 0 }} />

                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flexGrow: 1
                        }}>
                          @{id}
                        </span>
                      </Dropdown.Item>
                    );
                  })
                ) : (
                  <Dropdown.Item disabled>No identity available</Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>

          <Form.Group controlId="composerTextarea">
            <Form.Control
              as="textarea"
              rows={3}
              value={value}
              onChange={e => {
                setValue(PostUtil.sanitize(e.target.value))
              }}
              onPaste={handlePaste}
              placeholder="What are you doing?"
              aria-label="Post content"
              style={{ resize: 'none' }}
              disabled={isSubmitting}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </Form.Group>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "0.5rem",
            }}
          >
            {attachments.map((file, index) => (
              <div
                key={Hex.fromUint8Array(file.digest)}
                style={{
                  position: "relative",
                  inlineSize: "10rem",
                  blockSize: "7.5rem",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  border: "1px solid #eee",
                  background: "#fafafa",
                  flex: "0 0 auto",
                }}
              >
                <FilePreview
                  file={file.file}
                  alt={`attachment ${index + 1}`}
                  style={{
                    inlineSize: "100%",
                    blockSize: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />

                <Button
                  size="sm"
                  variant="light"
                  onClick={() => {
                    setAttachments(prev => {
                      const next = [...prev];
                      next.splice(index, 1);
                      return next;
                    });
                  }}
                  style={{
                    position: "absolute",
                    insetBlockStart: "0.375rem",
                    insetInlineEnd: "0.375rem",
                    inlineSize: "1.75rem",
                    blockSize: "1.75rem",
                    minInlineSize: "1.75rem",
                    padding: 0,
                    borderRadius: "9999px",
                    display: "grid",
                    placeItems: "center",
                    lineHeight: 1,
                  }}
                  aria-label="Remove attachment"
                  disabled={isSubmitting}
                >
                  <BsXLg size={12} aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'flex-end',
          }}>
            <div
              style={{ flexGrow: 1 }}>
              <input
                type="file"
                accept={Array.from(allowedFileTypes).join(",")}
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleAttachmentChange}
              />
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= maxAttachmentCount || isSubmitting || isReading}
                aria-label="Attach image"
              >
                <BsImage />
              </Button>
            </div>
            <div
              className={`text-end small ${isOver ? "text-danger fw-bold" : "text-muted"}`}
            >
              {count} / {maxLength}
            </div>
            <div className="text-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isUnder || isOver || isSubmitting || isReading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {isSubmitting && (
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                )}
                {isSubmitting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </Form>
      </Card.Body >
    </Card >
  );
}