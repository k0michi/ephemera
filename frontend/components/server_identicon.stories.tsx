import type { Story } from "@ladle/react";
import ServerIdenticon, { deriveColor } from "./server_identicon";
import ArrayHelper from "@ephemera/shared/lib/array_helper";
import { useEffect, useState } from "react";
import Crypto from "@ephemera/shared/lib/crypto";

function* generateHostnames() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const digits: number[] = [0];

  while (true) {
    yield `${digits.map((i) => chars[i]).join("")}.com`;

    let pos = digits.length - 1;
    while (pos >= 0) {
      if (ArrayHelper.strictGet(digits, pos) < chars.length - 1) {
        ArrayHelper.strictSet(digits, pos, ArrayHelper.strictGet(digits, pos) + 1);
        break;
      }

      digits[pos] = 0;
      pos--;
    }

    if (pos < 0) {
      digits.unshift(0);
    }
  }
}

export const List: Story = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {Array.from({ length: 128 }, (_, i) => (
        <div key={i} style={{ margin: 8, display: 'inline-block' }}>
          <ServerIdenticon
            data={new Uint8Array([i])}
            style={{ width: 64, height: 64 }}
          />
        </div>
      ))}
    </div>
  );
};

export const ColorList: Story = () => {
  const hostnames = [...generateHostnames().take(256)];
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const newColors: string[] = [];
      for (let i = 0; i < hostnames.length; i++) {
        const hostname = hostnames[i];
        const encoder = new TextEncoder();
        const data = encoder.encode(hostname);
        const digest = await Crypto.digest(data);
        const color = deriveColor(digest);
        newColors.push(color);
      }
      setColors(newColors);
    })();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {hostnames.map((hostname, i) => (
        <div key={i} style={{ margin: 8, display: 'inline-block', color: colors[i] || 'black', fontFamily: 'monospace', fontSize: 24 }}>
          {hostname}
        </div>
      ))}
    </div>
  );
}