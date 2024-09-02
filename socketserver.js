import { WebSocketServer } from 'ws';
import crypto from 'crypto';

const wss = new WebSocketServer({ port: 8080 });
const hosts = {};
const tokens = {}; 

const pairs = new Map();

function generateToken() {
  let token;
  do {
      token = crypto.randomInt(100, 1000).toString();
  } while (tokens[token]);
  return token;
}

wss.on('connection', function connection(ws) {

  console.log("Connected");
  console.log(ws.toString());
  ws.on('message', function message(data) {
    console.log(`receive ${data}`);
    const message = data.toString();
    if (message.startsWith("host:")) {
      const token = generateToken();
      tokens[token] = {
        socket: ws,
        config: message.substring(5)
      };
      hosts[ws] = token;
      ws.send(`token:${token.toString()}`);
    }
    else if (message.startsWith("join:")) {
      const token = message.substring(5);
      if (token in tokens) {
        const ows = tokens[token].socket;
        ws.send(`paired:${tokens[token].config}`);
        pairs.set(ws, ows);
        pairs.set(ows, ws);
        ows.send("paired:");
      }
      else {
        ws.send("rejected:")
      }
    }
    else if (message.startsWith("command:")) {
      const [_, type, data] = message.split(":");
      console.log(message);
      if (pairs.has(ws)) {
        const ows = pairs.get(ws);
        ows.send(`${type}:${data}`);
      }
      else {
        if (type == "set_turn") {
          tokens[hosts[ws]].config = data;
          console.log("Update");
        }
      }
    }
    else if (message.startsWith("disconnect")) {

    }
  });
  ws.on('close', function close() {
    console.log("Close");
    if (pairs.has(ws)) {
      if (pairs.has(pairs.get(ws))) {
        pairs.delete(pairs.get(ws));
      }
      pairs.delete(ws);
    }
    if (ws in hosts) {
      if (hosts[ws] in tokens) {
        delete tokens[hosts[ws]];
      }
      delete hosts[ws];
    }
    console.log(Object.keys(pairs).length);
    console.log(Object.keys(tokens).length);
    console.log(Object.keys(hosts).length);
  });
}); 