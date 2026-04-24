// @ts-nocheck
import { EmployeeTimesheetEntity } from '../entities/employee-timesheet';
import { Injectable, Inject } from '@nestjs/common';
import { mysqlConstants } from '../providers/sequelize-db.constants';

@Injectable()
export class EmployeeTimesheetModel {

    constructor(@Inject(mysqlConstants.employeeTimesheetRepo) private readonly employeeTimesheetRepo: typeof EmployeeTimesheetEntity) { }

    async create(attendanceId: number, startDate: string, endDate: string, type: number, mode: number, duration: number): Promise<any> {
        return await this.employeeTimesheetRepo.create<EmployeeTimesheetEntity>({
            attendance_id: attendanceId,
            start_time: startDate,
            end_time: endDate,
            type,
            mode,
            duration
        });
    }


    async update(attendanceId: number, startDate: string, endDate: string, type: number, mode: number, duration: number): Promise<any> {
        return await this.employeeTimesheetRepo.update<EmployeeTimesheetEntity>(
            { end_time: endDate },
            {
                where: {
                    attendance_id: attendanceId,
                    start_time: startDate,
                    type,
                    mode
                }
            }
        );
    }

    async findOne(attendanceId: number, startDate: string, type: number, mode: number): Promise<any> {
        return await this.employeeTimesheetRepo.findOne<EmployeeTimesheetEntity>({
            where: {
                attendance_id: attendanceId,
                start_time: startDate,
                type,
                mode
            }
        });
    }


    // create(attendanceId: number, startDate: string, endDate: string, type: number, duration: number): Promise<any> {
    //     return this.employeeTimesheetRepo.create<EmployeeTimesheetEntity>({
    //         attendance_id: attendanceId,
    //         start_time: startDate,
    //         end_time: endDate,
    //         type,
    //         duration
    //     });
    // }
}
