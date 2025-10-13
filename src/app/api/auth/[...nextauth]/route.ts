import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { Session } from "next-auth";
import { AdapterUser } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Solo permitir usuarios específicos
      return profile?.email === process.env.ADMIN_EMAIL;
    },
    async session({ session }: { session: Session }) {
      return session;
    },
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/error',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };