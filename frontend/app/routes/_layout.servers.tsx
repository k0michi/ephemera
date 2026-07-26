import type { PeerManifest } from "@ephemera/shared/api/api";
import ServerIdenticon from "components/server_identicon";
import { useReader } from "lib/store";
import { useEffect, useState } from "react";
import { Badge, ListGroup, Spinner } from "react-bootstrap";
import { Link } from "react-router";

import { EphemeraStore } from "~/store";

import { DetailPanel } from "./_layout.settings";
import type { Route } from "./+types/_layout.servers";

export function loader() {
  return {
    host: process.env.EPHEMERA_HOST
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `Servers | Ephemera@${loaderData.host}` },
  ];
}

interface ServerListItemProps {
  server: PeerManifest;
  isLocal?: boolean;
}

function ServerListItem({ server, isLocal }: ServerListItemProps) {
  return (
    <ListGroup.Item className="py-3">
      <div className="d-flex align-items-start gap-3">
        <div style={{ flexShrink: 0 }}>
          <ServerIdenticon
            data={new TextEncoder().encode(server.host)}
            style={{ width: 36, height: 36 }}
          />
        </div>

        <div style={{ minWidth: 0, flexGrow: 1 }}>
          <div className="d-flex align-items-center gap-2">
            <Link
              to={`https://${server.host}`}
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                textDecoration: "none",
                wordBreak: "break-all",
              }}
            >
              {server.host}
            </Link>
            {isLocal && (
              <Badge style={{ fontSize: "0.75rem" }}>
                Local
              </Badge>
            )}
          </div>

          <div className="text-muted small mt-1">
            {server.implementation.name} {server.implementation.version}
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
}

export default function Servers() {
  const store = useReader(EphemeraStore);
  const [servers, setServers] = useState<PeerManifest[] | null>(null);
  const [localServer, setLocalServer] = useState<PeerManifest | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await store.getClient().getRemoteServers();
        setServers(fetched);
      } catch (e) {
        store.addLog(
          "danger",
          e instanceof Error ? e.message : "Failed to fetch remote servers"
        );
      }
    })();
  }, [store]);

  useEffect(() => {
    (async () => {
      try {
        const local = await store.getClient().getLocalServer();
        setLocalServer(local);
      } catch (e) {
        store.addLog(
          "danger",
          e instanceof Error ? e.message : "Failed to fetch local server"
        );
      }
    })();
  }, [store]);

  const combinedServers = [
    ...(localServer ? [{ manifest: localServer, isLocal: true }] : []),
    ...(servers ? servers.map(server => ({ manifest: server, isLocal: false })) : []),
  ];

  const isLoading = localServer === null && servers === null;

  return (
    <DetailPanel
      title="Servers"
    >
      {isLoading ? (
        <div className="text-center py-4 text-muted">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading servers...
        </div>
      ) : combinedServers.length === 0 ? (
        <div className="text-center py-4 text-muted">
          No servers available.
        </div>
      ) : (
        <ListGroup variant="flush" className="border rounded">
          {combinedServers.map(({ manifest, isLocal }) => (
            <ServerListItem
              key={manifest.publicKey || manifest.host}
              server={manifest}
              isLocal={isLocal}
            />
          ))}
        </ListGroup>
      )}
    </DetailPanel>
  );
}