import { RoundedIdenticon } from 'components/identicon';
import { useSelector } from 'lib/store';
import usePermissions from '~/hooks/permissions';
import { Col, Row } from 'react-bootstrap';
import Composer from 'components/composer';
import { EphemeraStore } from '~/store';
import Timeline from 'components/timeline';
import Base37 from '@ephemera/shared/lib/base37';
import styles from './_layout._index.module.css';

export default function Home() {
  const permissions = usePermissions();

  const keyPairs = useSelector(EphemeraStore, s => s.keyPairs);
  const identityId = Object.keys(keyPairs)[0] ?? null;
  const identity = identityId ? keyPairs[identityId] : null;

  // TODO: actual post count
  const postCount = 0;

  return (
    <Row className={`g-3 ${styles.layout}`}>
      <Col md={4} lg={3}>
        <div className={styles.profileCard}>
          <div className={styles.profileHeader} />

          <div className={styles.profileAvatarWrap}>
            {identity ? (
              <>
                <div className={styles.avatarOverlap}>
                  <RoundedIdenticon data={identity.publicKey} size={64} />
                </div>
                <div className={styles.identityText}>
                  {/* TODO: actual username */}
                  <div className={styles.username}>Anonymous</div>
                  <span className={styles.publicKey}>
                    @{Base37.fromUint8Array(identity.publicKey)}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.profileBody}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>FLEETS</div>
              <div className={styles.statValue}>{postCount}</div>
            </div>
          </div>
        </div>
      </Col>

      <Col md={8} lg={9}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {permissions.has('write') && <Composer />}
          <Timeline />
        </div>
      </Col>
    </Row>
  );
}