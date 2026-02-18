const socket = new WebSocket("ws://localhost:8000");
let username: string | null = null;
let lobby: string | null = null;

socket.onopen = () => {
  console.log("Connected");
  console.log("Set your username with: name <username>");
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "info") {
    // console.log(`[INFO] ${data.user}: ${data.text}`);
    console.log(`[INFO] ${data.text}`);
  } else if (data.type === "chat") {
    console.log(`${data.user}: ${data.text}`);
  }
};

socket.onclose = (event) => {
  console.log("Disconnected");
  Deno.exit(0);
};

for await (const line of readLines()) {
  const text = line.trim();

  if (text === "exit") {
    socket.close();
    break;
  }

  if (text.startsWith("name ")) {
    username = text.substring(5).trim();
    socket.send(JSON.stringify({ type: "register", username }));
    console.log(`Username set to: ${username}`);
  } else if (text.startsWith("join ")) {
    lobby = text.substring(5).trim();
    socket.send(JSON.stringify({ type: "join", lobby }));
  } else if (text) {
    if (!username) {
      console.log("Please set a username first: name <username>");
    } else if (!lobby) {
      console.log("Please join a lobby first: lobby <lobby id>");
    } else {
      console.log(`You: ${text}`);
      socket.send(JSON.stringify({ type: "chat", text }));
    }
  }
}

async function* readLines() {
  const decoder = new TextDecoder();
  for await (const chunk of Deno.stdin.readable) {
    const text = decoder.decode(chunk);
    const lines = text.split("\n");
    for (const line of lines) {
      if (line) yield line;
    }
  }
}
