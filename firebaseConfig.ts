// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAo9yeKMvcmq5i6aCDLhXw9G-J0fm8oJ-E",
  authDomain: "trackobus-b7059.firebaseapp.com",
  projectId: "trackobus-b7059",
  storageBucket: "trackobus-b7059.firebasestorage.app",
  messagingSenderId: "293010163141",
  appId: "1:293010163141:web:d65fbacbfff7d4742637ac"
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);

const createFirebaseAuth = () => {
  if (Platform.OS === "web") {
    return getAuth(FIREBASE_APP);
  }

  try {
    const rnAuth = require("@firebase/auth") as {
      initializeAuth: (app: unknown, deps: unknown) => Auth;
      getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
    };

    return rnAuth.initializeAuth(FIREBASE_APP, {
      persistence: rnAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Reuse existing auth instance during fast refresh/hot reload.
    return getAuth(FIREBASE_APP);
  }
};

export const FIREBASE_AUTH = createFirebaseAuth();