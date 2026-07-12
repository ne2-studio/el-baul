import { Hono } from "hono";
import { Context } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createClient } from "supabase";

// Repositories
import { UserPostgresRepository } from "./repositories/postgres/user.postgres.repository.ts";
import { BaulPostgresRepository } from "./repositories/postgres/baul.postgres.repository.ts";
import { AlbumPostgresRepository } from "./repositories/postgres/album.postgres.repository.ts";
import { PhotoPostgresRepository } from "./repositories/postgres/photo.postgres.repository.ts";
import { ActivityPostgresRepository } from "./repositories/postgres/activity.postgres.repository.ts";
import { RecuerdoPostgresRepository } from "./repositories/postgres/recuerdo.postgres.repository.ts";
import { SupabaseFileStorage } from "./repositories/postgres/supabase-file-storage.ts";

// Use Cases
import { BaulUseCases } from "./use-cases/baul.use-cases.ts";
import { AlbumUseCases } from "./use-cases/album.use-cases.ts";
import { PhotoUseCases } from "./use-cases/photo.use-cases.ts";
import { ActivityUseCases } from "./use-cases/activity.use-cases.ts";

// Routes
import { authRoutes } from "./routes/auth.routes.ts";
import { baulRoutes } from "./routes/baul.routes.ts";
import { albumRoutes } from "./routes/album.routes.ts";
import { photoRoutes } from "./routes/photo.routes.ts";
import { activityRoutes } from "./routes/activity.routes.ts";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info", "x-supabase-api-version"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize Repositories
const supabaseClient = getSupabaseAdmin();
const userRepo = new UserPostgresRepository(supabaseClient);
const baulRepo = new BaulPostgresRepository(supabaseClient);
const albumRepo = new AlbumPostgresRepository(supabaseClient);
const photoRepo = new PhotoPostgresRepository(supabaseClient);
const activityRepo = new ActivityPostgresRepository(supabaseClient);
const recuerdoRepo = new RecuerdoPostgresRepository(supabaseClient);

// Initialize Use Cases
const fileStorage = new SupabaseFileStorage(supabaseClient);

const baulUseCases = new BaulUseCases(
  baulRepo,
  userRepo,
  activityRepo,
  photoRepo,
  albumRepo,
  fileStorage,
);
const albumUseCases = new AlbumUseCases(albumRepo, baulRepo, fileStorage);
const photoUseCases = new PhotoUseCases(
  photoRepo,
  albumRepo,
  baulRepo,
  activityRepo,
  fileStorage,
  recuerdoRepo,
  userRepo,
);
const activityUseCases = new ActivityUseCases(activityRepo, baulRepo);

// Helper to create Supabase admin client
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Helper to verify user authentication
async function verifyAuth(
  c: Context,
): Promise<{ userId: string; email: string } | null> {
  // Real Supabase authentication
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return null;

  const accessToken = authHeader.split(" ")[1];
  if (!accessToken) return null;

  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    console.log("Authorization error:", error);
    return null;
  }

  return {
    userId: user.id,
    email: user.email || "",
    name: user.user_metadata?.full_name || user.user_metadata?.name || "Usuario",
  };
}

const api = new Hono();

// Health check endpoint
api.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Register Entity Routes
api.route("/auth", authRoutes(userRepo, verifyAuth));
api.route("/baules", baulRoutes(baulUseCases, baulRepo, verifyAuth));
api.route("/baules", albumRoutes(albumUseCases, verifyAuth));
api.route("/", photoRoutes(photoUseCases, verifyAuth));
api.route("/activities", activityRoutes(activityUseCases, verifyAuth));

app.route("/server", api);

Deno.serve(app.fetch);
