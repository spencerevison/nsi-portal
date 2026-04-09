# Potential Enhancements

## Data Layer

- **Add Zod validation to Supabase queries** — define schemas for each table's response shape, parse query results at the boundary. Catches DB drift at runtime, eliminates manual type definitions and `as` casts. Small change — keep existing query code, just wrap results.
- **ORM migration (Prisma or Drizzle)** — full type-safe data layer with generated types, compile-time column checks, managed migrations. Bigger lift — touches most files in `src/lib/`. Prisma has better learning resources; Drizzle is lighter and closer to current query style.
