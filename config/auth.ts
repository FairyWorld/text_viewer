export const authConfig = {
  password: process.env.ACCESS_PASSWORD || "666666",

  sessionSecret: process.env.SESSION_SECRET || "f379eaf3c831b04de153469d1bec345e",

  sessionMaxAge: 7 * 24 * 60 * 60 * 1000,

  sessionCookieName: "auth-session",

  enabled: process.env.AUTH_ENABLED !== "false",
} as const;
