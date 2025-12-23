import { useState } from "react";
import { Form, Button, Card } from "react-bootstrap";
import { PostUtil } from "../app/post_util";

export interface ComposerProps {
  onSubmit?: (value: string, event: React.FormEvent<HTMLFormElement>) => void;
}

export default function Composer({ onSubmit }: ComposerProps) {
  const [value, setValue] = useState("");
  const maxLength = PostUtil._kMaxPostLength;
  const count = PostUtil.weightedLength(value);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onSubmit) onSubmit(value, e);
    setValue("");
  };

  const isOver = count > maxLength;

  return (
    <Card>
      <Card.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="composerTextarea">
            <Form.Label>Post</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="What's happening?"
            />
            <div
              className={`text-end small mt-1 ${isOver ? "text-danger fw-bold" : "text-muted"}`}
            >
              {count} / {maxLength}
            </div>
          </Form.Group>
          <div className="mt-2 text-end">
            <Button type="submit" variant="primary" disabled={isOver}>
              Post
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}