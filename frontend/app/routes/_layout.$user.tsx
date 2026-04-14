import Timeline from "components/timeline";
import { useParams } from "react-router";
import { Container, Row, Col, Card } from "react-bootstrap";
import { RoundedIdenticon } from "components/identicon";
import Base37 from "@ephemera/shared/lib/base37";
import Crypto from "@ephemera/shared/lib/crypto";
import type { Route } from "./+types/_layout.$user";

export function loader() {
  return {
    host: process.env.EPHEMERA_HOST
  };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  return [
    { title: `@${params.user} | Ephemera@${loaderData.host}` },
  ];
}

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
            <RoundedIdenticon data={identiconData} size={48} />
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