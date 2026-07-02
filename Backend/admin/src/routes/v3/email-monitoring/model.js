const mySql = require('../../../database/MySqlConnection').getInstance();
const EmployeeEmailMonitoringLogsModel = require('../../../models/employee_email_monitoring.schema');

class EmailMonitoringModel {

    getEmployeeIdsByDepartment(organization_id, department_id) {
        return mySql.query(`SELECT e.id FROM employees e WHERE e.organization_id = ? AND e.department_id = ?`, [organization_id, department_id]);
    }

    getEmployeeIdsByLocation(organization_id, location_id) {
        return mySql.query(`SELECT e.id FROM employees e WHERE e.organization_id = ? AND e.location_id = ?`, [organization_id, location_id]);
    }

    getEmployeeIdsByDepartmentAndLocation(organization_id, department_id, location_id) {
        return mySql.query(`SELECT e.id FROM employees e WHERE e.organization_id = ? AND e.department_id = ? AND e.location_id = ?`, [organization_id, department_id, location_id]);
    }

    getEmailMonitoring(organization_id, employee_ids, employee_id, start_date, end_date, search, type, skip, limit) {
        let match = { organization_id: organization_id };
        if(employee_ids.length) match = { employee_id: { $in: employee_ids }, ...match };
        if(employee_id) match = { employee_id: employee_id, ...match };
        if(start_date && end_date) match = { createdAt: { $gte: new Date(start_date), $lte: new Date(end_date) }, ...match }; // start date is dd-mm-yyyy need to format it for db query 
        if(search) match = { ...match, $or: [{ from: { $regex: search, $options: 'i' } }, { to: { $regex: search, $options: 'i' } }, { subject: { $regex: search, $options: 'i' } }] };
        if(type || type == 0) match = { type: type, ...match };
        return EmployeeEmailMonitoringLogsModel.aggregate([
            { $match: match },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);
    }

    getEmailMonitoringCount(organization_id, employee_ids, employee_id, start_date, end_date, search, type) {
        let match = { organization_id: organization_id };
        if(employee_ids.length) match = { employee_id: { $in: employee_ids }, ...match };
        if(employee_id) match = { employee_id: employee_id, ...match };
        if(start_date) match = { createdAt: { $gte: new Date(start_date) }, ...match };
        if(end_date) match = { createdAt: { $lte: new Date(end_date) }, ...match };
        if(search) match = { ...match, $or: [{ from: { $regex: search, $options: 'i' } }, { to: { $regex: search, $options: 'i' } }, { subject: { $regex: search, $options: 'i' } }] };
        if(type || type == 0) match = { type: type, ...match };
        return EmployeeEmailMonitoringLogsModel.countDocuments(match);
    }

    getEmployeeDetails(organization_id, employee_ids) {
        if(!employee_ids.length) return [];
        return mySql.query(`
            SELECT e.id, u.first_name, u.last_name, u.a_email, e.timezone
            FROM employees e
            JOIN users u on u.id = e.user_id
            WHERE e.organization_id = ? AND e.id IN (?)
        `, [organization_id, employee_ids]);
    }


}

module.exports = new EmailMonitoringModel();