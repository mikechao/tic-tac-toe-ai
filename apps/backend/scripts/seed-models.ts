import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { leaderboardStats, models } from '../drizzle/schema'

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for seeding')
  }

  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client)

  const presetModels = [
    {
      name: 'Gemini Nano Tactical',
      description:
        'Default aggressive tic-tac-toe strategy tuned for short games',
      provider: 'Google Gemini',
    },
    {
      name: 'Gemini Nano Defensive',
      description: 'Defensive variant focusing on blocking opponent wins',
      provider: 'Google Gemini',
    },
  ]

  for (const model of presetModels) {
    const [existing] = await db
      .select({ id: models.id })
      .from(models)
      .where(models.name.eq(model.name))
      .limit(1)

    if (existing) {
      continue
    }

    const [created] = await db
      .insert(models)
      .values(model)
      .returning({ id: models.id })

    await db
      .insert(leaderboardStats)
      .values({ modelId: created.id })
      .onConflictDoNothing({ target: leaderboardStats.modelId })
  }

  await client.end({ timeout: 0 })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
