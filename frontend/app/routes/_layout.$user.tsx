import Timeline from "components/timeline";
import { useParams } from "react-router";
import { Container, Row, Col, Card } from "react-bootstrap";
import Identicon from "components/identicon";
import Base37 from "@ephemera/shared/lib/base37";
import Crypto from "@ephemera/shared/lib/crypto";

export default function User() {
  const params = useParams();
  const { user } = params;
  let userKey = user || "";
  const isValidKey = Base37.isValid(userKey) && Crypto.isValidPublicKey(Base37.toUint8Array(userKey));

  let identiconData: Uint8Array | null = null;
  try {
    identiconData = userKey ? Base37.toUint8Array(userKey) : null;
  } catch {
    identiconData = null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      {isValidKey ? <>
        <Card className="p-3 d-flex flex-row align-items-center gap-3">
          {identiconData && (
            <Identicon data={identiconData} style={{ width: 48, height: 48, borderRadius: 6 }} />
          )}
          <div
            className="fw-bold fs-5"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            @{userKey}
          </div>
        </Card>
        <Timeline author={userKey} />
      </> : <>
        <Card className="p-3">
          <div className="fw-bold fs-5">
            User does not exist
          </div>
        </Card>
      </>}
    </div>
  );
}