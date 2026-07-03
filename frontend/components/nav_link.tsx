import Crypto from "@ephemera/shared/lib/crypto";
import { useSelector } from "lib/store";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

import { EphemeraStore } from "~/store";

import styles from "./nav_link.module.css";
import { deriveColor } from "./server_identicon";

export interface NavLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

export function NavLink(props: NavLinkProps) {
  const location = useLocation();
  const active = location.pathname.startsWith(props.to);

  return (
    <Link
      to={props.to}
      className={`${styles['nav-link']} ${active ? styles['active'] : ''}`}
    >
      {props.icon}
      <span>{props.label}</span>
      <span className={`${styles['nav-link-indicator']}`} />
    </Link>
  );
}