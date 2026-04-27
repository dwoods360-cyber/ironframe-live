"use client";

import { create } from "zustand";

/** Dev / lab: Control Room identity for GRC handshake drills (client + cookie-backed for server actions). */
export type ShadowHandshakeRole = "ADMIN" | "CISO";

type State = {
  handshakeRole: ShadowHandshakeRole;
  setHandshakeRole: (role: ShadowHandshakeRole) => void;
};

export const useShadowHandshakeRoleStore = create<State>((set) => ({
  handshakeRole: "ADMIN",
  setHandshakeRole: (handshakeRole) => set({ handshakeRole }),
}));
