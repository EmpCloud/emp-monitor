import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { On } from 'nest-event';
import { EventEmitter } from 'events';
import moment = require('moment-timezone');

import { IDecodedToken } from 'src/common/interfaces/decoded-token.interface';

import { Logger } from '../../../../common/errlogger/logger';

import configFile from "../../../../../../config/config.js";

const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USERNAME, process.env.MYSQL_PASSWORD, {
    host: process.env.MYSQL_HOST,
    dialect: 'mysql',
    logging: false,
});

@Injectable()
export class ExternalRecordedAPICall extends EventEmitter {
    constructor(
        private readonly httpService: HttpService,
        private readonly logger: Logger,
    ) { super(); }
    @On('clock-in-clock-out-update-api-request')
    async recordData(type: string, date: string, start_time: string, end_time: string, userData: IDecodedToken): Promise<any> {
        console.log("--Event for external record update--");
        try {
            let employee_id: Number = userData.employee_id;
            let organization_id: Number = userData.organization_id;

            console.log(date);
            let [resp] = await sequelize.query(`
                    SELECT e.id, e.organization_id, e.emp_code
                    FROM employees e
                    JOIN users u ON e.user_id = u.id
                    WHERE e.organization_id = ${organization_id} AND e.id = ${employee_id}
                `,
                { type: sequelize.QueryTypes.SELECT }
            )


            if(type == "update") {
                const convertedEndTime = moment(end_time).tz(userData.timezone || "UTC").format('HH:mm:ss');
                try {
                    let params = {
                        "Attendance_Date": date,
                        "EMP_ID": resp.emp_code,
                        "Time": convertedEndTime,
                        "Type": "logout"
                    }                    
                    const res = await this.httpService.post(`${configFile.EXTERNAL_CLOCKINOUT_CALL_URL}`, params, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${configFile.EXTERNAL_CLOCKINOUT_CALL_TOKEN}`
                        }
                    }).toPromise();
                    if(res.data.message !== "Data saved sucessfully") {
                        this.logger.logger.error(`-------------Error in External API-------employee id-${employee_id}--${convertedEndTime}------` + res.data.message);
                        return true;
                    } else return true;
                } catch (error) {
                    this.logger.logger.error(`-------------Error in External API----Clock Out---employee id-${employee_id}--${convertedEndTime}------` + error.message);
                    return true;
                }
            }
            else {
                const convertedStartTime = moment(start_time).tz(userData.timezone || "UTC").format('HH:mm:ss');
                const convertedEndTime = moment(end_time).tz(userData.timezone || "UTC").format('HH:mm:ss');
                try {

                    let params = {
                        "Attendance_Date": date,
                        "EMP_ID": resp.emp_code,
                        "Time": convertedStartTime,
                        "Type": "login"
                    }                    
                    let res = await this.httpService.post(`${configFile.EXTERNAL_CLOCKINOUT_CALL_URL}`, params, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${configFile.EXTERNAL_CLOCKINOUT_CALL_TOKEN}`
                        }
                    }).toPromise();
                    if(res.data.message !== "Data saved sucessfully") {
                        this.logger.logger.error(`-------------Error in External API----Clock In---employee id-${employee_id}--${convertedStartTime}------` + res.data.message);
                    }

                    params = {
                        "Attendance_Date": date,
                        "EMP_ID": resp.emp_code,
                        "Time": convertedEndTime,
                        "Type": "logout"
                    }
                    res = await this.httpService.post(`${configFile.EXTERNAL_CLOCKINOUT_CALL_URL}`, params, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `${configFile.EXTERNAL_CLOCKINOUT_CALL_TOKEN}`
                        }
                    }).toPromise();
                    if(res.data.message !== "Data saved sucessfully") {
                        this.logger.logger.error(`-------------Error in External API-----Clock Out--employee id-${employee_id}--${convertedEndTime}------` + res.data.message);
                    }
                    return true;
                } catch (error) {
                    this.logger.logger.error(`-------------Error in External API----Clock In/Out---employee id-${employee_id}--${convertedStartTime}-${convertedEndTime}------` + error.message);
                    return true;
                }
            }
        } catch (err) {
            return console.log('--err--', err.message);
        }
    }
}