import { Toast, ToastContainer } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useReader, useSelector } from 'lib/store';
import { EphemeraStoreContext } from '~/store';

export default function Notifier() {
  const store = useReader(EphemeraStoreContext);
  const logEntries = useSelector(EphemeraStoreContext, (store) => store.logEntries);

  return (
    <ToastContainer
      position="bottom-end"
      className="p-3 position-fixed"
      style={{ zIndex: 9999 }}
    >
      {logEntries.map((toast) => (
        <Toast
          key={toast.id}
          onClose={() => store.removeLog(toast.id)}
          show={true}
          delay={3000}
          autohide
          bg={toast.type}
        >
          <Toast.Body className={['danger', 'success'].includes(toast.type) ? 'text-white' : ''}>
            {toast.message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};