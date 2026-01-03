import { useState } from "react";
import { Form, Button, Card } from "react-bootstrap";
import PostUtil from "@ephemera/shared/lib/post_util.js";

export interface ComposerProps {
  onSubmit?: (value: string, event: React.FormEvent<HTMLFormElement>) => void;
}

export default function Composer({ onSubmit }: ComposerProps) {
  const [value, setValue] = useState("");
  const minLength = PostUtil.kMinPostLength;
  const maxLength = PostUtil.kMaxPostLength;
  const count = PostUtil.weightedLength(value);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) onSubmit(value, e);
    setValue("");
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
              <Button type="submit" variant="primary" disabled={isUnder || isOver}>
                Post
              </Button>
            </div>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}