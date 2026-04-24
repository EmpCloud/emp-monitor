// @ts-nocheck
import { Injectable, Inject } from '@nestjs/common';
import { OrganizationProvidersEntity } from '../entities/organization-providers';
import { OrganizationProvidersCredentialsEntity } from '../entities/organization-providers-credentials';
import { ProvidersEntity } from '../entities/providers';
import { mysqlConstants } from '../providers/sequelize-db.constants';

@Injectable()
export class IntegrationModel {

    constructor(@Inject(mysqlConstants.providersRepo) private readonly providersRepo: typeof ProvidersEntity) { }
    async findOne(organization_id: number): Promise<any> {
        return await this.providersRepo.findOne<ProvidersEntity>({
            where: {
                status: 1,
            },
            attributes: ['id', 'name', 'short_code', 'status'],
            include: [{
                model: OrganizationProvidersEntity,
                where: {
                    organization_id,
                    status: 1,
                },
                attributes: ['organization_id', 'status'],
                all: true,
                include: [{
                    model: OrganizationProvidersCredentialsEntity,
                    where: {
                        status: 1,
                    },
                    attributes: ['id', 'creds'],
                    all: true
                }],
            }],
            raw: true,
            nest: true
        });

        // constructor(@Inject(mysqlConstants.organizationProvidersRepo) private readonly OrganizationProvidersRepo: typeof OrganizationProvidersEntity) { }
        // async findOne(organization_id: number): Promise < any > {
        //     return await this.OrganizationProvidersRepo.findOne<OrganizationProvidersEntity>({
        //         where: {
        //             organization_id,
        //             status: 1,
        //         },
        //         attributes: ['id', 'provider_id', 'status'],
        //         include: [{
        //             model: OrganizationProvidersCredentialsEntity,
        //             attributes: ['id', 'creds'],
        //             all: true
        //         }],
        //         raw: true,
        //         nest: true
        //     });
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
