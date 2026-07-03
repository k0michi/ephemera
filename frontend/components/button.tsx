import React, { type ButtonHTMLAttributes,type CSSProperties, type ReactNode } from "react";

import styles from "./button.module.css";

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  baseColor?: string;
  size?: "small" | "normal" | "large";
  children: ReactNode;
}

type ButtonCssVars = CSSProperties & {
  "--base-color"?: string;
  "--text-color"?: string;
};

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  baseColor = "#ffffff",
  size = "normal",
  disabled = false,
  className,
  style,
  children,
  ...rest
}) => {
  const cssVars: ButtonCssVars = {
    "--base-color": baseColor,
    ...style,
  };

  const classes = [styles.btn, styles[size], className, styles.label].filter(Boolean).join(" ");

  return (
    <button className={classes} style={cssVars} disabled={disabled} {...rest}>
      {children}
    </button>
  );
};

export default PrimaryButton;