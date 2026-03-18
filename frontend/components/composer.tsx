import { useState, useRef, useEffect } from "react";
import { Form, Button, Card } from "react-bootstrap";
import PostUtil from "@ephemera/shared/lib/post_util.js";
import { useReader } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import { BsImage } from "react-icons/bs";
import { useMutex } from "~/hooks/mutex";
import { useDisposableState } from "~/hooks/disposable_state";
import { DisposableURL } from "lib/disposable_url";

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

function FilePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useDisposableState<DisposableURL>();

  useEffect(() => {
    const url = new DisposableURL(file);
    setPreviewUrl(url);

    return () => {
      setPreviewUrl(null);
    };
  }, [file]);

  if (!previewUrl) {
    return null;
  }

  if (file.type.startsWith("video/")) {
    return <video src={previewUrl.url} controls style={{ maxWidth: 160, maxHeight: 120, borderRadius: 8, border: '1px solid #eee' }} />;
  } else {
    return <img src={previewUrl.url} alt="attachment preview" style={{ maxWidth: 160, maxHeight: 120, borderRadius: 8, border: '1px solid #eee' }} />;
  }
}

export default function Composer({ }: ComposerProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isLocked, tryLock } = useMutex();

  const minLength = PostUtil.kMinPostLength;
  const maxLength = PostUtil.kMaxPostLength;
  const count = PostUtil.weightedLength(value);
  const store = useReader(EphemeraStoreContext);

  const addAttachedFiles = (files: File[]) => {
    const filteredFiles = files.filter(file => allowedFileTypes.has(file.type));

    if (filteredFiles.length === 0) {
      return false;
    }

    const newAttachments = [...attachments, ...filteredFiles];
    newAttachments.splice(maxAttachmentCount);
    setAttachments(newAttachments);
    return true;
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addAttachedFiles(Array.from(e.target.files ?? []));
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    using lock = tryLock();

    if (lock === null) {
      return;
    }

    try {
      await store.getClient().sendPost(value, attachments);
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
            />
          </Form.Group>
          {/* TODO: Redesign */}
          {attachments.map((file, index) => (
            <div key={index} style={{ marginTop: 8, marginBottom: 8, position: 'relative', display: 'inline-block' }}>
              <FilePreview file={file} />
              <Button size="sm" variant="light" onClick={() => {
                const newAttachments = [...attachments];
                newAttachments.splice(index, 1);
                setAttachments(newAttachments);
              }} style={{ position: 'absolute', top: 0, right: 0, padding: '2px 6px', borderRadius: '0 8px 0 8px', fontWeight: 700 }} aria-label="Remove attachment">×</Button>
            </div>
          ))}
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
                disabled={attachments.length >= maxAttachmentCount}
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
              <Button type="submit" variant="primary" disabled={isUnder || isOver || isLocked}>
                Post
              </Button>
            </div>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}