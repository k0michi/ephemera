import { HddNetwork } from "react-bootstrap-icons";
import styles from "./link.module.css";
import { useLocation, Link } from "react-router";
import { useEffect, useState } from "react";
import { deriveColor } from "./server_identicon";
import Crypto from "@ephemera/shared/lib/crypto";

export interface LinkProps {
}

export function ServersLink({ }: LinkProps) {
  const location = useLocation();
  const active = location.pathname.startsWith("/servers");
  const [defaultActiveColor, setDefaultActiveColor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const digest = await Crypto.digest(new TextEncoder().encode(window.location.host));
      const derivedColor = deriveColor(digest);
      setDefaultActiveColor(derivedColor);
    })();
  }, []);

  return (
    <Link
      to="/servers"
      className={`${styles['servers-link']} ${active ? styles['active'] : ''}`}
      style={
        {
          "--servers-link-active-color": defaultActiveColor,
        } as React.CSSProperties
      }
    >
      <HddNetwork size={16} />
      <span>Servers</span>
      <span className={`${styles['servers-link-indicator']}`} />
    </Link>
  );
}