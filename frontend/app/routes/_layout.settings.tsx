import { exportedKeyPairSchema } from "@ephemera/shared/api/api_schema";
import Base37 from "@ephemera/shared/lib/base37";
import { useReader, useSelector } from "lib/store";
import { useMemo, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import FileHelper from "~/file_helper";
import { EphemeraStore } from "~/store";

export interface SettingsProps { }

export default function Settings({ }: SettingsProps) {
  const publicKey = useSelector(EphemeraStore, (store) => store.keyPair?.publicKey);
  const store = useReader(EphemeraStore);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const publicKeyMem = useMemo(() => Base37.fromUint8Array(publicKey || new Uint8Array()), [publicKey]);

  const handleExportKeyPair = () => {
    const exported = store.exportKeyPair();

    if (!exported) return;

    FileHelper.downloadFile(
      JSON.stringify(exported),
      `${publicKeyMem}.json`,
      'application/json'
    );
  };

  const handleImportKeyPair = async () => {
    try {
      const file = await FileHelper.selectFile({ accept: 'application/json' });
      const text = await file.text();
      let parsed;

      try {
        parsed = exportedKeyPairSchema.parse(JSON.parse(text));
      } catch {
        throw new Error("Invalid key pair format");
      }

      store.importKeyPair(parsed);
      store.addLog("success", "Key pair imported successfully!");
    } catch (error) {
      store.addLog("danger", error instanceof Error ? error.message : "Failed to import key pair.");
    }
  };

  return (
    <>
      <div>Your public key: {publicKeyMem}</div>
      <Button variant="secondary" className="mt-2" onClick={() => setShowRevokeModal(true)}>
        Revoke Key Pair
      </Button><br />
      <Button variant="secondary" className="mt-2" onClick={handleExportKeyPair}>
        Export Key Pair
      </Button><br />
      <Button variant="secondary" className="mt-2" onClick={handleImportKeyPair}>
        Import Key Pair
      </Button>

      <Modal show={showRevokeModal} onHide={() => setShowRevokeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Key Pair Revocation</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div>
            Revoking will remove this key pair from this device.
          </div>
          <div className="fw-bold text-danger mt-2">
            This action cannot be undone.
          </div>
          <div className="mt-2">
            Make sure you have exported it first if you want to use it again later.
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRevokeModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => {
            store.revokeKeyPair();
            setShowRevokeModal(false);
          }}>
            Revoke
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}