/*
  Scraper-resistant contact encoding.

  Cloudflare-style XOR scheme: the first byte of the payload is a random
  key; every subsequent byte is the plaintext char XOR'd with that key,
  hex-encoded. At build time the helper returns the ciphertext; the
  client-side `decodeCfe` fn (inlined on each prototype) reverses it.

  The literal "user@host" string is never present in served HTML, so
  naive address-harvesting regexes find nothing. It won't defeat a
  determined scraper running a headless browser, but it stops the vast
  majority which just grep server responses.
*/

export function encodeContact(plain: string): string {
  const key = Math.floor(Math.random() * 200) + 30;
  const keyHex = key.toString(16).padStart(2, "0");
  let out = keyHex;
  for (let i = 0; i < plain.length; i++) {
    const code = plain.charCodeAt(i) ^ key;
    out += code.toString(16).padStart(2, "0");
  }
  return out;
}

// Public so prototypes can inline the matching decoder. Runs in the
// browser; kept tiny so each prototype can paste it into its <script>.
export const DECODE_FN = `
function decodeCfe(hex){
  try {
    const k = parseInt(hex.substring(0,2), 16);
    let out = '';
    for (let i = 2; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.substring(i, i+2), 16) ^ k);
    }
    return out;
  } catch(e) { return ''; }
}
`.trim();
