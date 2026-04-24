// @ts-nocheck
import { Injectable } from "@nestjs/common";
import moment = require('moment-timezone');
import { IDecodedToken } from '../../../../common/interfaces/decoded-token.interface';
import { ResponseHelperService } from 'src/common/helper/response.helper.service';
import { IResponse } from '../../../../common/interfaces/response.interface';
import { ProductionStatsModel } from 'src/database/sequelize-db/models/production-stats.model';



@Injectable()
export class ProductionStatsService {
    constructor(
        private readonly responseHelperService: ResponseHelperService,
        private readonly productionStatsModel: ProductionStatsModel
    ) { }

    async getProductionStarts(userData: IDecodedToken): Promise<IResponse> {
        let day = '2020-10-12'
        const productionStarts = await this.productionStatsModel.getproductionStartData(userData.employee_id);
        return productionStarts;
    }
}


let getProductionStarts = async (userData: IDecodedToken, sessions: any): Promise<any> => {
    // moment.tz.setDefault('Africa/Bamako');
    // let { sessions } =activityData;

    const user = userData;
    if (!user || !user.employee_id || !user.organization_id) {
        return { code: 400, error: 'Check session id', data: null, message: 'User/Admin id is missing' };
    }


    if (!sessions || sessions.length === 0) {
        return { code: 400, error: 'No sesions data', data: null, message: 'Sessions data is missing' };
    }

    // try {
    //     ProductionStatsService.insertInRawDataTable(user.employee_id, user.organization_id, JSON.stringify(sessions))
    //         .then(data => { }).catch(err => { });
    // } catch (err) { console.log('--err--', err); }

    try {
        // await JoiValidateProductionStats.validateAsync(req.body);

        const userId = user.employee_id;
        const adminId = user.organization_id;
        const email = user.email;
        const errors = [], success = [];
        const dbOperations = {};
        let login_time = null;
        let logout_time = null;
        let day = null;
        let login_day = null;
        let working_hours = null;
        let non_working_hours = null;
        let total_hours = null;
        let is_report_generated = null;
        let newEntryMade = 0;
        let log_sheet_id = null;
        let existingData = false;
        let insertData = [];
        let t_sec = 0;
        let w_sec = 0;
        let n_sec = 0;

        // get last inserted data from db
        // GET HERE LAST INSERTED DATA IN PRODUCTION_STATS TABLE FOR THAT USER AND ADMIN
        //  AND ASSIGN THE VALUE IN productionStatData variable
        const columns = `*`;
        const filter = `user_id = ${userId} AND admin_id = ${adminId}`;
        // const { getError, productionStatData } = await ProductionStatsService.getProductionStatKamal(filter, columns);
        const productionStatData = await this.productionStatsModel.getproductionStartData(userData.employee_id);

        // loop the request session data
        // Check difference in loop start time and server logout_time
        // Check if day is changed for loop start time and server login_time
        // If difference is more than 8 hours and day is changed create new entry with lop start time as login time
        // If condition fails, update current data, set logout time as loop end_time, add active  seconds to
        // working hours, acc calc total working and non working

        if (productionStatData && productionStatData.length > 0) {
            existingData = true;
            login_time = moment(productionStatData[0].login_time).tz('Africa/Bamako');
            logout_time = moment(productionStatData[0].logout_time).tz('Africa/Bamako');
            day = productionStatData[0].day;
            working_hours = productionStatData[0].working_hours;
            non_working_hours = productionStatData[0].non_working_hours;
            total_hours = productionStatData[0].total_hours;
            is_report_generated = productionStatData[0].is_report_generated;
            log_sheet_id = productionStatData[0].log_sheet_id;
            t_sec = productionStatData[0].t_sec;
            w_sec = productionStatData[0].w_sec;
            n_sec = productionStatData[0].n_sec;
        }

        for (let i = 0; i < sessions.length; i++) {
            if (!existingData) {
                login_time = moment(sessions[i].startTime).tz('Africa/Bamako');
                login_day = login_time.clone().tz(user.timezone).format('YYYY-MM-DD');
                logout_time = moment(sessions[i].endTime).tz('Africa/Bamako');
                day = login_day;// || login_time.format("YYYY-MM-DD");

                let dateDifference = moment.duration(logout_time.diff(login_time)).asSeconds();
                if (sessions[i].activeSeconds > dateDifference) { sessions[i].activeSeconds = dateDifference; }


                t_sec = moment.duration(logout_time.diff(login_time)).asSeconds();
                w_sec = w_sec + sessions[i].activeSeconds;
                n_sec = t_sec - w_sec;

                total_hours = moment().set({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, date: 1, month: 1, year: 2020 }).add(moment.duration(logout_time.diff(login_time)), 'milliseconds').format('HH:mm:ss');//.format("HH:mm:ss"); //Need to give proper format
                working_hours = moment().set({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, date: 1, month: 1, year: 20200 }).add(sessions[i].activeSeconds, 'seconds').format('HH:mm:ss');
                non_working_hours = moment().set({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, date: 1, month: 1, year: 2020 }).add(moment.duration(logout_time.diff(login_time)), 'milliseconds').subtract(sessions[i].activeSeconds, 'seconds').format('HH:mm:ss');

                newEntryMade = 1;


                is_report_generated = 0;
                log_sheet_id = email + day;
                dbOperations[`${log_sheet_id}`] = {
                    'type': 'insert', 'data': {
                        login_time: login_time.format('YYYY-MM-DD HH:mm:ss'),
                        log_sheet_id,
                        logout_time: logout_time.format('YYYY-MM-DD HH:mm:ss'),
                        total_hours,
                        day,
                        working_hours,
                        non_working_hours,
                        t_sec,
                        w_sec,
                        n_sec
                    }
                };
                existingData = true;
            } else {
                let loopStartDate = moment(sessions[i].startTime).tz('Africa/Bamako'); //Need to give proper format
                let loopStartDay = moment(sessions[i].startTime).tz('Africa/Bamako').format('YYYY-MM-DD'); //Need to give proper format
                let loopEndDate = moment(sessions[i].endTime).tz('Africa/Bamako'); //Need to give proper format
                let TimeDifference = moment.duration(loopStartDate.diff(logout_time)).asHours(); //Need to give proper format


                if ((TimeDifference > 8 && loopStartDay !== day) || moment.duration(loopStartDate.diff(login_time)).asHours() > 24) { //Need to give proper format
                    if (newEntryMade == 1) {
                        // Handle case when request session data includes data for more than 2 days
                        // Update data for current loop day

                        let update = `
                                    day ="${day}",
                                    login_time ="${login_time}",
                                    logout_time ="${logout_time}",
                                    working_hours ="${working_hours}",
                                    non_working_hours ="${non_working_hours}",
                                    total_hours ="${total_hours}",
                                    is_report_generated =${is_report_generated},
                                    w_sec = ${w_sec},
                                    t_sec = ${t_sec},
                                    n_sec = ${n_sec}
                                `;
                        dbOperations[`${log_sheet_id}`].data = {
                            login_time: login_time.format('YYYY-MM-DD HH:mm:ss'),
                            logout_time: logout_time.format('YYYY-MM-DD HH:mm:ss'),
                            log_sheet_id,
                            total_hours,
                            day,
                            working_hours,
                            non_working_hours,
                            t_sec,
                            w_sec,
                            n_sec
                        };
                    }

                    //Insert data for new day
                    log_sheet_id = email + loopStartDate.format('YYYY-MM-DD'); //Need to give proper format
                    login_time = loopStartDate;
                    logout_time = loopEndDate;

                    let dateDifference = moment.duration(logout_time.diff(login_time)).asSeconds();
                    if (sessions[i].activeSeconds > dateDifference) { sessions[i].activeSeconds = dateDifference; }

                    total_hours = moment().set({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, date: 1, month: 1, year: 2020 }).add(moment.duration(logout_time.diff(login_time)), 'milliseconds').format('HH:mm:ss');//.format("HH:mm:ss"); //Need to give proper format
                    working_hours = moment().set({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, date: 1, month: 1, year: 2020 }).add(sessions[i].activeSeconds, 'seconds').format('HH:mm:ss');
                    non_working_hours = moment().set({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, date: 1, month: 1, year: 2020 }).add(moment.duration(logout_time.diff(login_time)), 'milliseconds').subtract(sessions[i].activeSeconds, 'seconds').format('HH:mm:ss');

                    t_sec = moment.duration(logout_time.diff(login_time)).asSeconds();
                    w_sec = sessions[i].activeSeconds;
                    n_sec = t_sec - w_sec;
                    newEntryMade = 1;

                    // total_hours = t_sec.format('HH:mm:ss');
                    // working_hours = w_sec.format('HH:mm:ss');
                    // non_working_hours = n_sec.format('HH:mm:ss');

                    login_day = moment(sessions[i].startTime).format('YYYY-MM-DD');
                    day = login_day;//loopStartDate.format("YYYY-MM-DD"); //Need to give proper format

                    dbOperations[`${log_sheet_id}`] = {
                        'type': 'insert', 'data': {
                            login_time: login_time.format('YYYY-MM-DD HH:mm:ss'),
                            log_sheet_id,
                            day,
                            logout_time: logout_time.format('YYYY-MM-DD HH:mm:ss'),
                            total_hours,
                            working_hours,
                            non_working_hours,
                            w_sec,
                            n_sec,
                            t_sec,
                        }
                    };

                } else {

                    // return;
                    logout_time = loopEndDate;
                    let tempWorkinHrs = working_hours.split(':');
                    login_day = login_time.clone().tz(user.timezone).format('YYYY-MM-DD');
                    day = login_day;

                    let dateDifference = moment.duration(logout_time.diff(login_time)).asSeconds();
                    if (sessions[i].activeSeconds > dateDifference) { sessions[i].activeSeconds = dateDifference; }

                    total_hours = moment().tz('Africa/Bamako').set({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, date: 1, month: 1, year: 2020 }).add(moment.duration(logout_time.diff(login_time)), 'seconds');//.format("HH:mm:ss"); //Need to give proper format
                    working_hours = moment().set({ hours: tempWorkinHrs[0], minutes: tempWorkinHrs[1], seconds: tempWorkinHrs[2], milliseconds: 0, date: 1, month: 1, year: 2020 }).add(sessions[i].activeSeconds, 'seconds');
                    non_working_hours = moment.duration(total_hours.diff(working_hours)).asSeconds();

                    non_working_hours = moment().set({ hours: 0, minutes: 0, seconds: 0, milliseconds: 0, date: 1, month: 1, year: 2020 }).add(non_working_hours, 'seconds').format('HH:mm:ss');
                    total_hours = total_hours.format('HH:mm:ss');
                    working_hours = working_hours.format('HH:mm:ss');

                    t_sec = moment.duration(logout_time.diff(login_time)).asSeconds();
                    w_sec = w_sec + sessions[i].activeSeconds;
                    n_sec = t_sec - w_sec;

                    if (dbOperations.hasOwnProperty(`${log_sheet_id}`)) {
                        dbOperations[`${log_sheet_id}`].data = {
                            type: log_sheet_id,
                            day,
                            login_time: login_time.format('YYYY-MM-DD HH:mm:ss'),
                            logout_time: logout_time.format('YYYY-MM-DD HH:mm:ss'),
                            total_hours,
                            working_hours,
                            non_working_hours,
                            w_sec: w_sec,
                            n_sec: n_sec,
                            t_sec: t_sec
                        };
                    } else {
                        dbOperations[`${log_sheet_id}`] = {
                            'type': 'update', 'data': {
                                log_sheet_id,
                                day,
                                login_time: login_time.format('YYYY-MM-DD HH:mm:ss'),
                                logout_time: logout_time.format('YYYY-MM-DD HH:mm:ss'),
                                total_hours,
                                working_hours,
                                non_working_hours,
                                w_sec: w_sec,
                                n_sec: n_sec,
                                t_sec: t_sec
                            }
                        };
                    }
                }
            }
        }
        // console.log('========================', dbOperations, '===================================', sessions, user);
        // return
        for (let key in dbOperations) {
            if (dbOperations[key].type === 'update') {
                const updateStatus = await this.productionStatsModel.updateProductionStat(dbOperations[key].data.log_sheet_id, dbOperations[key].data.logout_time, dbOperations[key].data.working_hours, dbOperations[key].data.non_working_hours, dbOperations[key].data.total_hours, dbOperations[key].data.w_sec, dbOperations[key].data.n_sec, dbOperations[key].data.t_sec);

                // let updateStatus = await updateLogInDatabase(dbOperations[key].data, key);

                if (!updateStatus) errors.push(new Error(`Some error occured while updated ${key}`));
                else success.push(updateStatus);
            } else {
                console.log('cacaacaca')
                let tempData = dbOperations[key].data;
                // insertData.push(`(
                //     "${key}",
                //     "${tempData.day}",
                //     "${tempData.login_time}",
                //     "${tempData.logout_time}",
                //     ${userId},
                //     ${adminId},
                //     "${tempData.working_hours}",
                //     ${w_sec},
                //     ${t_sec},
                //     ${n_sec},
                //     "${tempData.non_working_hours}",
                //     "${tempData.total_hours}",
                //     ${0}
                //     )`);
                const insertStatus = await this.productionStatsModel.addProductionStats(key, tempData.day, tempData.login_time, tempData.logout_time, userId, adminId, tempData.working_hours, tempData.non_working_hours, tempData.total_hours, w_sec, t_sec, n_sec);
                success.push(insertStatus);

            }
        }


        // let { insertError, insertStatus } = await ProductionStatsService.insertProductionStatsKamal(insertData.join(','));

        // return;


        // if (errors.length === 0) {
        //     return res.json({ code: 400, error: errors, data: null, message: 'Some error occured in update or insert' });
        // } else {
        return { error: errors, data: success };
        // }    
    } catch (err) {
        return { error: err, data: null };
    }
}

/*
setTimeout(() => {
    getProductionStarts({
        id: 17,
        employee_id: 17,
        organization_id: 7,
        admin_id: 7,
        email: 'sumitsingh@globussoft.in',
        name: 'sumit',
        ip: '127.0.0.1',
    }, [
        {
            activityPerSecond: {
                buttonClicks: [0, 0, 0, 7, 0, 7, 0, 0, 0],
                fakeActivities: [0, 3, 0, 0, 0, 0, 0, 0, 0],
                keystrokes: [1, 7, 3, 0, 5, 6, 8, 4, 7],
                mouseMovements: [3, 4, 4, 2, 0, 0, 0, 3, 0]
            },
            mode: { name: 'computer', start: 0, end: 300 },
            timestampInUtc: 1589545463,
            timestampServer: 1589545463,
            timestampActual: 1585996200,
            projectId: 11,
            taskId: 3,
            breakInSeconds: 300,
            taskNote: 'Some custom text here',
            clicksCount: 14,
            fakeActivitiesCount: 3,
            keysCount: 336,
            movementsCount: 44,
            status: 1,
            _id: '5ebe89f77d586a05809e21fb',
            adminId: 7,
            userEmail: 'sumitsingh@globussoft.in',
            userId: 17,
            systemTimeUtc: '2020-04-04T10:30:00.000Z',
            dataId: '2020-04-04T10:30:00.000Z',
            date: '04-04-2020',
            time: '10:30:00',
            appUsage: [
                { "ageOfData": -1, "app": "AnyDesk", "start": 0, "end": 123, "title": "12345678 - AnyDesk", "url": null, "keystrokes": "asdasdsad" },
                { "ageOfData": -1, "app": "Google Chrome", "start": 123, "end": 256, "title": "JSON Editor Online - view, edit", "url": "https://jsoneditoronline.org", "keystrokes": "qweqwretw" }
            ],
            __v: 0,
            createdAt: '2020-05-15T12:24:23.397Z',
            updatedAt: '2020-05-15T12:24:23.397Z'
        },
        {
            activityPerSecond: {
                buttonClicks: [0, 0, 0, 7, 0, 7, 0, 0, 0],
                fakeActivities: [0, 3, 0, 0, 0, 0, 0, 0, 0],
                keystrokes: [1, 7, 3, 0, 5, 6, 8, 4, 7],
                mouseMovements: [3, 4, 4, 2, 0, 0, 0, 3, 0]
            },
            mode: { name: 'computer', start: 0, end: 300 },
            timestampInUtc: 1589545463,
            timestampServer: 1589545463,
            timestampActual: 1585996200,
            projectId: 11,
            taskId: 3,
            breakInSeconds: 300,
            taskNote: 'Some custom text here',
            clicksCount: 14,
            fakeActivitiesCount: 3,
            keysCount: 336,
            movementsCount: 44,
            status: 1,
            _id: '5ebe89f77d586a05809e21fb',
            adminId: 7,
            userEmail: 'sumitsingh@globussoft.in',
            userId: 17,
            systemTimeUtc: '2020-04-04T10:30:00.000Z',
            dataId: '2020-04-04T10:30:00.000Z',
            date: '04-04-2020',
            time: '10:30:00',
            appUsage: [
                { "ageOfData": -1, "app": "AnyDesk", "start": 0, "end": 123, "title": "12345678 - AnyDesk", "url": null, "keystrokes": "asdasdsad" },
                { "ageOfData": -1, "app": "Google Chrome", "start": 123, "end": 256, "title": "JSON Editor Online - view, edit", "url": "https://jsoneditoronline.org", "keystrokes": "qweqwretw" }
            ],
            __v: 0,
            createdAt: '2020-05-15T12:24:23.397Z',
            updatedAt: '2020-05-15T12:24:23.397Z'
        }
    ]);
}, 5000);



*/
[
    {
        "id": "1589488611.0631332", //==> dataId
        "startTime": "2020-05-14T20:36:51",//==>dataId
        "activeSeconds": 180,//==>get it from getActiveAndInactiveAndTotalSeconds;
        "endTime": "2020-05-14T20:40:52",//==>dataId + total (from getActiveAndInactiveAndTotalSeconds;)
        "dataSubmitted": false
    }
]

// let getActiveAndInactiveAndTotalSeconds = (activityPerSecond) => {
//     let activeSeconds = 0, inactiveSeconds = 0;

//     for (let i = 0; i < activityPerSecond.buttonClicks.length; i++) {
//         if (
//             activityPerSecond.buttonClicks[i] == 0 &&
//             activityPerSecond.fakeActivities[i] == 0 &&
//             activityPerSecond.keystrokes[i] == 0 &&
//             activityPerSecond.mouseMovements[i] == 0
//         ) {
//             inactiveSeconds++;
//         } else {
//             activeSeconds++;
//         }
//     }

//     return { total: activeSeconds + inactiveSeconds, active: activeSeconds, inactive: inactiveSeconds };
// }
