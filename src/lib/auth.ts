import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { account, session, user, verification } from "@/db/auth-schema";
import { db } from "./database";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      console.log(`[Reset Password] ${user.email}: ${url}`);
    },
    resetPasswordTokenExpiresIn: 60 * 15,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false, returned: true },
      role: { type: "string", defaultValue: "user", returned: true, input: false },
      status: { type: "string", defaultValue: "active", returned: true, input: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session & {
  user: typeof auth.$Infer.Session.user & { role: string; status: string; phone?: string };
};
