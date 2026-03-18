import { useState, useRef, useEffect } from "react";
import { Form, Button, Card, Spinner } from "react-bootstrap";
import PostUtil from "@ephemera/shared/lib/post_util.js";
import { useReader } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import { BsImage } from "react-icons/bs";
import { useMutex } from "~/hooks/mutex";
import { useDisposableState } from "~/hooks/disposable_state";
import { DisposableURL } from "lib/disposable_url";
import { XLg } from "react-bootstrap-icons";
import Crypto from "@ephemera/shared/lib/crypto";
import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import Hex from "@ephemera/shared/lib/hex";
import ArrayHelper from "@ephemera/shared/lib/array_helper";

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

export default function Composer({ }: ComposerProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isLocked, tryLock } = useMutex();

  const minLength = PostUtil.kMinPostLength;
  const maxLength = PostUtil.kMaxPostLength;
  const count = PostUtil.weightedLength(value);
  const store = useReader(EphemeraStoreContext);

  const addAttachedFiles = (files: File[]) => {
    const acceptedFiles = files.filter(file => allowedFileTypes.has(file.type));

    if (acceptedFiles.length === 0) {
      return false;
    }

    (async () => {
      const candidates = await Promise.all(
        acceptedFiles.map(async (file) => {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const digest = await Crypto.digest(bytes);
          return { file, digest };
        })
      );

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
    })();

    return true;
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addAttachedFiles(Array.from(e.target.files ?? []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files);

    if (files.length > 0) {
      if (addAttachedFiles(Array.from(e.clipboardData.files))) {
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

    using lock = tryLock();

    if (lock === null) {
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
              disabled={isLocked}
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
                  disabled={isLocked}
                >
                  <XLg size={12} aria-hidden="true" />
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
                disabled={attachments.length >= maxAttachmentCount || isLocked}
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
                disabled={isUnder || isOver || isLocked}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {isLocked && (
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                )}
                {isLocked ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}