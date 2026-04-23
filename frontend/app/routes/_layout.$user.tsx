import { useState } from "react";
import Timeline from "components/timeline";
import { useParams } from "react-router";
import { Container, Row, Col, Card, Dropdown } from "react-bootstrap";
import { RoundedIdenticon } from "components/identicon";
import Base37 from "@ephemera/shared/lib/base37";
import Crypto from "@ephemera/shared/lib/crypto";
import type { Route } from "./+types/_layout.$user";

import { BsThreeDots, BsVolumeMute, BsVolumeUp } from "react-icons/bs";
import { useReader, useSelector } from "lib/store";
import { EphemeraStore } from "~/store";

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
  const store = useReader(EphemeraStore);
  const muted = useSelector(EphemeraStore, s => s.mutedIdentities).includes(userKey);

  const muteUser = async () => {
    await store.addMutedIdentity(userKey);
  };

  const unmuteUser = async () => {
    await store.removeMutedIdentity(userKey);
  };

  let identiconData: Uint8Array | null = null;
  try {
    identiconData = userKey ? Base37.toUint8Array(userKey) : null;
  } catch {
    identiconData = null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {isValidKey ? <>
        <Card className="p-3 d-flex flex-row align-items-center gap-3">
          {identiconData && (
            <RoundedIdenticon data={identiconData} size={48} />
          )}
          <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
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
            {muted && (
              <div className="text-danger fs-6 fw-normal">
                (Muted)
              </div>
            )}
          </div>

          <Dropdown align="end">
            <Dropdown.Toggle
              variant="link"
              id="dropdown-user-options"
              className="text-dark p-0 border-0 shadow-none"
              style={{ fontSize: '1.2rem', lineHeight: 1 }}
            >
              <BsThreeDots />
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {muted ? (
                <Dropdown.Item onClick={unmuteUser}>
                  <BsVolumeUp className="me-2" /> Unmute
                </Dropdown.Item>
              ) : (
                <Dropdown.Item onClick={muteUser} className="text-danger">
                  <BsVolumeMute className="me-2" /> Mute
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
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