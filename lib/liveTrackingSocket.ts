import { Client } from "@stomp/stompjs";
import * as encoding from "text-encoding";

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = encoding.TextEncoder;
  global.TextDecoder = encoding.TextDecoder;
}

const LIVE_TRACKING_WS_URL =
  "ws://192.168.8.102:8080/trck/ws-live-tracking/websocket";

let liveTrackingClient: Client | null = null;
let liveTrackingConnectPromise: Promise<Client> | null = null;

export const getLiveTrackingSocket = () => {
  return liveTrackingClient;
};

export const connectLiveTrackingSocket = async (token: string) => {
  if (liveTrackingClient?.connected) {
    return liveTrackingClient;
  }

  if (liveTrackingConnectPromise) {
    return liveTrackingConnectPromise;
  }

  if (liveTrackingClient) {
    await liveTrackingClient.deactivate();
    liveTrackingClient = null;
  }

  const client = new Client({
    brokerURL: LIVE_TRACKING_WS_URL,
    webSocketFactory: () => new WebSocket(LIVE_TRACKING_WS_URL),
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      host: "192.168.8.102",
    },
    debug: (msg) => console.log("[STOMP DEBUG]", msg),
  });

  liveTrackingClient = client;

  liveTrackingConnectPromise = new Promise<Client>((resolve, reject) => {
    client.onConnect = () => {
      resolve(client);
    };

    client.onStompError = (frame) => {
      reject(
        new Error(
          frame.headers.message || "Tracking server rejected connection.",
        ),
      );
    };

    client.onWebSocketError = () => {
      reject(new Error("Failed to connect to live tracking."));
    };

    client.activate();
  })
    .catch((error) => {
      if (liveTrackingClient === client) {
        liveTrackingClient = null;
      }
      throw error;
    })
    .finally(() => {
      liveTrackingConnectPromise = null;
    });

  return liveTrackingConnectPromise;
};

export const disconnectLiveTrackingSocket = async () => {
  if (!liveTrackingClient) {
    return;
  }

  const clientToClose = liveTrackingClient;
  liveTrackingClient = null;
  liveTrackingConnectPromise = null;
  await clientToClose.deactivate();
};
