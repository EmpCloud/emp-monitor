// @ts-nocheck
import { Injectable, NotAcceptableException } from '@nestjs/common';
import moment = require('moment-timezone');
import * as _ from 'underscore';

import { IDecodedToken } from '../../../../common/interfaces/decoded-token.interface';
import { IResponse } from '../../../../common/interfaces/response.interface';
import { ResponseHelperService } from 'src/common/helper/response.helper.service';
import { SystemEventsDataDTO } from '../dto/system-logs-data.dto';
import { SystemEventsDTO } from '../dto/system-logs.dto';
import { validateSystemLogsSchema, validateSystemLogDatasSchema } from '../validation/system-logs.validation';
import { UserSystemLogsMongoModel } from 'src/database/mongoose-db/models/user-system-logs.model';

import {
    ISystemEvent,
    ISystemLog,
} from '../interfaces/system-events-data.interface';

const isEnableValid = process.env.ENABLE_VALIDATION === 'true';

import configFile from "../../../../../../config/config.js";
import WebSocketNotification from "./Websocket";
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USERNAME, process.env.MYSQL_PASSWORD, {
    host: process.env.MYSQL_HOST,
    dialect: 'mysql'
});

@Injectable()
export class SystemLogsService {
    constructor(
        private readonly userSystemLogsMongoModel: UserSystemLogsMongoModel,
        private readonly responseHelperService: ResponseHelperService,
    ) { }
    /**
     * Store system logs.
     *
     * @function addSystemLog
     * @memberof SystemLogsService
     * @param {*} userData
     * @param {*} SystemEventsDTO
     * @returns {Object} - Number of record inserted.
     * @see also {@link `${process.env.URL}/api/v1/explorer/#/Desktop/DesktopController_insertSystemEventsData`}
     */
    async addSystemLog(userData: IDecodedToken, data: SystemEventsDTO,): Promise<IResponse> {
        try {
            if(configFile.DISABLE_DLP_LOGS_TRACKING.includes(+userData.organization_id)) return this.responseHelperService.sendResponse(200, 'Data saved', null, {inserted: 1 });

            let logs = [];
            let logsData = isEnableValid
                ? await validateSystemLogDatasSchema.validateAsync(data)
                : data;
            const { employee_id, organization_id, timezone } = userData;

            //make array as unic based on time and description and type
            logsData = logsData.events.reduce((unique, log) => {
                if (!unique.some(sys => sys.dataId === log.dataId && sys.description === log.description && sys.type === log.type)) {
                    unique.push(log);
                }
                return unique;
            }, []);

            let adminUserId = 0;
            if(configFile.USB_ALERT_ADMIN.includes(organization_id)) {
                let [result] = await sequelize.query(`
                        SELECT user_id as admin_id FROM organizations WHERE id=${organization_id}
                    `, 
                    { type: sequelize.QueryTypes.SELECT }
                )
                adminUserId = result.admin_id;
            }

            for (const { dataId, title, description, type, computer } of logsData) {
                if(configFile.USB_ALERT_ADMIN.includes(organization_id) && [2,3,4,5].includes(+type)) {
                    await WebSocketNotification.notificationUninstalledAgent(`User ${userData.first_name + " " +userData.last_name} ${description}`, `${adminUserId}`);
                }
                logs.push({
                    title,
                    type,
                    employee_id: employee_id,
                    organization_id: organization_id,
                    computer,
                    duration: moment.duration(moment(dataId).diff(moment(dataId))),
                    description,
                    start: dataId,
                    end: dataId,
                    date: this.getDate(dataId, timezone),
                });
            }

            const result = await this.userSystemLogsMongoModel.insert(logs);

            return this.responseHelperService.sendResponse(200, 'Data saved', null, {
                inserted: result.length,
            });
        } catch (error) {
            if (error.isJoi) {
                throw new NotAcceptableException(error.details[0].message);
            }
            console.log(error.stack);
            return this.responseHelperService.sendResponse(
                400,
                'Error in inserting data',
                error.message,
                null,
            );
        }
    }
    async insertSystemLog(
        userData: IDecodedToken,
        data: SystemEventsDataDTO,
    ): Promise<IResponse> {
        try {
            const logsData = isEnableValid
                ? await validateSystemLogsSchema.validateAsync(data)
                : data;
            const { employee_id, organization_id, timezone } = userData;
            const dateForSearch = this.getDate(logsData.dataId, timezone);
            const insertedLogsPromise: Promise<ISystemEvent[]> = this.userSystemLogsMongoModel.findLastInserted(
                organization_id,
                employee_id,
                dateForSearch,
            );

            let logs: ISystemLog[] = this.createEventsLogs(logsData, userData);
            const insertedLogs: ISystemEvent[] = await insertedLogsPromise;
            if (!_.isEmpty(insertedLogs)) {
                logs = await this.filtrateLogs(insertedLogs, logs);
            }

            if (_.isEmpty(logs)) {
                return this.responseHelperService.sendResponse(
                    200,
                    'Not new ivents',
                    null,
                    { inserted: 0 },
                );
            }

            const firstNewLog: ISystemLog = _.first(logs);
            const lastOldLog: ISystemEvent = _.last(insertedLogs);

            if (firstNewLog.title === lastOldLog?.title) {
                const isUpdated = await this.updateLastLog(firstNewLog, lastOldLog);
                if (isUpdated) logs.shift();
            }

            if (_.isEmpty(logs)) {
                return this.responseHelperService.sendResponse(
                    200,
                    'Update last log',
                    null,
                    { inserted: 0 },
                );
            }

            const result = await this.userSystemLogsMongoModel.insert(logs);

            return this.responseHelperService.sendResponse(200, 'Data saved', null, {
                inserted: result.length,
            });
        } catch (error) {
            if (error.isJoi) {
                throw new NotAcceptableException(error.details[0].message);
            }
            console.log(error.stack);
            return this.responseHelperService.sendResponse(
                400,
                'Error in inserting data',
                error.message,
                null,
            );
        }
    }

    private addSecToDate(date, s) {
        return moment(date)
            .add(s, 'seconds')
            .toISOString();
    }

    private getBasicLog(
        computer: string,
        employee_id: number,
        organization_id: number,
        timezone: string,
    ) {
        return ({ duration, start, ...properties }) => {
            return {
                computer,
                employee_id,
                organization_id,
                start,
                duration,
                end: this.addSecToDate(start, duration),
                date: this.getDate(start, timezone),
                ...properties,
            };
        };
    }

    private getDate(dateTimeStr, timezone) {
        return moment(dateTimeStr)
            .tz(timezone)
            .format('YYYY-MM-DD');
    }

    private createEventsLogs(
        { events, dataId, device }: SystemEventsDataDTO,
        userData: IDecodedToken,
    ): ISystemLog[] {
        const { employee_id, organization_id, timezone } = userData;
        const logs = [];
        let previosEnd = 0;
        const { name: computer, start: logStart, end: logEnd } = device;
        dataId = logStart === 0 ? dataId : this.addSecToDate(dataId, logStart);

        const getLog = this.getBasicLog(
            computer,
            employee_id,
            organization_id,
            timezone,
        );
        events.forEach((event, index) => {
            let startDate;
            const { title, type, description, start, end } = event;

            if (start !== 0 && previosEnd === 0) {
                logs.push(
                    getLog({
                        title: 'Passive',
                        start: dataId,
                        duration: start,
                    }),
                );
            }

            const eventsTimeDiff = start - previosEnd;
            if (index !== 0 && eventsTimeDiff > 5) {
                const absentDate = this.addSecToDate(dataId, previosEnd);
                logs.push(
                    getLog({
                        title: 'Passive',
                        start: absentDate,
                        duration: eventsTimeDiff,
                    }),
                );
            }

            if (start === 0) {
                startDate = dataId;
            } else {
                startDate = this.addSecToDate(dataId, start);
            }
            previosEnd = end;

            logs.push(
                getLog({
                    start: startDate,
                    type,
                    title,
                    description,
                    duration: end - start,
                }),
            );

            if (index + 1 === events.length && logEnd > end) {
                const lastDate = this.addSecToDate(dataId, end);

                logs.push(
                    getLog({
                        title: 'Passive',
                        start: lastDate,
                        duration: logEnd - end,
                    }),
                );
            }
        });

        return logs;
    }

    private async filtrateLogs(insertedLogs, newLogs) {
        let { end, title } = _.last(insertedLogs);
        const lastDublLogDate = moment(end);
        return newLogs.reduce((acc, log) => {
            if (lastDublLogDate.isSameOrBefore(log.end)) {
                if (title === log.title) {
                    acc.push(log);
                } else {
                    const updatedStart = end;
                    const duration = moment(log.end).diff(updatedStart, 'seconds');
                    acc.push({ ...log, duration, start: updatedStart });
                }
                end = log.end;
            }
            return acc;
        }, []);
    }

    private async updateLastLog(newLog, prevLog): Promise<boolean> {
        const prevLogStart = moment(prevLog.start);
        const newLogEnd = moment(newLog.end);
        const newDuration = newLogEnd.diff(prevLogStart, 'seconds');
        if (newDuration === prevLog.duration) {
            return true;
        }
        if (newDuration > 3600) {
            return false;
        }

        await this.userSystemLogsMongoModel.updateLastLog(
            prevLog._id,
            newDuration,
            newLog.end,
        );

        return true;
    }
}
