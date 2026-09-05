import { handleWebSocket } from "./ws.ts";
import { NetworkManager } from "./js/engine/network.js";

Deno.test("full lobby reports an error, preserves ready state, and allows retry", async () => {
  const server = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen() {} }, (req) =>
    handleWebSocket(req, "capacity-test")
  );
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { protocol: "http:", host: `127.0.0.1:${server.addr.port}`, pathname: "/capacity-test" },
  });
  const clients = [];
  const connect = async () => {
    const client = new NetworkManager();
    clients.push(client);
    client.connect();
    await client.ready;
    return client;
  };
  const close = async (client) => {
    if (client.ws.readyState === WebSocket.CLOSED) return;
    const closed = new Promise((resolve) => client.ws.addEventListener("close", resolve, { once: true }));
    client.ws.close();
    await closed;
  };
  try {
    let rejected;
    for (let i = 0; i < 100; i++) {
      const client = await connect();
      if (!client.connected) { rejected = client; break; }
    }
    if (!rejected?.connectionError.includes("already full")) throw Error("Missing full-lobby error");
    const admitted = clients.filter((client) => client.connected);
    if (admitted.length < 2) throw Error("Expected a multiplayer lobby");
    const first = admitted[0];
    const ready = new Promise((resolve) => { first.onReady = resolve; });
    first.sendReady();
    await ready;
    let unexpectedLeave = false;
    first.onLeave = () => { unexpectedLeave = true; };
    const anotherRejected = await connect();
    await close(anotherRejected);
    if (unexpectedLeave) throw Error("Rejected client broadcast a leave");
    const started = new Promise((resolve) => { first.onStart = resolve; });
    for (const client of admitted.slice(1)) client.sendReady();
    await started;
    await close(admitted.at(-1));
    rejected.connect();
    await rejected.ready;
    if (!rejected.connected || rejected.connectionError) throw Error("Retry failed after a slot opened");
  } finally {
    await Promise.all(clients.map(close));
    await server.shutdown();
    if (previousLocation) Object.defineProperty(globalThis, "location", previousLocation);
    else delete globalThis.location;
  }
});
