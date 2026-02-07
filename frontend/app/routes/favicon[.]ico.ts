import { render } from "components/server_identicon";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import Crypto from "@ephemera/shared/lib/crypto";
import { Cache } from "@ephemera/shared/lib/cache";

const kSizes = [16, 32, 48, 64, 128, 256];

async function renderToIco(svgString: string) {
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

const icoCache = new Cache<Uint8Array | null>();

export async function loader() {
  const ico = await icoCache.getOrSet(async () => {
    const host = process.env.EPHEMERA_HOST;

    if (host === undefined) {
      return null;
    }

    const digest = await Crypto.digest(new TextEncoder().encode(host));
    const svgString = render(digest, { numSegments: 7, gapWidth: 16 });
    return await renderToIco(svgString);
  });

  if (ico === null) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(new Uint8Array(ico), {
    status: 200,
    headers: {
      "Content-Type": "image/x-icon",
      "Content-Length": ico.length.toString(),
      "Cache-Control": "public, max-age=86400"
    }
  });
}