import { IResponse } from '../../../../common/interfaces/response.interface';
import { EActivityDataStatus } from '../../../../common/enums/activity-data.enum';
import { IActivityUsageData } from '../interfaces/activity-usage-data.interface';
import { UsageActivityDataDTO } from '../dto/usage-activity-data.dto';
import { IDecodedToken } from '../../../../common/interfaces/decoded-token.interface';
import { Injectable, NotAcceptableException } from '@nestjs/common';
import moment = require('moment-timezone');
import { UserActivityDataMongoModel } from 'src/database/mongoose-db/models/user-activity-data.model';
import { ResponseHelperService } from 'src/common/helper/response.helper.service';
import { validateActivityDataSchema } from '../validation/user-activity.validation';
import { Logger } from '../../../../common/errlogger/logger';
import configFile from "../../../../../../config/config.js";

@Injectable()
export class ActivityService {
    constructor(
        private readonly userActivityDataMongoModel: UserActivityDataMongoModel,
        private readonly responseHelperService: ResponseHelperService,
        private readonly logger: Logger,
    ) { }

    async insertUsageDataHandler(userData: IDecodedToken, activityData: UsageActivityDataDTO, userAgent: string, ip: string): Promise<IResponse> {
        // console.log('-e-', userData.employee_id, '-d-', new Date(), ' === Activity received === ', '-em-', userData.email, '-f-', activityData.data.length);
        if(configFile.DISABLE_TIMESHEET_ACTIVITY_TRACKING.includes(+userData.organization_id)) return this.responseHelperService.sendResponse(200, 'Data saved', null, { inserted: 1 });
        // Vaidating all the datas
        if (process.env.ENABLE_VALIDATION === 'true') {
            try {
                activityData = await validateActivityDataSchema.validateAsync(activityData);
            } catch (error) {
                throw new NotAcceptableException(error.details[0].message);
            }
        }

        // extracting session data from the request object 
        let arrayData: IActivityUsageData[] = activityData.data;
        arrayData = arrayData.filter(i => Object.keys(i).length !== 0);

        if (arrayData.constructor !== Array || arrayData.length === 0) {
            throw new NotAcceptableException('Data should be passed in array');
        }

        try {
            let finalData: IActivityUsageData[] = null;
            // Check the first elemnt from the array if uts already inserted in db or not.
            const alreadyData: any = await this.userActivityDataMongoModel.getOnlyIdBasedOnDataIdAndUserIdAndAdminId(userData.employee_id, userData.organization_id, arrayData[0].dataId);
            if (alreadyData) {
                const lastInsertedTimeWithModeEndSeconds = moment(alreadyData.dataId).add(alreadyData.mode.end, 'seconds');
                // Prepare payload fro mongo db insertion
                finalData = arrayData.map((item: IActivityUsageData) => {
                    console.log('----------curr=--------------', moment(item.dataId).format('YYYY-MM-DD HH:mm:ss Z'));
                    console.log('----------last=--------------', lastInsertedTimeWithModeEndSeconds.format('YYYY-MM-DD HH:mm:ss Z'));
                    console.log('----------Diff=--------------', moment(item.dataId).diff(lastInsertedTimeWithModeEndSeconds))
                    if (moment(item.dataId).diff(lastInsertedTimeWithModeEndSeconds) >= 0)
                        // if (lastInsertedTimeWithModeEndSeconds.diff(moment(item.dataId), 'milliseconds') > 0)
                        return {
                            adminId: userData.organization_id,
                            userEmail: userData.email,
                            userId: userData.employee_id,
                            timezone: userData.timezone,

                            systemTimeUtc: item.systemTimeUtc,
                            dataId: item.dataId,
                            date: moment(item.dataId).format('DD-MM-YYYY'),
                            time: moment(item.dataId).format('HH:mm:ss'),

                            taskNote: item.taskNote || '',
                            appVersion: userAgent,

                            timestampActual: Number(moment(item.systemTimeUtc).format('X')),
                            timestampServer: Number(moment().format('X')),
                            timestampInUtc: Number(moment().utc().format('X')),

                            projectId: item.projectId || 0,
                            taskId: item.taskId || 0,
                            // breakInSeconds: 0,//item.breakInSeconds || 0,
                            breakInSeconds: item.breakInSeconds || 0,

                            clicksCount: item.clicksCount,
                            fakeActivitiesCount: item.fakeActivitiesCount,
                            keysCount: item.keysCount,
                            movementsCount: item.movementsCount,

                            activityPerSecond: {
                                buttonClicks: item.activityPerSecond.buttonClicks,
                                fakeActivities: item.activityPerSecond.fakeActivities,
                                keystrokes: item.activityPerSecond.keystrokes,
                                mouseMovements: item.activityPerSecond.mouseMovements,
                            },
                            mode: {
                                name: item.mode.name,
                                start: item.mode.start,
                                end: item.mode.end
                            },
                            appUsage: item.appUsage,
                            status: EActivityDataStatus.active
                        };
                }).filter(i => i);
            } else {
                finalData = arrayData.map((item: IActivityUsageData) => {
                    return {
                        adminId: userData.organization_id,
                        userEmail: userData.email,
                        userId: userData.employee_id,
                        timezone: userData.timezone,

                        systemTimeUtc: item.systemTimeUtc,
                        dataId: item.dataId,
                        date: moment(item.dataId).format('DD-MM-YYYY'),
                        time: moment(item.dataId).format('HH:mm:ss'),

                        taskNote: item.taskNote || '',
                        appVersion: userAgent,

                        timestampActual: Number(moment(item.systemTimeUtc).format('X')),
                        timestampServer: Number(moment().format('X')),
                        timestampInUtc: Number(moment().utc().format('X')),

                        projectId: item.projectId || 0,
                        taskId: item.taskId || 0,
                        // breakInSeconds: 0,//item.breakInSeconds || 0,
                        breakInSeconds: item.breakInSeconds || 0,

                        clicksCount: item.clicksCount,
                        fakeActivitiesCount: item.fakeActivitiesCount,
                        keysCount: item.keysCount,
                        movementsCount: item.movementsCount,

                        activityPerSecond: {
                            buttonClicks: item.activityPerSecond.buttonClicks,
                            fakeActivities: item.activityPerSecond.fakeActivities,
                            keystrokes: item.activityPerSecond.keystrokes,
                            mouseMovements: item.activityPerSecond.mouseMovements,
                        },
                        mode: {
                            name: item.mode.name,
                            start: item.mode.start,
                            end: item.mode.end
                        },
                        appUsage: item.appUsage,
                        status: EActivityDataStatus.active
                    };
                });
            }
            // neglect session if more than two days
            finalData = finalData.filter((item: IActivityUsageData) => {
                const systemTime = moment(item.systemTimeUtc);
                const currentTime = moment().utc();
                return !(systemTime.diff(currentTime, 'days') > 2);
            });

            // Insert in mongo db with bulk insertion mongoose api
            try {
                const result: any = await this.userActivityDataMongoModel.insert(finalData);
                return this.responseHelperService.sendResponse(200, 'Data saved', null, { inserted: result.length });
            } catch (error) {
                // this.logger.logger.error(`-------------${JSON.stringify(error)}`);
                return this.responseHelperService.sendResponse(400, 'Error in inserting data', error.message, null);
            }
        } catch (error) {
            return this.responseHelperService.sendResponse(400, 'Error in checking old data', error, null);
        }
    }
}
