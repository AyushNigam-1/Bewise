import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";
import { bearer } from "better-auth/plugins";

export const authClient = createAuthClient({
  plugins: [bearer(), inferAdditionalFields<typeof auth>()],
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { useSession, signIn, signUp, signOut } = authClient;
