import styles from "./nav_link.module.css";
import { useLocation, Link } from "react-router";
import { useEffect, useState } from "react";
import { deriveColor } from "./server_identicon";
import Crypto from "@ephemera/shared/lib/crypto";
import { useSelector } from "lib/store";
import { EphemeraStore } from "~/store";

export interface NavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export function NavLink(props: NavLinkProps) {
  const host = useSelector(EphemeraStore, s => s.host);
  const location = useLocation();
  const active = location.pathname.startsWith(props.to);
  const [defaultActiveColor, setDefaultActiveColor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const digest = await Crypto.digest(new TextEncoder().encode(host));
      const derivedColor = deriveColor(digest);
      setDefaultActiveColor(derivedColor);
    })();
  }, [host]);

  return (
    <Link
      to={props.to}
      className={`${styles['nav-link']} ${active ? styles['active'] : ''}`}
      style={
        {
          "--nav-link-active-color": defaultActiveColor,
        } as React.CSSProperties
      }
    >
      {props.icon}
      <span>{props.label}</span>
      <span className={`${styles['nav-link-indicator']}`} />
    </Link>
  );
}