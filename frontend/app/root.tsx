import 'bootstrap/dist/css/bootstrap.css';
import "./app.css";

import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import { StoreProvider } from "lib/store";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import { EphemeraStore } from "./store";
import Crypto from '@ephemera/shared/lib/crypto';
import { deriveColor, deriveColorRgb, getServerBackground, getServerBorder, getServerFontColor, getServerUserNameColor, rgbToString } from 'components/server_identicon';
import Hex from '@ephemera/shared/lib/hex';

export async function loader() {
  const now = Date.now();
  const host = NullableHelper.unwrap(process.env.EPHEMERA_HOST);
  const hostDigest = Hex.fromUint8Array(await Crypto.digest(new TextEncoder().encode(host)));

  return {
    host,
    hostDigest,
    date: now
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useLoaderData<typeof loader>();
  const derivedColor = deriveColorRgb(Hex.toUint8Array(loaderData.hostDigest));
  const backgroundColor = getServerBackground(derivedColor);
  const borderColor = getServerBorder(derivedColor);
  const fontColor = getServerFontColor(derivedColor);
  const userNameColor = getServerUserNameColor(derivedColor);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body style={{
        '--server-color': rgbToString(derivedColor),
        '--server-background-color': rgbToString(backgroundColor),
        '--server-border-color': rgbToString(borderColor),
        '--server-font-color': rgbToString(fontColor),
        '--server-user-name-color': rgbToString(userNameColor),
        backgroundColor: 'var(--server-background-color)',
        color: 'var(--server-font-color)',
      } as React.CSSProperties}>
        <StoreProvider create={() => new EphemeraStore(loaderData.host, loaderData.date)}>
          {children}
        </StoreProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
