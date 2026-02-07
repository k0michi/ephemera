import { useState, useRef } from "react";
import { Form, Button, Card } from "react-bootstrap";
import PostUtil from "@ephemera/shared/lib/post_util.js";
import { useReader } from "lib/store";
import { EphemeraStoreContext } from "~/store";
import { BsImage } from "react-icons/bs";
import { useMutex } from "~/hooks/mutex";

export interface ComposerProps {
}

export default function Composer({ }: ComposerProps) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isLocked, tryLock } = useMutex();

  const minLength = PostUtil.kMinPostLength;
  const maxLength = PostUtil.kMaxPostLength;
  const count = PostUtil.weightedLength(value);
  const store = useReader(EphemeraStoreContext);

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAttachment(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    using lock = tryLock();

    try {
      if (attachment) {
        await store.getClient().sendPost(value, [attachment]);
      } else {
        await store.getClient().sendPost(value);
      }
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
              placeholder="What are you doing?"
              aria-label="Post content"
              style={{ resize: 'none' }}
            />
          </Form.Group>
          {/* TODO: Redesign */}
          {previewUrl && (
            <div style={{ marginTop: 8, marginBottom: 8, position: 'relative', display: 'inline-block' }}>
              <img src={previewUrl} alt="attachment preview" style={{ maxWidth: 160, maxHeight: 120, borderRadius: 8, border: '1px solid #eee' }} />
              <Button size="sm" variant="light" onClick={handleRemoveAttachment} style={{ position: 'absolute', top: 0, right: 0, padding: '2px 6px', borderRadius: '0 8px 0 8px', fontWeight: 700 }} aria-label="Remove attachment">×</Button>
            </div>
          )}
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
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleAttachmentChange}
              />
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!attachment}
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