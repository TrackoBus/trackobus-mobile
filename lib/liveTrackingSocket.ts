import { Client } from "@stomp/stompjs";
import { FIREBASE_AUTH } from "@/firebaseConfig";
import * as encoding from "text-encoding";

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = encoding.TextEncoder;
  global.TextDecoder = encoding.TextDecoder;
}

const LIVE_TRACKING_WS_URL =
import { API_BASE_URL } from "@/constants/api";
  "ws://10.76.87.174:8080/trck/ws-live-tracking/websocket";

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
    debug: (message: string) => {
      if (
        /\bCONNECT\b|\bCONNECTED\b|\bDISCONNECT\b|\bSUBSCRIBE\b/i.test(
          message,
        )
      ) {
        console.log(`[STOMP] ${message}`);
      }
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 60000, // Expect a ping from the server every 60s
    heartbeatOutgoing: 60000, // Send a ping to the server every 60s
    beforeConnect: async () => {
      const currentUser = FIREBASE_AUTH.currentUser;
      const refreshedToken = currentUser
        ? await currentUser.getIdToken(true)
        : token;

      client.connectHeaders = {
        Authorization: `Bearer ${refreshedToken}`,
        host: "192.168.8.102",
      };
    },
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
