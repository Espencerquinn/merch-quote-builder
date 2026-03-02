import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-compatible auth config (no DB imports)
// Used by middleware for JWT verification only
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize is handled in the full config (index.ts)
      // This stub satisfies the type but is never called from middleware
      authorize: () => null,
    }),
  ],
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isProtectedRoute = pathname.startsWith("/dashboard");
      const isAdminRoute = pathname.startsWith("/admin");

      if (isProtectedRoute && !isLoggedIn) {
        return false; // Redirect to signIn page
      }

      if (isAdminRoute && !isLoggedIn) {
        return false;
      }

      if (isAdminRoute && auth?.user?.role !== "admin") {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
