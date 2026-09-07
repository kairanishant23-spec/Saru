import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const PgSession = connectPgSimple(session);

const app: Express = express();

// Trust the reverse proxy (Replit deployment) so req.secure is true on HTTPS
// requests. Without this, express-session never sends the Secure cookie back
// to the browser because it sees the internal HTTP connection, not HTTPS.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS: only allow the configured frontend origin (or localhost in dev).
// Avoid reflecting every origin with credentials=true, which allows any
// website to make authenticated requests on behalf of the logged-in user.
const allowedOrigin =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:5173");

app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Require a strong session secret in production. In development we fall back
// to a well-known placeholder, but we print a warning so it isn't missed.
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET environment variable is required in production but was not set.",
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    "[WARN] SESSION_SECRET is not set. Using an insecure default — set this variable before deploying.",
  );
}

app.use(
  session({
    store: new PgSession({
      pool,
      // Creates the "session" table automatically if it doesn't exist
      createTableIfMissing: true,
    }),
    secret: sessionSecret ?? "himsaru-erp-dev-secret-do-not-use-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use("/api", router);

export default app;
