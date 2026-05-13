// @ts-nocheck
import { Injectable, Inject } from '@nestjs/common';
import { mysqlConstants } from '../providers/sequelize-db.constants';
import { ProductionStatsEntity } from '../entities/production-stats.entity';
import { Op } from 'sequelize';

@Injectable()
export class ProductionStatsModel {

    constructor(@Inject(mysqlConstants.productionStatsRepo) private readonly tableRepo: typeof ProductionStatsEntity) { }
    async getproductionStartData(user_id: number): Promise<any> {
        return await this.tableRepo.findAll<ProductionStatsEntity>({
            where: {
                user_id,
            },
            limit: 1,
            order: [['created_at', 'DESC']],
            raw: true,
            nest: true
        });
    }

    async addProductionStats(log_sheet_id: string, day: string, login_time: string, logout_time: string, user_id: number, admin_id: number, working_hours: string, non_working_hours: string, total_hours: string, w_sec: number, t_sec: number, n_sec: number): Promise<any> {
        return await this.tableRepo.create({
            log_sheet_id: log_sheet_id,
            day: day,
            login_time: login_time,
            logout_time: logout_time,
            user_id: user_id,
            admin_id: admin_id,
            working_hours: working_hours,
            non_working_hours: non_working_hours,
            total_hours: total_hours,
            w_sec: w_sec,
            n_sec: n_sec,
            t_sec: t_sec
        });
    }
    async updateProductionStat(log_sheet_id: string, logout_time: string, working_hours: string, non_working_hours: string, total_hours: string, w_sec: number, n_sec: number, t_sec: number): Promise<any> {
        return await this.tableRepo.update<ProductionStatsEntity>(
            {
                logout_time: logout_time,
                working_hours: working_hours,
                non_working_hours: non_working_hours,
                total_hours: total_hours,
                w_sec: w_sec,
                t_sec: t_sec,
                n_sec: n_sec
            },
            {
                where: {
                    log_sheet_id: log_sheet_id
                }
            }
        );
    }
}
