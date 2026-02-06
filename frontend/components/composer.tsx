import { useState } from "react";
import { Form, Button, Card } from "react-bootstrap";
import PostUtil from "@ephemera/shared/lib/post_util.js";
import { useMutex } from "~/hooks/lock";

export interface ComposerProps {
  onSubmit?: (value: string, event: React.FormEvent<HTMLFormElement>) => boolean | Promise<boolean>;
}

export default function Composer({ onSubmit }: ComposerProps) {
  const [value, setValue] = useState("");
  const { isLocked, tryLock } = useMutex();
  const minLength = PostUtil.kMinPostLength;
  const maxLength = PostUtil.kMaxPostLength;
  const count = PostUtil.weightedLength(value);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    using lock = tryLock();

    if (!lock) {
      return;
    }

    const result = await onSubmit?.(value, e) ?? false;

    if (result) {
      setValue("");
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
          <div style={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'flex-end',
          }}>
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