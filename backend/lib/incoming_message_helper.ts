import type { IncomingMessage } from "node:http";

export interface RequestURL {
  pathname: string;
  searchParams: URLSearchParams;
}

export default class IncomingMessageHelper {
  static parseURL(req: IncomingMessage): RequestURL {
    const { pathname, searchParams } = new URL(req.url ?? '', 'http://localhost');
    return { pathname, searchParams };
  }
}
