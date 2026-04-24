const _ = require('underscore');
const moment = require('moment-timezone');
const axios = require('axios');

const { BaseModel } = require('../../../../models/BaseModel');
const { NotificationRuleConditionsModel: ConditionModel } = require('./NotificationRuleConditionsModel');
const { NotificationRuleRecipientsModel: RecipientModel } = require('./NotificationRuleRecipientsModel');
const { NotificationRuleAlertsModel: AlertModel } = require('./NotificationRuleAlertsModel');
const { OrganizationModel } = require('../../organization');
const OrgAppWebModel = require('../../../../models/organization_apps_web.schema');
const jobs = require('../../../../jobs');

const mapFilter = (filter, empById, depById, locById) => {
    if (filter.ids) filter.ids = filter.ids.map(id => empById[id]).filter(value => value);
    if (filter.departments) filter.departments = filter.departments.map(id => ({ id: id, name: depById[id] }));
    if (filter.locations) filter.locations = filter.locations.map(id => ({ id: id, name: locById[id] }));
};

const mysql = require("../../../../database/MySqlConnection").getInstance();

const escapeRegExp = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// Best-effort webhook to the alert service. The rule CRUD itself has already
// succeeded in the DB by the time we get here; a downstream outage here would
// otherwise bubble up as a 400 to the client and surface as a misleading
// "Failed" toast even though the rule was persisted (see issue #109).
const notifyAlertService = async (ruleId, eventType) => {
    if (!process.env.ALERT_SERVICE_URL) return;
    try {
        await axios.post(
            `${process.env.ALERT_SERVICE_URL}/api/v3/process-rule`,
            { ruleId, eventType },
        );
    } catch (err) {
        console.error(`notifyAlertService [${eventType} rule ${ruleId}] failed:`, err.message);
    }
};

class NotificationRulesModel extends BaseModel {
    static get TABLE_NAME() {
        return 'notification_rules';
    }

    static get TABLE_FIELDS() {
        return [
            'id', 'organization_id', 'name', 'note', 'type',
            'risk_level', 'is_multiple_alerts_in_day', 'is_action_notify',
            'include_employees', 'exclude_employees', 'created_by', 'updated_by',
            'created_at', 'updated_at',
        ];
    }

    static get TYPES() {
        return {
            ABT: 'When someone is absent.',
            ASA: 'When someone accesses a specified web page or applications.',
            DWT: 'When daily work time is less or greater than specified hours/minutes.',
            IDL: 'When someone is idle for more than specified minutes.',
            SEE: 'When someone ends early by specified minutes.',
            SSE: 'When someone starts early by specified minutes.',
            SSL: 'When someone starts late by specified minutes.',
            STA: 'When someone spends more time on specified web pages or applications.',
            WDO: 'When someone works on days off.',
            OFFL: 'When someone is offline for more than specified minutes.',
        };
    }

    static get RISK_LEVELS() {
        return {
            NR: 'No Risk',
            LR: 'Low',
            MR: 'Moderate',
            HR: 'High',
            CR: 'Critical',
        };
    }

    static create(values) {
        const { include_employees, exclude_employees, ...data } = values;
        data.include_employees = JSON.stringify(include_employees);
        data.exclude_employees = JSON.stringify(exclude_employees);
        return super.create(data).then((result) => {
            return Promise
                .all([
                    ...(values.conditions || []).map((condition) => {
                        return ConditionModel.create({ ...condition, notification_rule_id: result.insertId });
                    }),
                    ...(values.recipients || []).map((recipient) => {
                        return RecipientModel.create({ ...recipient, notification_rule_id: result.insertId });
                    })
                ])
                .then(async (_) => {
                    await notifyAlertService(result.insertId, 'created');
                    return result;
                });
        });
    }

    static update(id, values, updated_by) {
        const { include_employees, exclude_employees, ...data } = values;
        data.include_employees = JSON.stringify(include_employees);
        data.exclude_employees = JSON.stringify(exclude_employees);
        data.updated_by = updated_by;
        return super.update(id, data).then((result) => {
            return Promise
                .all([
                    ...(values.conditions ? [ConditionModel.deleteMany({ notification_rule_id: id })] : []),
                    ...(values.recipients ? [RecipientModel.deleteMany({ notification_rule_id: id })] : []),
                ])
                .then((_) => {
                    return Promise
                        .all([
                            this.promiseChain((values.conditions || []).map((condition) => {
                                return ConditionModel.create({ ...condition, notification_rule_id: id });
                            })),
                            this.promiseChain((values.recipients || []).map((recipient) => {
                                return RecipientModel.create({ ...recipient, notification_rule_id: id });
                            })),
                        ]);
                })
                .then(async (_) => {
                    await notifyAlertService(id, 'updated');
                    return result;
                });
        });
    }

    static get(id) {
        return super.get(id).then((result) => {
            result.include_employees = JSON.parse(result.include_employees || '{}');
            result.exclude_employees = JSON.parse(result.exclude_employees || '{}');
            return Promise.all([
                result,
                ConditionModel.findAllBy({ notification_rule_id: result.id }),
                RecipientModel.findAllBy({ notification_rule_id: result.id }),
            ]);
        }).then(([result, conditions, recipients]) => {
            result.conditions = conditions;
            result.recipients = recipients;
            return result;
        });
    }

    static getExtended(id, organization_id) {
        if (!id) return Promise.reject(new Error('Record Not Found'));
        return this.findByExtended({ id, limit: 1, organization_id }).then((results) => {
            if (!results[0]) return Promise.reject(new Error('Record Not Found'));
            return results[0];
        });
    }

    static findByExtended(params) {
        return this.findByList(params, { name: 'LIKE' })
            .then((results) => {
                const empIds = [];
                const depIds = [];
                const locIds = [];
                const ids = [];
                for (const result of results) {
                    ids.push(result.id);
                    result.include_employees = JSON.parse(result.include_employees || '{}');
                    result.exclude_employees = JSON.parse(result.exclude_employees || '{}');

                    if (result.include_employees.ids) empIds.push(...result.include_employees.ids);
                    if (result.exclude_employees.ids) empIds.push(...result.exclude_employees.ids);

                    if (result.include_employees.departments) depIds.push(...result.include_employees.departments);
                    if (result.exclude_employees.departments) depIds.push(...result.exclude_employees.departments);

                    if (result.include_employees.locations) locIds.push(...result.include_employees.locations);
                    if (result.exclude_employees.locations) locIds.push(...result.exclude_employees.locations);
                }
                const empQuery = `SELECT e.id, CONCAT(u.first_name, ' ', u.last_name) as name, e.emp_code as computer_id
                                  FROM employees e JOIN users u ON e.user_id = u.id
                                  WHERE e.id IN(?)`;
                const depQuery = `SELECT id, name FROM organization_departments WHERE id IN(?)`;
                const locQuery = `SELECT id, name FROM organization_locations WHERE id IN(?)`;
                const orgQuery = `SELECT timezone FROM organizations WHERE id IN(?)`;
                return Promise.all([
                    results,
                    ids.length > 0 ? ConditionModel.findAllBy({ notification_rule_id: ids }) : [],
                    ids.length > 0 ? RecipientModel.findAllBy({ notification_rule_id: ids }) : [],
                    empIds.length > 0 ?
                        this.query(empQuery, [_.uniq(empIds)])
                            .then(rows => this.zip(rows, 0, -1))
                        : {},
                    depIds.length > 0 ?
                        this.query(depQuery, [_.uniq(depIds)]).then(rows => this.zip(rows)) : {},
                    locIds.length > 0 ?
                        this.query(locQuery, [_.uniq(locIds)]).then(rows => this.zip(rows)) : {},
                    this.query(orgQuery, [params.organization_id]).then(rows => rows[0]),
                ]);
            })
            .then(([results, conditions, recipients, empById, depById, locById, org]) => {
                for (const row of results) {
                    row.created_at = moment(row.created_at).tz(org.timezone).format();
                }
                const userIds = recipients.map(row => row.user_id);
                const appIds = conditions
                    .filter(item => ['DMN', 'APP'].includes(item.type)).map(item => item.cmp_argument);
                const usersQuery = `
                    SELECT
                        id, CONCAT(first_name, ' ', last_name) as name, a_email as email
                    FROM
                        users
                    WHERE id IN(?)`;
                return Promise.all([
                    results,
                    conditions, recipients, empById, depById, locById,
                    userIds.length > 0 ?
                        this.query(usersQuery, [userIds]).then(rows => _.groupBy(rows, row => row.id)) : {},
                    appIds.length > 0 ?
                        OrgAppWebModel.find({ _id: appIds }).select('_id name').lean().then(rows => this.zip(rows))
                        : {},
                ]);
            })
            .then(([results, conditions, recipients, empById, depById, locById, usersById, appById]) => {
                const conditionsById = _.groupBy(conditions, row => row.notification_rule_id);
                const recipientsById = _.groupBy(recipients, row => row.notification_rule_id);
                for (const result of results) {
                    result.conditions = (conditionsById[result.id] || [])
                        .map(row => _.omit(row, ['id', 'notification_rule_id', 'created_at', 'updated_at']));
                    result.recipients = (recipientsById[result.id] || [])
                        .map(row => _.omit(row, ['id', 'notification_rule_id', 'created_at', 'updated_at']));
                    result.conditions.forEach((item) => {
                        if (item.cmp_argument in appById) item.app_domain_name = appById[item.cmp_argument];
                    });
                    result.recipients.forEach((item) => {
                        if (item.user_id in usersById) {
                            item.name = usersById[item.user_id][0].name;
                            item.email = usersById[item.user_id][0].email;
                        }
                    });
                    mapFilter(result.include_employees, empById, depById, locById);
                    mapFilter(result.exclude_employees, empById, depById, locById);
                }
                return results.map(row => _.omit(row, ['updated_at']));
            });
    }

    static async delete(id) {
        return Promise
            .all([
                ConditionModel.deleteMany({ notification_rule_id: id }),
                RecipientModel.deleteMany({ notification_rule_id: id }),
                AlertModel.deleteMany({ notification_rule_id: id }),
            ])
            .then(_ => super.delete(id))
            .then(async (result) => {
                await notifyAlertService(id, 'deleted');
                return result;
            });
    }

    static async findByList(params, cmpTypes = {}) {
        const queryConditions = ['(?? IN(?))'];

        let { skip, limit } = params;
        const queryParams = [this.TABLE_NAME, 'organization_id', params.organization_id];
        if (params.id) {
            queryConditions.push('id like ? ');
            queryParams.push(params.id)
        }
        if (params.name) {
            const filterQuery = `SELECT c.cmp_argument as _id , n.id
                                FROM notification_rules n
                                JOIN notification_rule_conditions c ON n.id=c.notification_rule_id
                                where n.type IN('STA','ASA') AND organization_id = ?  AND c.type IN ('DMN','APP');`;
            let data = await this.query(filterQuery, [params.organization_id]);
            if (data.length > 0) {
                const apps = await OrgAppWebModel
                    .find(
                        { _id: { $in: _.pluck(data, '_id') }, organization_id: params.organization_id, name: new RegExp(escapeRegExp(params.name), 'i') },
                        { _id: 1 },
                    )
                    .lean();
                data = data.reduce((rules, rule) => {
                    if (apps.some(e => e._id == rule._id)) {
                        rules.push(rule);
                    }
                    return rules;
                }, []);
            }
            if (data.length > 0) {
                queryConditions.push('(name LIKE ? OR id IN(?))');
                queryParams.push(`%${params.name}%`, _.pluck(data, 'id'))
            } else {
                queryConditions.push('(name LIKE ?)');
                queryParams.push(`%${params.name}%`)
            }
        }
        const where = queryConditions.length > 0 ? `WHERE ${queryConditions.join(' AND ')}` : '';
        let query = `SELECT *,(COUNT( * ) OVER()) AS count FROM ?? ${where} `;

        if ('sort_by' in params && ~this.TABLE_FIELDS.indexOf(params.sort_by)) {
            query = `${query} ORDER BY ?? `
            queryParams.push(params.sort_by);
            query = `${query} ${params.sort_order || 'DESC'}`;
        } else {
            query = `${query} ORDER BY ??`
            queryParams.push('id');
            query = `${query} ${params.sort_order || 'ASC'}`;
        }
        limit = limit || 10;
        if (limit != -1) {
            queryParams.push(skip || 0, limit);
            query = `${query} LIMIT ?, ?`;
        }
        return this.query(query, queryParams).then((entities) => {
            return entities.map(entity => (new this(entity)));
        });
    }

    get organization() {
        if (this._organization) return Promise.resolve(this._organization);
        return OrganizationModel.get(this.organization_id).then((result) => {
            this._organization = result;
            return result;
        });
    }

    get recipientUsers() {
        if (this._recipientUsers) return Promise.resolve(this._recipientUsers);
        const users_ids = this.recipients.map(entity => entity.user_id);
        if (users_ids.length === 0) return Promise.resolve([]);
        return this.constructor.query(
            'SELECT ?? FROM users WHERE id IN(?)',
            [['id', 'a_email', 'first_name', 'last_name'], users_ids],
        ).then((result) => {
            result.map(u => {
                u.email = u.a_email;
                delete u.a_email;
            });
            this._recipientUsers = result;
            return result;
        });
    }
    static checkSameRuleName (alertName, organization_id) {
        let query = `SELECT id, name 
            FROM notification_rules WHERE name = "${alertName}" AND 
            organization_id = ${organization_id}`;
        return mysql.query(query);
    }
}

module.exports.NotificationRulesModel = NotificationRulesModel;