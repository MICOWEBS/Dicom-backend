import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: true,
  entities: [path.join(__dirname, './entities/**/*.{ts,js}')],
  migrations: [path.join(__dirname, './migrations/**/*.{ts,js}')],
  subscribers: [path.join(__dirname, './subscribers/**/*.{ts,js}')],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}); 