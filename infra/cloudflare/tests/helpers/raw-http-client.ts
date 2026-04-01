import * as net from 'net';

const CRLF = '\r\n';
const RESPONSE_TIMEOUT_MS = 10000;

function parseStatusLine(data: string): number {
  const firstLine = data.split(CRLF)[0] ?? '';
  const parts = firstLine.trim().split(/\s+/);
  const status = parts[1];
  const code = status ? parseInt(status, 10) : 0;
  return Number.isFinite(code) ? code : 0;
}

export function sendRawHttpRequest(
  host: string,
  port: number,
  requestBytes: Buffer
): Promise<{ statusCode: number; raw: string }> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      { host, port, allowHalfOpen: false },
      () => {
        socket.write(requestBytes, (err) => {
          if (err) {
            socket.destroy();
            reject(err);
          }
        });
      }
    );

    let received = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      received += chunk;
      if (received.includes(CRLF + CRLF)) {
        const statusCode = parseStatusLine(received);
        socket.destroy();
        resolve({ statusCode, raw: received });
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });

    socket.setTimeout(RESPONSE_TIMEOUT_MS, () => {
      socket.destroy();
      reject(new Error(`Raw HTTP request timed out after ${RESPONSE_TIMEOUT_MS}ms`));
    });
  });
}

export function buildRawHttpGet(
  path: string,
  headers: Array<[string, string | Buffer]>
): Buffer {
  const line = `GET ${path} HTTP/1.1${CRLF}`;
  const headerLines = headers.map(([name, value]) => {
    const v = Buffer.isBuffer(value) ? value.toString('binary') : value;
    return `${name}: ${v}${CRLF}`;
  });
  const headerBlock = headerLines.join('');
  return Buffer.from(line + headerBlock + CRLF, 'utf8');
}
