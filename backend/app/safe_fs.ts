import type { Mode, OpenMode } from 'fs';
import type { FileHandle } from 'fs/promises';
import fsPromises from 'fs/promises';
import isPathInside from 'is-path-inside';
import path from 'path';

/**
 * A `fs/promises`-like API where every path is resolved relative to a `root` and rejected if
 * it would resolve outside of it (e.g. via a `..` or absolute segment).
 */
export default class SafeFS {
  private static resolve(root: string, p: string | string[]): string {
    const resolvedRoot = path.resolve(root);
    const segments = Array.isArray(p) ? p : [p];
    const resolved = path.resolve(resolvedRoot, ...segments);

    if (resolved !== resolvedRoot && !isPathInside(resolved, resolvedRoot)) {
      throw new Error(`${resolved} is not inside ${resolvedRoot}`);
    }

    return resolved;
  }

  static open(root: string, p: string | string[], flags: OpenMode = 'r', mode?: Mode): Promise<FileHandle> {
    return fsPromises.open(this.resolve(root, p), flags, mode);
  }
}
