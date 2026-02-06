import type { Story } from "@ladle/react";
import ServerIdenticon from "./server_identicon";

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