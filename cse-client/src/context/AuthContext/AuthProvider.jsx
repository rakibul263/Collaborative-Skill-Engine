import { auth } from "@/firebase/firebase.init";
import React, { useEffect, useState, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
} from "firebase/auth";
import { getSocket } from "@/lib/socket";
import { clearJWT } from "@/lib/jwt";
import axios from "axios";
import { withCacheBust } from "@/lib/profileApi";
import { calculateProfileCompletion } from "@/lib/profileCompletion";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const buildMergedUser = (firebaseUser, mongoUser = null) => {
  if (!firebaseUser) return null;
  const rawImage = mongoUser?.profileImage || firebaseUser.photoURL || "";
  // Apply cache busting so the browser always fetches the latest image
  // after a profile update without a manual refresh.
  const image = withCacheBust(rawImage, mongoUser?.updatedAt);
  const name = mongoUser?.fullName || firebaseUser.displayName || "";
  const profileCompletion = calculateProfileCompletion(mongoUser || {});

  return {
    ...firebaseUser,
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: name,
    fullName: name,
    photoURL: image,
    profileImage: image,
    role: mongoUser?.role || "Learner",
    headline: mongoUser?.headline || "",
    bio: mongoUser?.bio || "",
    teachSkills: mongoUser?.teachSkills || [],
    learnSkills: mongoUser?.learnSkills || [],
    certificates: mongoUser?.certificates || [],
    projects: mongoUser?.projects || [],
    github: mongoUser?.github || "",
    linkedin: mongoUser?.linkedin || "",
    website: mongoUser?.website || "",
    education: mongoUser?.education || "",
    location: mongoUser?.location || "",
    dbUser: mongoUser || null,
    profileCompletion,
  };
};

const AuthProvider = ({ children } = {}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const createUser = async (email, password) => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured. Please set VITE_apiKey in cse-client/.env");
    }
    const safeEmail = email?.trim();
    const safePassword = password ?? "";

    if (!safeEmail || !safePassword) {
      throw new Error("Email and password are required.");
    }

    if (safePassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    setLoading(true);
    try {
      return await createUserWithEmailAndPassword(
        auth,
        safeEmail,
        safePassword
      );
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInUser = async (email, password) => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured. Please set VITE_apiKey in cse-client/.env");
    }
    const safeEmail = email?.trim();
    const safePassword = password ?? "";

    if (!safeEmail || !safePassword) {
      throw new Error("Email and password are required.");
    }

    setLoading(true);
    try {
      return await signInWithEmailAndPassword(auth, safeEmail, safePassword);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured. Please set VITE_apiKey in cse-client/.env");
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Check if this Google user already exists in DB
      try {
        const res = await axios.get(
          `${API_URL}/users?email=${encodeURIComponent(firebaseUser.email)}`
        );
        if (!res.data) {
          // New user — flag so the caller can redirect to /register
          sessionStorage.setItem(
            "googleNewUser",
            JSON.stringify({
              fullName: firebaseUser.displayName || "",
              email: firebaseUser.email,
              profileImage: firebaseUser.photoURL || "",
              uid: firebaseUser.uid,
            })
          );
        }
      } catch {
        // DB check failed — treat as new user
        sessionStorage.setItem(
          "googleNewUser",
          JSON.stringify({
            fullName: firebaseUser.displayName || "",
            email: firebaseUser.email,
            profileImage: firebaseUser.photoURL || "",
            uid: firebaseUser.uid,
          })
        );
      }

      return result;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = (email) => {
    if (!auth) {
      throw new Error("Firebase Auth is not configured. Please set VITE_apiKey in cse-client/.env");
    }
    return sendPasswordResetEmail(auth, email);
  };

  const LogOut = async () => {
    const socket = getSocket();
    if (user?.email && socket.connected) {
      socket.emit("presence:leave", { email: user.email });
    }
    socket.disconnect();
    clearJWT(); // Clear JWT so next user gets a fresh token
    setLoading(true);
    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      return await signOut(auth);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Centralized User Data Synchronizer
  const updateUserData = useCallback((updatedFields) => {
    if (!updatedFields) return;

    setUser((prevUser) => {
      if (!prevUser) return null;

      const newPhoto =
        updatedFields.profileImage ??
        updatedFields.photoURL ??
        updatedFields.image ??
        prevUser.profileImage ??
        prevUser.photoURL ??
        "";

      const newName =
        updatedFields.fullName ??
        updatedFields.displayName ??
        updatedFields.name ??
        prevUser.fullName ??
        prevUser.displayName ??
        "";

      // Non-blocking update to Firebase Auth currentUser
      if (auth?.currentUser && (newPhoto || newName)) {
        const fbUpdate = {};
        if (newName) fbUpdate.displayName = newName;
        if (
          newPhoto &&
          typeof newPhoto === "string" &&
          (newPhoto.startsWith("http://") || newPhoto.startsWith("https://")) &&
          newPhoto.length < 2048
        ) {
          fbUpdate.photoURL = newPhoto;
        }
        if (Object.keys(fbUpdate).length > 0) {
          updateFirebaseProfile(auth.currentUser, fbUpdate).catch((err) =>
            console.warn("[Auth] Firebase profile sync warning:", err.message)
          );
        }
      }

      return {
        ...prevUser,
        ...updatedFields,
        displayName: newName || prevUser.displayName,
        fullName: newName || prevUser.fullName,
        photoURL: newPhoto || prevUser.photoURL,
        profileImage: newPhoto || prevUser.profileImage,
      };
    });
  }, []);

  const refreshUserProfile = useCallback(async (targetEmail) => {
    const emailToFetch = targetEmail || auth?.currentUser?.email || user?.email;
    if (!emailToFetch) return;

    try {
      const res = await axios.get(
        `${API_URL}/users?email=${encodeURIComponent(emailToFetch)}`
      );
      if (res.data) {
        updateUserData(res.data);
      }
    } catch (err) {
      console.warn("[Auth] refreshUserProfile warning:", err.message);
    }
  }, [user?.email, updateUserData]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    let heartbeatInterval = null;
    let onConnectHandler = null;
    let visibilityHandler = null;

    const unSubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const socket = getSocket();

      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (onConnectHandler) socket.off("connect", onConnectHandler);
      if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);

      if (!currentUser) {
        setUser(null);
        socket.emit("presence:leave", {});
        socket.disconnect();
        clearJWT();
        setLoading(false);
      } else {
        clearJWT();
        if (!socket.connected) socket.connect();

        const joinPresence = () => {
          if (currentUser?.email) {
            const clean = String(currentUser.email).trim();
            socket.emit("presence:join", { email: clean });
            socket.emit("presence:join", { email: clean.toLowerCase() });
          }
        };

        // Emit immediately if connected
        if (socket.connected) {
          joinPresence();
        }

        // Always re-emit when socket connects or reconnects
        onConnectHandler = () => {
          joinPresence();
        };
        socket.on("connect", onConnectHandler);

        // Keep heartbeat alive every 25 seconds anywhere on the platform
        heartbeatInterval = setInterval(() => {
          if (currentUser?.email) {
            if (!socket.connected) {
              socket.connect();
            } else {
              socket.emit("presence:heartbeat", { email: currentUser.email });
            }
          }
        }, 25000);

        // Visibility listener (re-join when returning to browser tab)
        visibilityHandler = () => {
          if (document.visibilityState === "visible" && currentUser?.email) {
            if (!socket.connected) socket.connect();
            joinPresence();
          }
        };
        document.addEventListener("visibilitychange", visibilityHandler);

        // Set initial user snapshot
        const initialUser = buildMergedUser(currentUser, null);
        setUser(initialUser);
        setLoading(false);

        // Asynchronously fetch enriched profile from MongoDB
        try {
          const res = await axios.get(
            `${API_URL}/users?email=${encodeURIComponent(currentUser.email)}`
          );
          if (res.data) {
            setUser(buildMergedUser(currentUser, res.data));
          }
        } catch (err) {
          console.warn("[Auth] Profile enrichment warning:", err.message);
        }
      }
    });
    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (onConnectHandler) {
        const socket = getSocket();
        socket.off("connect", onConnectHandler);
      }
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
      unSubscribe();
    };
  }, []);

  const authInfo = {
    user,
    loading,
    createUser,
    signInUser,
    signInWithGoogle,
    resetPassword,
    LogOut,
    updateUserData,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={authInfo}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
