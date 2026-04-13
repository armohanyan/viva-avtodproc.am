import { Sequelize } from 'sequelize';
import config from '../config';

export const sequelize = new Sequelize(config.MYSQL.DATABASE, config.MYSQL.USER, config.MYSQL.PASSWORD, {
  host: config.MYSQL.HOST,
  port: config.MYSQL.PORT,
  dialect: 'mysql',
  logging: config.MYSQL.LOGGING,
  define: {
    underscored: true,
    timestamps: true,
  },
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
}
