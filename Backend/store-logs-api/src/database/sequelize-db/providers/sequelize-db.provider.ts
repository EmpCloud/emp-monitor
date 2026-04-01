import { EmployeeTimesheetEntity } from '../entities/employee-timesheet';
import { Sequelize } from 'sequelize-typescript';
import { EmployeeAttendanceEntity } from '../entities/employee-attendance';
import { IntegrationsEntity } from '../entities/integrations';
import { ProvidersEntity } from '../entities/providers';
import { OrganizationProvidersEntity } from '../entities/organization-providers';
import { OrganizationProvidersCredentialsEntity } from '../entities/organization-providers-credentials';
import { ProductionStatsEntity } from '../entities/production-stats.entity';

export const sequelizeDbProviders = {
    provide: 'SEQUELIZE',
    useFactory: async () => {
        const sequelize = new Sequelize({
            dialect: 'mysql',
            host: process.env.MYSQL_HOST,
            pool: { max: 10, min: 1, acquire: 30000, idle: 10000 },
            dialectOptions: { typeCast: true },
            port: 3306,
            username: process.env.MYSQL_USERNAME,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            timezone: process.env.TIMEZONE_SEQUELIZE,
            logging: false
            // query: { raw: true }
        });
        sequelize.addModels([
            EmployeeTimesheetEntity,
            EmployeeAttendanceEntity,
            IntegrationsEntity,
            ProvidersEntity,
            OrganizationProvidersEntity,
            OrganizationProvidersCredentialsEntity,
            ProductionStatsEntity
        ]);
        await sequelize.sync({ logging: false });
        // Disable ONLY_FULL_GROUP_BY to maintain MariaDB-compatible GROUP BY behavior
        await sequelize.query("SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
        return sequelize;
    }
};