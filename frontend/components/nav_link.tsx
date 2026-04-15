import styles from "./nav_link.module.css";
import { NavLink as RouterNavLink } from "react-router";
import { useEffect, useState } from "react";
import { deriveColor } from "./server_identicon";
import Crypto from "@ephemera/shared/lib/crypto";

export interface NavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

export function NavLink(props: NavLinkProps) {
  const [defaultActiveColor, setDefaultActiveColor] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const digest = await Crypto.digest(new TextEncoder().encode(window.location.host));
      const derivedColor = deriveColor(digest);
      setDefaultActiveColor(derivedColor);
    })();
  }, []);

  return (
    <RouterNavLink
      to={props.to}
      end={props.end ?? false}
      className={({ isActive }) =>
        `${styles['nav-link']} ${isActive ? styles['active'] : ''}`
      }
      style={
        {
          "--nav-link-active-color": defaultActiveColor,
        } as React.CSSProperties
      }
    >
      {props.icon}
      <span>{props.label}</span>
      <span className={`${styles['nav-link-indicator']}`} />
    </RouterNavLink>
  );
}