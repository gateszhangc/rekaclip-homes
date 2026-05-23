import NextAuth from "next-auth";
import { authOptions } from "./config";

// Re-export handlers
export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
