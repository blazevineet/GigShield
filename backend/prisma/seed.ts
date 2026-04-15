import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Seeding Zone Risk Profiles for Phase 3...')

  const zones = [
    {
      zone: "Velachery",
      city: "Chennai",
      floodRiskIndex: 0.85,
      claimFrequency: 0.12,
      lat: 12.9784,
      lon: 80.2209
    },
    {
      zone: "Dharavi",
      city: "Mumbai",
      floodRiskIndex: 0.92,
      claimFrequency: 0.18,
      lat: 19.0380,
      lon: 72.8538
    },
    {
      zone: "Indirapuram",
      city: "Ghaziabad",
      floodRiskIndex: 0.45,
      claimFrequency: 0.05,
      lat: 28.6365,
      lon: 77.3710
    }
  ]

  for (const z of zones) {
    await prisma.zoneRiskProfile.upsert({
      where: { zone: z.zone },
      update: z,
      create: z,
    })
  }

  console.log('✅ Seeding complete: Database is now "Smart".')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })