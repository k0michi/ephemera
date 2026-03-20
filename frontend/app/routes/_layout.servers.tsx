import type { ServerManifest } from "@ephemera/shared/api/api";
import ServerIdenticon from "components/server_identicon";
import { Link, useLoaderData } from "react-router";
import { Card, ListGroup } from "react-bootstrap";
import type { Route } from "./+types/_layout.servers";
import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import { getRemoteServersResponseSchema, getServerResponseSchema } from "@ephemera/shared/api/api_schema";

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

export async function loader({ request }: Route.LoaderArgs) {
  const backendHost = NullableHelper.unwrap(process.env.EPHEMERA_BACKEND_HOST);

  const localManifest = getServerResponseSchema.parse(
    await (await fetch(`http://${backendHost}/api/v1/server`)).json()
  );
  const remoteManifests = getRemoteServersResponseSchema.parse(
    await (await fetch(`http://${backendHost}/api/v1/remote-servers`)).json()
  ).servers;

  return {
    localManifest,
    remoteManifests,
  };
}

export default function Servers() {
  const data = useLoaderData<typeof loader>();

  return (
    <>
      <ServerCard
        title="Local Server"
        servers={[data.localManifest].filter(s => s !== null)}
      />
      <ServerCard
        title="Remote Servers"
        servers={data.remoteManifests}
        emptyMessage="No remote servers"
      />
    </>
  );
}