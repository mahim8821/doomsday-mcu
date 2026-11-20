import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MovieSeedData {
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisites: string[];
}

const MOVIES: MovieSeedData[] = [
  {
    title: 'Iron Man',
    releaseYear: 2008,
    runtimeMinutes: 126,
    watched: false,
    prerequisites: [],
  },
  {
    title: 'Captain America: The First Avenger',
    releaseYear: 2011,
    runtimeMinutes: 124,
    watched: false,
    prerequisites: [],
  },
  {
    title: 'The Avengers',
    releaseYear: 2012,
    runtimeMinutes: 143,
    watched: false,
    prerequisites: ['Iron Man', 'Captain America: The First Avenger'],
  },
  {
    title: 'Captain America: Civil War',
    releaseYear: 2016,
    runtimeMinutes: 147,
    watched: false,
    prerequisites: ['The Avengers'],
  },
  {
    title: 'Thor: Ragnarok',
    releaseYear: 2017,
    runtimeMinutes: 130,
    watched: false,
    prerequisites: [],
  },
  {
    title: 'Avengers: Infinity War',
    releaseYear: 2018,
    runtimeMinutes: 149,
    watched: false,
    prerequisites: ['Captain America: Civil War', 'Thor: Ragnarok'],
  },
  {
    title: 'Avengers: Endgame',
    releaseYear: 2019,
    runtimeMinutes: 181,
    watched: false,
    prerequisites: ['Avengers: Infinity War'],
  },
  {
    title: 'Avengers: Doomsday',
    releaseYear: 2026,
    runtimeMinutes: 180,
    watched: false,
    prerequisites: ['Avengers: Endgame'],
  },
];

const CINEMAS = [
  {
    name: 'Stark Tower IMAX',
    bundleSizes: [1, 3, 4],
  },
  {
    name: 'Avengers Compound ScreenX',
    bundleSizes: [2, 5],
  },
  {
    name: 'Sanctum Sanctorum Grand',
    bundleSizes: [6, 9, 20],
  },
  {
    name: 'Wakanda Royal Cinema',
    bundleSizes: [4, 6],
  },
];

export async function main() {
  console.log('Seeding MCU Movies and Cinemas (Idempotent)...');

  // 1. Upsert all movies first (without relations)
  for (const movie of MOVIES) {
    await prisma.movie.upsert({
      where: { title: movie.title },
      update: {
        releaseYear: movie.releaseYear,
        runtimeMinutes: movie.runtimeMinutes,
      },
      create: {
        title: movie.title,
        releaseYear: movie.releaseYear,
        runtimeMinutes: movie.runtimeMinutes,
        watched: movie.watched,
      },
    });
  }

  // 2. Link prerequisites
  for (const movie of MOVIES) {
    if (movie.prerequisites.length > 0) {
      await prisma.movie.update({
        where: { title: movie.title },
        data: {
          prerequisites: {
            set: movie.prerequisites.map((title) => ({ title })),
          },
        },
      });
    } else {
      await prisma.movie.update({
        where: { title: movie.title },
        data: {
          prerequisites: {
            set: [],
          },
        },
      });
    }
  }

  // 3. Upsert Cinemas
  for (const cinema of CINEMAS) {
    await prisma.cinema.upsert({
      where: { name: cinema.name },
      update: {
        bundleSizes: cinema.bundleSizes,
      },
      create: {
        name: cinema.name,
        bundleSizes: cinema.bundleSizes,
      },
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
