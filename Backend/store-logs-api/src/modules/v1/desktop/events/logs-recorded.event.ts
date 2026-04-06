import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { On } from 'nest-event';
import { EventEmitter } from 'events';
import { IActivityUsageData } from '../interfaces/activity-usage-data.interface';
import moment = require('moment-timezone');
import { EmployeeAttendanceModel } from 'src/database/sequelize-db/models/employee-attendance.model';
import { forEachSeries } from 'async';
import { IDecodedToken } from 'src/common/interfaces/decoded-token.interface';
import { timesByDate } from '../utils/shift.util';
import { Logger } from '../../../../common/errlogger/logger';
import { RedisService } from 'nestjs-redis';

const { MongoClient } = require('mongodb');

import { NestEventEmitter } from 'nest-event';

const configFile = require('../../../../../../config/config.js');

@Injectable()
export class DataLogEventHandler extends EventEmitter {
    constructor(
        private readonly httpService: HttpService,
        private readonly empAttendanceModel: EmployeeAttendanceModel,
        private readonly redisService: RedisService,
        private readonly logger: Logger,
        private readonly emitter: NestEventEmitter,
    ) { 
        super();
        this.setMaxListeners(0);
    }

    async updateActivityAndUsage(data: IActivityUsageData[], timezone: string, userData: IDecodedToken) {
        for (const item of data) {
            let params = {};
            try {
                if (!item.attendanceDate) continue;
                params = {
                    attendanceDate: item.attendanceDate,
                    secondAttendanceDate: item.secondAttendanceDate,
                    systemTimeUtcDayOneEnd: item.systemTimeUtcDayOneEnd,
                    organization_id: item.adminId,
                    task_id: item.taskId <= 0 ? 0 : item.taskId,
                    project_id: item.projectId <= 0 ? 0 : item.projectId,
                    employee_id: item.userId,
                    break_duration: item.breakInSeconds,
                    appUsage: item.appUsage.map((elem, index) => {
                        return {
                            app: elem.app || '',
                            start: elem.start,
                            end: index + 1 === item.appUsage.length && elem.end == 0 ? item.mode.end : elem.end,
                            url: elem.url,
                            keystrokes: elem.keystrokes,
                            title: elem.title
                        }
                    }),
                    activityPerSecond: item.activityPerSecond,
                    systemTimeUtc: item.systemTimeUtc,
                    email: item.userEmail,
                    timezone,
                    timesheetIdleTime: userData.setting.timesheetIdleTime ? userData.setting.timesheetIdleTime : '00:00',
                    productivityCategory: Number(userData.productivityCategory ?? 0),
                }
                const res = await this.httpService.post(process.env.ACTIVITY_PRODUCTIVITY_URL, params).toPromise();
                console.log(res.data.message)
            } catch (err) {
                await this.FailedDataPushFun(params);
                console.error("---------Error in updating activities stats--------");
            }
        }
    }

    async FailedDataPushFun(params: any) {
        try{
            const client = new MongoClient(process.env.MONGO_URI, { useUnifiedTopology: true });
            await client.connect();
            const db = client.db(process.env.MONGO_DB_NAME);
            const collection = db.collection('failedactivitydatas');
            const insertResult = await collection.insertMany([params]);
            client.close();
            let data = await this.redisService.getClient().get('failedDataCronJobs');
            if (!data || +data == 0) {
                try {
                    const res = await this.httpService.get(process.env.CRONS_JOBS_URL, params).toPromise();
                } catch (error) {
                    this.logger.logger.error(`-------------Cron Not Started----------------`);
                }
            }
        }
        catch (err) {
            this.logger.logger.error(`-------------Data Got Lost for Employee Id ${params.employee_id} ${params.email}----------------`);
            this.logger.logger.error(`-------------Data Got Lost for Employee Id ${params.employee_id} ${params.email}----------------`);
        }
    }

    async updateAttendance(dataObjectToUpdate: any, endDate: any, details: String) {
        await dataObjectToUpdate.update({ end_time: endDate.format('YYYY-MM-DD HH:mm:ss'), details });
    }

    async updateAttendanceISO(dataObjectToUpdate: any, endDate: any, details: String) {
        await dataObjectToUpdate.update({ end_time: endDate, details });
    }

    async getMaxLogoutTime(sysTimeUtc: any, userData: IDecodedToken, previousLoginTime: any, previousLogoutTime: any, startDate: any, date: any) {
        //shift logout is more than  day end than take shift end as logout/
        let maxLogoutTime = moment(sysTimeUtc);
        let shift;
        if (userData.setting.trackingMode == 'fixed') {
            shift = await timesByDate(userData.setting.tracking.fixed, date, userData.timezone);
        } else if (userData.shift) {
            shift = await timesByDate(userData.shift, date, userData.timezone);
        }

        const setting = userData.logoutOptions || {
            option: 2,
            specificTimeUTC: '00:00',
            specificTimeUser: '00:00',
            afterFixedHours: 10
        };
        switch (+setting.option) {
            case 1: {
                if (setting.specificTimeUTC === '00:00') {
                    maxLogoutTime = previousLoginTime.clone().endOf('day');
                } else {
                    const timeSpecified = setting.specificTimeUTC.split(':');
                    maxLogoutTime = previousLoginTime.clone().set({ hours: parseInt(timeSpecified[0]), minutes: parseInt(timeSpecified[1]), seconds: 0 });
                }
                break;
            }
            case 2: {
                if (setting.specificTimeUser === '00:00') {
                    maxLogoutTime = previousLoginTime.clone().tz(userData.timezone).endOf('day').utc();
                    if (shift && shift.start && moment(shift.end).isAfter(maxLogoutTime)) {
                        maxLogoutTime = shift.end;
                    }
                    // maxLogoutTime = maxLogoutTime.clone().utc();
                } else {
                    const timeSpecified = setting.specificTimeUser.split(':');
                    maxLogoutTime = previousLoginTime.clone().tz(userData.timezone).set({ hours: parseInt(timeSpecified[0]), minutes: parseInt(timeSpecified[1]), seconds: 59 }).utc();
                    if (shift && shift.start && moment(shift.end).isAfter(maxLogoutTime)) {
                        maxLogoutTime = shift.end;
                    }
                    // maxLogoutTime = maxLogoutTime.clone().utc();
                }
                break;
            }
            case 3: {
                maxLogoutTime = previousLoginTime.add(1, 'day');
                break;
            }
            case 4: {
                if ((previousLogoutTime.tz(userData.timezone).date() < startDate.tz(userData.timezone).date()) && startDate.diff(previousLogoutTime) >= setting.afterFixedHours) {
                    maxLogoutTime = previousLogoutTime;
                } else {
                    maxLogoutTime = previousLoginTime.add(1, 'day');
                }
                break;
            }
            default:
                break;
        }
        return maxLogoutTime;
    }

    @On('data-receieved-for-logs')
    async updateToken(data: IActivityUsageData[], userData: IDecodedToken, ip: string): Promise<any> {
        // make session
        try {
            for (const item of data) {
                try {
                    // Update when Matched with UTC time (provided in settings)
                    // Update when time matched with User specific timzone ....from setting
                    // Update after every 24 hrs based on login - login time
                    // Update after specific hr in seeting or if login - login is more than 24hrs and on day change

                    // calculate inital values for required properties
                    const startDate = moment(item.systemTimeUtc);
                    const startTime = moment(item.systemTimeUtc);
                    const endDate = moment(item.systemTimeUtc).add(
                        item.activityPerSecond.buttonClicks.length > 900 ? 180 : item.activityPerSecond.buttonClicks.length,
                        'seconds'
                    );

                    // Get perticular date's attendance of a user
                    const previousAttendanceRawData = await this.empAttendanceModel.getLastInsertedAttendanceLastInserted(
                        item.userId,
                        startDate.format('YYYY-MM-DD')
                    );

                    if(configFile.AUTO_SHIFT_FEATURES.includes(item.adminId)) {
                        if(previousAttendanceRawData){
                            const previousAttendanceData: any = previousAttendanceRawData.toJSON();
                            let {start_time: previous_start_time, end_time: previous_end_time, date: previousAttendanceDate} = previousAttendanceData;
                            // If difference between previous_end_time and current_start_time is more than 4 hrs then make a new attendance for the user
     
                            const details = previousAttendanceRawData.details ? JSON.stringify({ ...JSON.parse(previousAttendanceRawData.details), checkOutIp: ip }) : JSON.stringify({ checkInIp: ip, checkOutIp: ip });
                            if(startTime.diff(moment(previousAttendanceData.end_time), 'second') > 14400) {
                                const start = moment.utc(previous_end_time).tz(item.timezone);
                                const end = moment.utc(item.systemTimeUtc).tz(item.timezone);
                                const isSameDay = start.isSame(end, 'day');
                                let tempDate:any ;
                                if(moment(previousAttendanceDate).format('YYYY-MM-DD') !== startDate.tz(userData.timezone).format('YYYY-MM-DD')) tempDate = startDate.tz(userData.timezone).format('YYYY-MM-DD');
                                else tempDate = startDate.tz(userData.timezone).add(1, 'day').format('YYYY-MM-DD');

                                if(isSameDay) {
                                    await this.empAttendanceModel.insertAttendance(
                                        item.userId, item.adminId,
                                        tempDate,
                                        startTime.toISOString(),
                                        endDate.toISOString(),
                                        JSON.stringify({ checkInIp: ip, checkOutIp: ip})
                                    );
                                    item.attendanceDate = tempDate;
                                }
                                else {
                                    await this.empAttendanceModel.insertAttendance(
                                        item.userId, item.adminId,
                                        startDate.tz(userData.timezone).format('YYYY-MM-DD'),
                                        startTime.toISOString(),
                                        endDate.toISOString(),
                                        JSON.stringify({ checkInIp: ip, checkOutIp: ip }));
                                    item.attendanceDate = startDate.tz(userData.timezone).format('YYYY-MM-DD');
                                }
                            }
                            else {
                                const previousEndTime = moment(previousAttendanceData.end_time);
                                if (endDate.isBefore(previousEndTime)) {
                                    this.logger.logger.warn(`Skipped out-of-order auto-shift log for employee ${item.userId} (org ${item.adminId})`);
                                    continue;
                                }
                                await this.updateAttendanceISO(previousAttendanceRawData, endDate.toISOString(), details);
                                item.attendanceDate = previousAttendanceDate;
                            }
                        } else {
                            await this.empAttendanceModel.insertAttendance(
                                item.userId, item.adminId,
                                startDate.tz(userData.timezone).format('YYYY-MM-DD'),
                                startTime.toISOString(),
                                endDate.toISOString(),
                                JSON.stringify({ checkInIp: ip, checkOutIp: ip }));
                            item.attendanceDate = startDate.tz(userData.timezone).format('YYYY-MM-DD');
                        }
                        continue;
                    }

                    if (previousAttendanceRawData) {
                        const previousAttendanceData: any = previousAttendanceRawData.toJSON();
                        const previousLoginTime = moment(previousAttendanceData.start_time);
                        const previousLogoutTime = moment(previousAttendanceData.end_time);
                        const date = moment(previousAttendanceRawData.date).format('YYYY-MM-DD');
                        const details = previousAttendanceRawData.details ? JSON.stringify({ ...JSON.parse(previousAttendanceRawData.details), checkOutIp: ip }) : JSON.stringify({ checkInIp: ip, checkOutIp: ip });
                        if (startDate.isBefore(previousLoginTime)) continue;
                        // get max logout data from setting and its relevant options
                        const maxLogoutTime = await this.getMaxLogoutTime(item.systemTimeUtc, userData, previousLoginTime, previousLogoutTime, startDate, date);
                        if (startDate.diff(maxLogoutTime) > 0) {
                            if (startDate == previousAttendanceData.date) {
                                startDate.add(1, 'day');
                            }
                            try {
                                await this.empAttendanceModel.insertAttendance(
                                    item.userId, item.adminId,
                                    startDate.tz(userData.timezone).format('YYYY-MM-DD'),
                                    startTime.format('YYYY-MM-DD HH:mm:ss'),
                                    endDate.format('YYYY-MM-DD HH:mm:ss'),
                                    JSON.stringify({ checkInIp: ip, checkOutIp: ip }));
                                    if(configFile.EXTERNAL_CLOCKINOUT_CALL.includes(userData.organization_id)) this.emitter.emit('clock-in-clock-out-update-api-request', "insert", startDate.tz(userData.timezone).format('YYYY-MM-DD'), startTime.toISOString(), endDate.toISOString(), userData);
                                item.attendanceDate = startDate.tz(userData.timezone).format('YYYY-MM-DD');
                            } catch (error) {
                                if(error.original.sqlMessage.includes("Duplicate entry")) {
                                    await this.updateAttendance(previousAttendanceRawData, endDate, details);
                                    item.attendanceDate = moment(previousAttendanceRawData.date).format('YYYY-MM-DD');
                                    if(configFile.EXTERNAL_CLOCKINOUT_CALL.includes(userData.organization_id)) this.emitter.emit('clock-in-clock-out-update-api-request', "update", moment(previousAttendanceRawData.date).format('YYYY-MM-DD'), '', endDate.toISOString(), userData);
                                }
                                else throw error;
                            }
                        } else {

                            if (maxLogoutTime.diff(endDate) > 0) { // If maxLogoutTime is greater than endDate
                                // Update endDate as logout time for previous login
                                await this.updateAttendance(previousAttendanceRawData, endDate, details);
                                item.attendanceDate = moment(previousAttendanceRawData.date).format('YYYY-MM-DD');
                                if(configFile.EXTERNAL_CLOCKINOUT_CALL.includes(userData.organization_id)) this.emitter.emit('clock-in-clock-out-update-api-request', "update", moment(previousAttendanceRawData.date).format('YYYY-MM-DD'), '', endDate.toISOString(), userData);
                            } else {
                                //update maxLogoutTime as logout time for previous login
                                maxLogoutTime.add(1, 'seconds');
                                await this.updateAttendance(previousAttendanceRawData, maxLogoutTime.tz('Africa/Abidjan'), details);

                                // Create new day with below values
                                // StartDate will be maxLogoutTime + 1 Second
                                // EndDate will be end Date
                                item.systemTimeUtcDayOneEnd = maxLogoutTime.tz('Africa/Abidjan').toISOString();

                                if (userData.setting.trackingMode == 'fixed') {
                                    let shift;
                                    shift = await timesByDate(userData.setting.tracking.fixed, maxLogoutTime.tz(userData.timezone).format('YYYY-MM-DD'), userData.timezone);
                                    if (shift.start) {
                                        if (!(maxLogoutTime.isBetween(shift.start, shift.end))) continue;
                                    } else if (!shift.start) continue;
                                }
                                await this.empAttendanceModel.insertAttendance(
                                    item.userId, item.adminId,
                                    maxLogoutTime.tz(userData.timezone).format('YYYY-MM-DD'),
                                    maxLogoutTime.utc().format('YYYY-MM-DD HH:mm:ss'),
                                    endDate.format('YYYY-MM-DD HH:mm:ss'),
                                    JSON.stringify({ checkInIp: ip, checkOutIp: ip }));
                                item.attendanceDate = moment(previousAttendanceRawData.date).format('YYYY-MM-DD');
                                item.secondAttendanceDate = maxLogoutTime.tz(userData.timezone).format('YYYY-MM-DD');
                                if(configFile.EXTERNAL_CLOCKINOUT_CALL.includes(userData.organization_id)) this.emitter.emit('clock-in-clock-out-update-api-request', "insert", maxLogoutTime.tz(userData.timezone).format('YYYY-MM-DD'), maxLogoutTime.utc().toISOString(), endDate.toISOString(), userData);
                                item.secondAttendanceDate = maxLogoutTime.tz(userData.timezone).format('YYYY-MM-DD');
                                item.attendanceDate = moment(previousAttendanceRawData.date).format('YYYY-MM-DD');
                            }
                        }
                    } else {
                        // Insert a new entry with current attendance details, no manipulation needed
                        await this.empAttendanceModel.insertAttendance(
                            item.userId, item.adminId,
                            startDate.tz(userData.timezone).format('YYYY-MM-DD'),
                            startTime.format('YYYY-MM-DD HH:mm:ss'),
                            endDate.format('YYYY-MM-DD HH:mm:ss'),
                            JSON.stringify({ checkInIp: ip, checkOutIp: ip }));
                        item.attendanceDate = startDate.tz(userData.timezone).format('YYYY-MM-DD');
                        if(configFile.EXTERNAL_CLOCKINOUT_CALL.includes(userData.organization_id)) this.emitter.emit('clock-in-clock-out-update-api-request', "insert", startDate.tz(userData.timezone).format('YYYY-MM-DD'), startTime.toISOString(), endDate.toISOString(), userData);
                    }
                } catch (err) {
                    console.log('--err--', err.message);
                }
            }
            await this.updateActivityAndUsage(data, userData.timezone, userData);
        } catch (err) {
            return console.log('--err--', err.message);
        }

        // forEachSeries(data, (item, iterator) => {
        //     (async () => {
        //         // Update when Matched with UTC time (provided in settings)
        //         // Update when time matched with User specific timzone ....from setting
        //         // Update after every 24 hrs based on login - login time
        //         // Update after specific hr in seeting or if login - login is more than 24hrs and on day change

        //         // calculate inital values for required properties
        //         const startDate = moment(item.systemTimeUtc);
        //         const startTime = moment(item.systemTimeUtc);
        //         const endDate = moment(item.systemTimeUtc).add(
        //             item.activityPerSecond.buttonClicks.length > 900 ? 180 : item.activityPerSecond.buttonClicks.length,
        //             'seconds'
        //         );

        //         // Get perticular date's attendance of a user
        //         const previousAttendanceRawData = await this.empAttendanceModel.getLastInsertedAttendanceLastInserted(
        //             item.userId,
        //             startDate.format('YYYY-MM-DD')
        //         );

        //         if (previousAttendanceRawData) {
        //             const previousAttendanceData: any = previousAttendanceRawData.toJSON();
        //             const previousLoginTime = moment(previousAttendanceData.start_time);
        //             const previousLogoutTime = moment(previousAttendanceData.end_time);
        //             const date = moment(previousAttendanceRawData.date).format('YYYY-MM-DD');

        //             // get max logout data from setting and its relevant options
        //             const maxLogoutTime = await this.getMaxLogoutTime(item.systemTimeUtc, userData, previousLoginTime, previousLogoutTime, startDate, date);

        //             if (startDate.diff(maxLogoutTime) > 0) {
        //                 if (startDate == previousAttendanceData.date) {
        //                     startDate.add(1, 'day');
        //                 }
        //                 await this.empAttendanceModel.insertAttendance(
        //                     item.userId, item.adminId,
        //                     startDate.tz(userData.timezone).format('YYYY-MM-DD'),
        //                     startTime.format('YYYY-MM-DD HH:mm:ss'),
        //                     endDate.format('YYYY-MM-DD HH:mm:ss'));

        //                 item.attendanceDate = startDate.tz(userData.timezone).format('YYYY-MM-DD');
        //                 iterator();
        //             } else {

        //                 if (maxLogoutTime.diff(endDate) > 0) { // If maxLogoutTime is greater than endDate
        //                     // Update endDate as logout time for previous login
        //                     await this.updateAttendance(previousAttendanceRawData, endDate);
        //                     item.attendanceDate = moment(previousAttendanceRawData.date).format('YYYY-MM-DD');
        //                     iterator();
        //                 } else {
        //                     //update maxLogoutTime as logout time for previous login
        //                     await this.updateAttendance(previousAttendanceRawData, maxLogoutTime.tz('Africa/Abidjan'));

        //                     // Create new day with below values
        //                     // StartDate will be maxLogoutTime + 1 Second
        //                     // EndDate will be end Date
        //                     maxLogoutTime.add(1, 'seconds')
        //                     await this.empAttendanceModel.insertAttendance(
        //                         item.userId, item.adminId,
        //                         maxLogoutTime.tz(userData.timezone).format('YYYY-MM-DD'),
        //                         maxLogoutTime.utc().format('YYYY-MM-DD HH:mm:ss'),
        //                         endDate.format('YYYY-MM-DD HH:mm:ss'));
        //                     item.attendanceDate = maxLogoutTime.tz(userData.timezone).format('YYYY-MM-DD');
        //                     iterator();
        //                 }
        //             }
        //         } else {
        //             // Insert a new entry with current attendance details, no manipulation needed
        //             await this.empAttendanceModel.insertAttendance(
        //                 item.userId, item.adminId,
        //                 startDate.tz(userData.timezone).format('YYYY-MM-DD'),
        //                 startTime.format('YYYY-MM-DD HH:mm:ss'),
        //                 endDate.format('YYYY-MM-DD HH:mm:ss'));
        //             item.attendanceDate = startDate.tz(userData.timezone).format('YYYY-MM-DD');
        //             iterator();
        //         }
        //     })();
        // }, err => {
        //     if (err) return console.log('--err--', err.message);
        //     this.updateActivityAndUsage(data, userData.timezone);
        // });
    }
}

// const item = {
//     systemTimeUtc: "2020-06-09T20:05:44Z"
// };
// console.log('===========================================')
// console.log(moment(item.systemTimeUtc).get('date'))
// console.log(moment(item.systemTimeUtc).utc().get('date'))
// console.log('===========================================')