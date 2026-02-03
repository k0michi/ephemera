import { render } from "components/server_identicon";
import NullableHelper from "@ephemera/shared/lib/nullable_helper";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import Crypto from "@ephemera/shared/lib/crypto";

const kSizes = [16, 32, 48, 64, 128, 256];

async function renderToIco(svgString: string): Promise<Buffer> {
  const svgBuf = Buffer.from(svgString, 'utf-8');

  const pngs = await Promise.all(
    kSizes.map((s) =>
      sharp(svgBuf)
        .resize(s, s, { fit: "contain" })
        .png({ compressionLevel: 9 })
        .toBuffer()
    )
  );

  return pngToIco(pngs);
}

export async function loader() {
  const host = NullableHelper.unwrap(process.env.EPHEMERA_HOST);
  const digest = await Crypto.digest(new TextEncoder().encode(host));
  const svgString = render(digest, { numSegments: 7, gapWidth: 16 });
  const icoBuffer = await renderToIco(svgString);

  return new Response(new Uint8Array(icoBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/x-icon",
      "Content-Length": icoBuffer.length.toString(),
      "Cache-Control": "public, max-age=86400"
    }
  });
}