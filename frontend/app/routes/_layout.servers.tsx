import type { ServerManifest } from "@ephemera/shared/api/api";
import ServerIdenticon from "components/server_identicon";
import { Link } from "react-router";
import { Card, ListGroup } from "react-bootstrap";
import { useReader } from "lib/store";
import { useEffect, useState } from "react";
import { EphemeraStore } from "~/store";

interface ServerListItemProps {
  server: ServerManifest;
}

function ServerListItem({ server }: ServerListItemProps) {
  return (
    <ListGroup.Item>
      <div className="d-flex align-items-start gap-2">
        <div style={{ flexShrink: 0 }}>
          <ServerIdenticon
            data={new TextEncoder().encode(server.host)}
            style={{ width: 32, height: 32 }}
          />
        </div>

        <div style={{ minWidth: 0, flexGrow: 1 }}>
          <div>
            <Link
              to={`https://${server.host}`}
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                textDecoration: "none",
                wordBreak: "break-all",
              }}
            >
              {server.host}
            </Link>
          </div>

          <div
            className="text-muted"
            style={{ fontSize: "0.95rem", minHeight: "1.2em" }}
          >
            {/* description */}
          </div>

          <div className="text-muted" style={{ fontSize: "0.9rem" }}>
            {server.implementation.name} {server.implementation.version}
          </div>
        </div>
      </div>
    </ListGroup.Item>
  );
}

interface ServerCardProps {
  title: string;
  servers: ServerManifest[] | null;
  emptyMessage?: string | null;
}

function ServerCard({ title, servers, emptyMessage }: ServerCardProps) {
  return (
    <Card className="mb-3">
      <Card.Header>{title}</Card.Header>
      {servers == null ? null : servers.length === 0 ? (
        <Card.Body className="text-muted">{emptyMessage}</Card.Body>
      ) : (
        <ListGroup variant="flush">
          {servers.map((server) => (
            <ServerListItem key={server.publicKey || server.host} server={server} />
          ))}
        </ListGroup>
      )}
    </Card>
  );
}

export default function Servers() {
  const store = useReader(EphemeraStore);
  const [servers, setServers] = useState<ServerManifest[] | null>(null);
  const [localServer, setLocalServer] = useState<ServerManifest | null>(null);

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

  return (
    <>
      <ServerCard
        title="Local Server"
        servers={[localServer].filter(s => s !== null)}
      />
      <ServerCard
        title="Remote Servers"
        servers={servers}
        emptyMessage="No remote servers"
      />
    </>
  );
}