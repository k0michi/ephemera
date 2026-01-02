import Timeline from "components/timeline";
import { useParams } from "react-router";
import { Container, Row, Col, Card } from "react-bootstrap";
import Identicon from "components/identicon";
import Base37 from "@ephemera/shared/lib/base37";

export default function User() {
  const params = useParams();
  const { user } = params;
  let userKey = user;
  let identiconData: Uint8Array | null = null;
  try {
    identiconData = userKey ? Base37.toUint8Array(userKey) : null;
  } catch {
    identiconData = null;
  }

  return (
    <>
      <Card className="mb-3 p-3 d-flex flex-row align-items-center gap-3">
        {identiconData && (
          <Identicon data={identiconData} style={{ width: 48, height: 48, borderRadius: 8 }} />
        )}
        <div
          className="fw-bold fs-5"
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}
        >
          @{userKey}
        </div>
      </Card>
      <Timeline author={userKey} />
    </>
  );
}