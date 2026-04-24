// @ts-nocheck
import { Injectable, Inject } from '@nestjs/common';
import { mysqlConstants } from '../providers/sequelize-db.constants';
import { EmployeeAttendanceEntity } from '../entities/employee-attendance';
import { EmployeeTimesheetEntity } from '../entities/employee-timesheet';
import { Op } from 'sequelize';

@Injectable()
export class EmployeeAttendanceModel {

    constructor(@Inject(mysqlConstants.employeeAttendanceRepo) private readonly tableRepo: typeof EmployeeAttendanceEntity) { }

    async getUserAttendanceDayWiseWithTimesheetData(startDate: string, endDate: string, employee_id: number): Promise<any> {
        return await this.tableRepo.findAll<EmployeeAttendanceEntity>({
            where: {
                employee_id,
                date: { [Op.between]: [startDate, endDate] }
            },
            attributes: ['id', 'date', 'employee_id'],
            include: [{
                model: EmployeeTimesheetEntity,
                attributes: ['id', 'attendance_id', 'start_time', 'end_time', 'type', 'mode', 'duration'],
                all: true
            }],
            raw: true,
            nest: true
        });
    }

    // async getUserAttendanceIdOnSingleDay(startDate: string, employee_id: number): Promise<any> {
    //     return await this.tableRepo.findOne<EmployeeAttendanceEntity>({
    //         where: {
    //             employee_id,
    //             date: startDate
    //         },
    //         attributes: ['id', 'date'],
    //         raw: true,
    //         nest: true
    //     });
    // }


    async getUserAttendanceIdOnSingleDayElseCreate(date: string, employee_id: number, organization_id: number, startDate: string, endDate: string): Promise<any> {
        return await this.tableRepo.findOrCreate<EmployeeAttendanceEntity>({
            where: {
                employee_id,
                date,
                organization_id
            },
            defaults: { start_time: startDate, end_time: endDate }
        });
    }

    async getLastInsertedAttendance(employee_id: number, date: string) {
        return await this.tableRepo.findOne<EmployeeAttendanceEntity>({
            where: {
                employee_id,
                date
            },
            order: [
                ['date', 'DESC']
            ]
        });
    }

    async getLastInsertedAttendanceLastInserted(employee_id: number, date: string) {
        return await this.tableRepo.findOne<EmployeeAttendanceEntity>({
            where: {
                employee_id
            },
            order: [
                ['date', 'DESC']
            ]
        });
    }

    async insertAttendance(employee_id: number, organization_id: number, date: string, start_time: string, end_time: string, details: string) {
        return await this.tableRepo.create<EmployeeAttendanceEntity>({
            employee_id, organization_id, date, start_time, end_time, details
        });
    }


    // getUserAttendanceIdOnSingleDayElseCreate(date: string, employee_id: number, organization_id: number, startDate: string, endDate: string): Promise<any> {
    //     return this.tableRepo.findOrCreate<EmployeeAttendanceEntity>({
    //         where: {
    //             employee_id,
    //             date,
    //             organization_id
    //         },
    //         defaults: { start_time: startDate, end_time: endDate }
    //     }).spread((item, created) => {
    //         return item;
    //     });
    // }
}
