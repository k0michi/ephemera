import { exportedKeyPairSchema } from '@ephemera/shared/api/api_schema';
import Base37 from '@ephemera/shared/lib/base37';
import type { KeyPair } from '@ephemera/shared/lib/crypto';
import { RoundedIdenticon } from 'components/identicon';
import { useReader, useSelector } from 'lib/store';
import { useState } from 'react';
import { Table, Button, Modal } from 'react-bootstrap';
import { BsTrash, BsDownload, BsPlusLg, BsUpload, BsVolumeUp } from 'react-icons/bs';
import FileHelper from '~/file_helper';
import type { Route } from './+types/_layout.settings';
import { EphemeraStore } from '~/store';
import ServerIdenticon from 'components/server_identicon';

export function loader() {
  return {
    host: process.env.EPHEMERA_HOST
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: `Settings | Ephemera@${loaderData.host}` },
  ];
}

export interface SettingsProps { }

export default function Settings({ }: SettingsProps) {
  const keyPairs = useSelector(EphemeraStore, (store) => store.keyPairs);
  const mutedIdentities = useSelector(EphemeraStore, s => s.mutedIdentities);
  const mutedServers = useSelector(EphemeraStore, s => s.mutedServers);
  const store = useReader(EphemeraStore);

  const [targetKeyPair, setTargetKeyPair] = useState<KeyPair | null>(null);

  const ids = Object.keys(keyPairs);

  const handleImportKeyPair = async () => {
    try {
      const file = await FileHelper.selectFile({ accept: 'application/json' });
      const text = await file.text();
      const parsed = exportedKeyPairSchema.parse(JSON.parse(text));

      await store.importKeyPair(parsed);
      store.addLog("success", "Key pair imported successfully!");
    } catch (error) {
      store.addLog("danger", error instanceof Error ? error.message : "Failed to import.");
    }
  };

  const handleExport = (id: string, kp: KeyPair) => {
    const data = {
      publicKey: id,
      privateKey: Base37.fromUint8Array(kp.privateKey)
    };

    FileHelper.downloadFile(
      JSON.stringify(data),
      `${id}.json`,
      'application/json'
    );
  };

  const handleUnmuteIdentity = (id: string) => {
    store.removeMutedIdentity(id);
  };

  const handleUnmuteServer = (server: string) => {
    store.removeMutedServer(server);
  };

  return (
    <>
      {/* Identities */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Identities</h5>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={async () => {
            try {
              await store.generateKeyPair();
            } catch (error) {
              store.addLog("danger", error instanceof Error ? error.message : "Failed to generate key pair.");
            }
          }}>
            <BsPlusLg className="me-1" /> Generate
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={handleImportKeyPair}>
            <BsUpload className="me-1" /> Import
          </Button>
        </div>
      </div>

      <Table hover responsive style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>
        <thead className="table-light">
          <tr>
            <th style={{ width: '50px' }}></th>
            <th>Identity</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ids.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center text-muted py-4">
                No key pairs available.
              </td>
            </tr>
          ) : (
            Object.entries(keyPairs).map(([id, kp]) => (
              <tr key={id}>
                <td>
                  <RoundedIdenticon data={kp.publicKey} size={32} />
                </td>
                <td className="font-monospace">
                  @{id}
                </td>
                <td>
                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      variant="light"
                      size="sm"
                      title="Export"
                      onClick={() => handleExport(id, kp)}
                    >
                      <BsDownload />
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      className="text-danger"
                      title="Revoke"
                      onClick={() => setTargetKeyPair(kp)}
                    >
                      <BsTrash />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Muted Identities */}
      <div className="mb-3">
        <h5 className="mb-0">Muted Identities</h5>
      </div>
      <Table hover responsive style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>
        <thead className="table-light">
          <tr>
            <th style={{ width: '50px' }}></th>
            <th>Identity</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {mutedIdentities.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center text-muted py-3">
                No muted identities.
              </td>
            </tr>
          ) : (
            mutedIdentities.map(id => (
              <tr key={id}>
                <td>
                  <RoundedIdenticon data={Base37.toUint8Array(id)} size={32} />
                </td>
                <td className="font-monospace">
                  @{id}
                </td>
                <td className="text-end">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleUnmuteIdentity(id)}
                    title="Unmute"
                  >
                    <BsVolumeUp className="me-1" /> Unmute
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Muted Servers */}
      <div className="mb-3">
        <h5 className="mb-0">Muted Servers</h5>
      </div>
      <Table hover responsive style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>
        <thead className="table-light">
          <tr>
            <th style={{ width: '50px' }}></th>
            <th>Server</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {mutedServers.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center text-muted py-3">
                No muted servers.
              </td>
            </tr>
          ) : (
            mutedServers.map(server => (
              <tr key={server}>
                <td className="text-center text-muted">
                  <ServerIdenticon data={new TextEncoder().encode(server)} style={{ width: 32, height: 32 }} />
                </td>
                <td className="font-monospace">
                  {server}
                </td>
                <td className="text-end">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleUnmuteServer(server)}
                    title="Unmute"
                  >
                    <BsVolumeUp className="me-1" /> Unmute
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal show={!!targetKeyPair} onHide={() => setTargetKeyPair(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Revoke Identity</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {targetKeyPair && (
            <>
              <div className="d-flex align-items-center gap-3 mb-3 p-2 border rounded bg-light" style={{ minWidth: 0 }}>
                <RoundedIdenticon data={targetKeyPair.publicKey} size={40} style={{ flexShrink: 0 }} />

                <span className="font-monospace fw-bold" style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flexGrow: 1
                }}>
                  @{Base37.fromUint8Array(targetKeyPair.publicKey)}
                </span>
              </div>

              <p>This will remove the key pair from this device permanently.</p>
              <p className="text-danger fw-bold">This action cannot be undone.</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setTargetKeyPair(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (targetKeyPair) {
                await store.revokeKeyPair(Base37.fromUint8Array(targetKeyPair.publicKey));
                setTargetKeyPair(null);
              }
            }}
          >
            Revoke
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}