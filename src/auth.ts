import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const FALLBACK_USERS = [
  {
    id: "local-admin-1",
    email: "admin@mockexam.pro",
    password: "adminpassword123",
    fullName: "MockExam Admin",
    role: "admin" as const,
  },
  {
    id: "local-student-1",
    email: "student@mockexam.pro",
    password: "studentpassword123",
    fullName: "Aspirant Rahul",
    role: "student" as const,
  },
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user) return null;

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            role: user.role,
          };
        } catch {
          // Offline fallback when PostgreSQL is unavailable
          const fallback = FALLBACK_USERS.find(
            (u) => u.email === email && u.password === password
          );
          if (!fallback) return null;

          return {
            id: fallback.id,
            email: fallback.email,
            name: fallback.fullName,
            role: fallback.role,
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role || "student";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || "";
        (session.user as { role?: string }).role = (token.role as string) || "student";
      }
      return session;
    },
  },
});
