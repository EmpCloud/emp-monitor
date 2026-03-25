const { UserActionsLogModel } = require('./UserActionsLogModel');
const { Validation } = require('./Validation');
const sendResponse = require('../../../utils/myService').sendResponse;
const actionsTracker = require('../services/actionsTracker');
const mySql = require('../../../database/MySqlConnection').getInstance();

class Controller {
    static async getUserActivityLog(req, res) {
        if (!req.decoded.is_admin) return sendResponse(res, 403, null, 'Forbidden');

        actionsTracker(req, 'User activity log requested.');

        try {
            const validation = Validation.getUserActivityLogParams(req.query);
            if (validation.error) {
                return sendResponse(res, 404, null, 'Validation Failed.', validation.error.details[0].message);
            }
            const params = validation.value;

            const entities = await UserActionsLogModel.fetchLog(params);
            if (entities.length > 0) {
                return sendResponse(res, 200, entities, 'User Activity Log.', null);
            } else {
                return sendResponse(res, 400, null, 'No User Activity Found.', null);
            }
        } catch (err) {
            return sendResponse(res, 400, null, 'Failed Get User Activity Log.', null);
        }
    }
}

module.exports.Controller = Controller;

const moment = require('moment-timezone');
const toTimezoneDate = (inputDateTime, timezone) => {
    let myDate = moment(inputDateTime);
    let userLocalDate = myDate.tz(timezone).set({
        date: myDate.get('date'),
        month: myDate.get('month'),
        year: myDate.get('year'),
        hour: myDate.get('hour'),
        minute: myDate.get('minute'),
        second: myDate.get('second')
    });
    return userLocalDate.format('YYYY-MM-DD HH:mm:ss');
};
const toTimezoneDateFormat = (inputDateTime, timezone) => {
    let myDate = moment(inputDateTime);
    let userLocalDate = myDate.tz(timezone).set({
        date: myDate.get('date'),
        month: myDate.get('month'),
        year: myDate.get('year'),
        hour: myDate.get('hour'),
        minute: myDate.get('minute'),
        second: myDate.get('second')
    });
    return userLocalDate.format('YYYY-MM-DD');
};
(async () => {
    const _ = require('underscore');
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const moment = require('moment-timezone');

    const users = await mySql.query(`SELECT ur.user_id,u.first_name,u.last_name,e.timezone
                                    FROM user_role ur
                                    JOIN users u ON u.id=ur.user_id
                                    JOIN employees e ON e.user_id=u.id
                                    WHERE ur.role_id=5`);

    const userIds = _.pluck(users, 'user_id');
    console.log('-------------', userIds);
    const logs = await UserActionsLogModel.find({ user_id: { $in: userIds }, path: "/api/v3/auth", createdAt: { $gt: '2020-08-17' } }).lean();
    console.log('-----------', logs)
    logs.map(log => {
        log.user = users.find(u => u.user_id === log.user_id);
        log.time = toTimezoneDate(log.createdAt, log.user.timezone);
        log.date = toTimezoneDateFormat(log.createdAt, log.user.timezone);
        log.first_name = log.user.first_name;
        log.last_name = log.user.last_name;
    })
    const csvWriter = createCsvWriter({
        path: './log_report.csv',
        header: [
            { id: 'first_name', title: 'FIRST NAME' },
            { id: 'last_name', title: 'LAST NAME' },
            { id: 'date', title: 'DATE' },
            { id: 'time', title: 'TIME' }
        ]
    });

    csvWriter.writeRecords(logs)       // returns a promise
        .then(() => {
            console.log('...Done');
        });
});