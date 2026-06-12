
const _ = require('underscore');
const mongoose = require('mongoose');
const multer = require('multer');
// const csv = require('csv-parser');
const fs = require('fs');
var XLSX = require('xlsx');

const PRService = require('./ProductivityRanking.model');
const PRValidator = require('./ProductivityRanking.validator');
const { number } = require('joi');
const { values, result } = require('underscore');
const sendResponse = require('../../../../utils/myService').sendResponse;
const actionsTracker = require('../../services/actionsTracker');
const { productivityMessages, productivityBulkUpdate, productivityBulkUpdatekeys } = require("../../../../utils/helpers/LanguageTranslate");
const messageTranslate = require('../../../../utils/messageTranslation').translate;
const DepartmentModel = require('../../department/Department.model')

const maskingIP = require("../../../../utils/helpers/IPMasking");
const configFile = require('../../../../../../config/config');

const upload = multer({
    dest: __dirname.split('src')[0] + 'public',
    filename: function (req, file, callback) {
        callback(null, file.filename + '.xlsx')
    }
}).single('file');

const formateUrl = (url) => {
    url = url.toLowerCase();
    url = url.replace(new RegExp(/^\s+/), "");
    url = url.replace(new RegExp(/\s+$/), "");
    url = url.replace(new RegExp(/^http\:\/\/|^https\:\/\/|^ftp\:\/\//i), "");
    url = url.replace(new RegExp(/^www\./i), "");
    url = url.split('?')[0];
    // Drop trailing slash(es) so "example.com/" and "example.com" normalize to
    // the same value — otherwise the duplicate check below treats them as two
    // different URLs and the same site can be added twice with conflicting
    // productivity rankings.
    url = url.replace(new RegExp(/\/+$/), "");
    return url;
}
class ProductivityRanking {
    /**
     * Get productivity ranking 
     * @function getProductivityRanking
     * @memberof ProductivityRanking
     * @param {*} req
     * @param {*} res
     * @param {*} next
     * @returns {Promise<Object} Success or error
     */
    async getProductivityRanking(req, res, next) {
        try {
            let { page, limit, type, category_type, name, sortColumn, sortOrder, skip, status } = await PRValidator.getProductivityRanking().validateAsync(req.query);
            const organization_id = req.decoded.organization_id;
            const language = req.decoded.language;
            name = name ? formateUrl(name) : name
            // Pagination
            // const startIndex = (page - 1) * limit;
            // const endIndex = page * limit;
            let startIndex;
            let endIndex;
            if (page) {
                startIndex = (page - 1) * limit;
                endIndex = page * limit;
            } else {
                startIndex = skip;
                endIndex = skip + limit;
            }
            actionsTracker(req, 'Productivity ranking settings requested.');

            let promiseArr = [
                PRService.getProductivityRankingCount({ organization_id, type, category_type, name, status }),
                PRService.getProductivityRanking({ organization_id, type, startIndex, limit, category_type, name, sortColumn, sortOrder, status }),
                PRService.getDepartments(organization_id)
            ];
            let [total, results, departmentList] = await Promise.all(promiseArr);

            let managerAssignedDepartment = [];
            if(req.decoded.employee_id && req.decoded.role_id && configFile.SHOW_SPECIFIC_DEPARTMENT_NON_ADMIN.split(',').includes(String(organization_id))) managerAssignedDepartment = await PRService.getDepartmentByManager(req.decoded.employee_id, req.decoded.role_id);
            managerAssignedDepartment = _.pluck(managerAssignedDepartment, "department_id");

            departmentList = _.pluck(departmentList, "id")
            if (Array.isArray(total) === true)
                total.length ? total = total[0].total : total = 0;
            results = results.map(item => {
                // delete item.department_rules._id;
                let rule_type = "Global"
                if (item.department_rules.length > 0) {
                    const global = item.department_rules.find(x => x.department_id == null);
                    if (global) {
                        if (global.type === 1) {
                            return { ...item, status: global.status, pre_request: global.pre_request || 0, department_rules: [], rule_type }
                        } else {
                            rule_type = "Custom";
                            item['status'] = global.status
                            item['department_rules'] = item.department_rules.filter(x => x.department_id !== null);
                            item['department_rules'] = item.department_rules.map(itr => ({ ...itr, pre_request: itr.pre_request || 0 }));
                            /**Adding newly added departments which is not there in custom productivity list */
                            let nonExistsDepts = _.difference(departmentList, _.pluck(item.department_rules, "department_id"))
                            if (nonExistsDepts.length !== 0) {
                                nonExistsDepts = nonExistsDepts.map(itr => ({ _id: null, department_id: itr, status: 0, type: 2, pre_request: 0 }))
                                item['department_rules'] = nonExistsDepts.length !== 0 ? item['department_rules'].concat(nonExistsDepts) : item['department_rules'];
                            }
                        }
                    } else {
                        rule_type = "Custom"
                    }
                }
                if(item.department_rules.length > 0 && req.decoded.employee_id && req.decoded.role_id && configFile.SHOW_SPECIFIC_DEPARTMENT_NON_ADMIN.split(',').includes(String(organization_id))) {
                    item.department_rules = item.department_rules.filter(i => managerAssignedDepartment.includes(+i.department_id));
                }
                return { ...item, rule_type };
            });


            let ipMaskingOrgId = process.env.IP_MASKING_ORG_ID.split(",");
            if (ipMaskingOrgId.includes(String(organization_id))){
                results = results.map(x => {
                    x.name = maskingIP(x.name);
                    return x;
                });
            }

            // Pagination result
            const pagination = {};

            if (startIndex > 0) {
                pagination.prev = { page: page - 1, };
            }

            if (endIndex < total) {
                pagination.next = { page: page + 1, };
            }

            // return res.json({total, pagination, results})

            res.json({
                code: 200,
                total,
                skipValue: endIndex,
                limit: limit,
                pagination,
                data: results,
                hasMoreData: endIndex >= total ? false : true,
                message: productivityMessages.find(x => x.id === "1")[language] || productivityMessages.find(x => x.id === "1")["en"],
                error: null
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Update productivity ranking status
     * @function updateProductivityRanking
     * @memberof ProductivityRanking
     * @param {*} req
     * @param {*} res
     * @returns {Promise<Object} Success or error
     */

    async updateProductivityRanking(req, res, next) {
        try {
            let { data: reqData } = await PRValidator.bulkUpdateProductivityRanking().validateAsync(req.body);
            const organization_id = req.decoded.organization_id;
            const language = req.decoded.language;

            const application_ids = _.pluck(reqData, 'application_id')

            application_ids.forEach(application_id => {
                if (!mongoose.Types.ObjectId.isValid(application_id)) {
                    return res.status(400).json({ code: 400, error: productivityMessages.find(x => x.id === "2")[language] || productivityMessages.find(x => x.id === "2")["en"], message: `application_id: \"${application_id}\" Invalid object id`, data: null });
                }
            });

            const applications = await PRService.getApplicationByIds(application_ids);

            if (applications.length === 0) {
                return res.status(404).json({ code: 404, error: productivityMessages.find(x => x.id === "6")[language] || productivityMessages.find(x => x.id === "6")["en"], message: productivityMessages.find(x => x.id === "3")[language] || productivityMessages.find(x => x.id === "3")["en"], data: null });
            }

            const nonExistingIds = application_ids.filter(app_id => !applications.find(x => x._id.toString() === app_id));

            if (nonExistingIds.length > 0) {
                return res.status(404).json({ code: 404, error: productivityMessages.find(x => x.id === "6")[language] || productivityMessages.find(x => x.id === "6")["en"], message: productivityMessages.find(x => x.id === "4")[language] || productivityMessages.find(x => x.id === "4")["en"], data: nonExistingIds });
            }

            applications.forEach(application => {
                if (application.organization_id !== organization_id) {
                    return res.status(404).json({ code: 404, error: productivityMessages.find(x => x.id === "6")[language] || productivityMessages.find(x => x.id === "6")["en"], message: `application_id \"${application._id}\" Does Not Belong to this organization`, data: null });
                }
            });

            reqData = reqData.map(x => ({ ...x, name: applications.find(item => item._id == x.application_id).name, organization_id, type: applications.find(item => item._id == x.application_id).type }))
            let application_List = applications.filter(itr => itr.type == 1)

            application_List = application_List.map(itr => ({ application_id: [itr._id.toString()], department_rules: reqData.find(item => item.application_id == itr._id).department_rules, organization_id, }))
            reqData = reqData.filter(itr => itr.type == 2)

            reqData.map(i => delete i.type);
            application_List.map(i => delete i.type);
            let updatedList = [];
            for (const i of reqData) {
                let get_ids = [];
                if (/^[A-Za-z0-9. ]+$/.test(i.name)) get_ids = await PRService.getDomainsIdsByName({ name: i.name, organization_id });
                updatedList.push({ department_rules: i.department_rules, application_id: _.unique(_.pluck(get_ids, '_id').concat([i.application_id]).map(x => x.toString())), organization_id })
            }
            if (application_List !== 0) {
                updatedList = updatedList.concat(application_List)
            }
            const promiseArr = updatedList.map(item => { return PRService.updateProductivityRanking(item) })

            await Promise.all(promiseArr);
            actionsTracker(req, 'Productivity ranking settings updated.');
            return res.json({ code: 200, data: updatedList, message: productivityMessages.find(x => x.id === "5")[language] || productivityMessages.find(x => x.id === "5")["en"], error: false });
        } catch (err) {
            next(err);
        }
    }

    async downloadProductivityRanking(req, res, next) {
        try {
            let { type, status } = await PRValidator.DownloadProductivityRanking().validateAsync(req.body);
            status = status === '' ? null : status;
            const organization_id = req.decoded.organization_id;
            const language = req.decoded.language;

            actionsTracker(req, 'Productivity ranking ? downloaded.', [type]);
            let results = await PRService.downloadProductivityRanking({ organization_id, type, status })
            results = results.map(item => {
                let rule_type = "Global"
                if (item.department_rules.length > 0) {
                    const global = item.department_rules.find(x => x.department_id == null);
                    if (global) {
                        if (global.type === 1 && ([0,1,2,"0","1","2"].includes(status) ? +global.status === +status : true)) {
                            return { ...item, status: +global.status, department_rules: [], rule_type, createdAt: global.createdAt, updatedAt: global.updatedAt }
                        }
                        else {
                            rule_type = "Custom";
                            item['status'] = global.status
                            item['department_rules'] = item.department_rules.filter(x => x.department_id !== null)
                        }
                    }
                    else {
                        rule_type = "Custom"
                    }
                }
                return { ...item, rule_type }
            });

            if ([0, 1, 2, "0", "1", "2"].includes(status)) {
                results = results.filter(i => i.status == +status)
            }

            let ipMaskingOrgId = process.env.IP_MASKING_ORG_ID.split(",");
            if (ipMaskingOrgId.includes(String(organization_id))){
                results = results.map(x => {
                    x.name = maskingIP(x.name);
                    return x;
                });
            }

            results = results.filter((itr) => {
                return itr.rule_type == 'Global'
            })
            if (results.length == 0) {
                return res.json({ code: 400, data: [], message: productivityMessages.find(x => x.id === "7")[language] || productivityMessages.find(x => x.id === "7")["en"], error: null });
            }
            return res.json({ code: 200, data: results, message: productivityMessages.find(x => x.id === "1")[language] || productivityMessages.find(x => x.id === "1")["en"], error: null });
        } catch (err) {
            next(err);
        }
    }

    async bulkUpdateProductivityRankingCSV(req, res) {
        try {
            upload(req, res, async function (err) {
                const { organization_id, language } = req.decoded;
                if (!req.file || err) {
                    return sendResponse(res, 401, null, productivityMessages.find(x => x.id === "8")[language] || productivityMessages.find(x => x.id === "8")["en"], err);
                }
                const fileName = `${__dirname.split('src')[0]}/public/${req.file.filename}`;
                const workbook = XLSX.readFile(fileName, { cellDates: true });
                const [sheetName] = workbook.SheetNames;
                let productivityFields = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                fs.unlinkSync(fileName);

                if (productivityFields.length === 0) {
                    return sendResponse(res, 401, null, productivityMessages.find(x => x.id === "9")[language] || productivityMessages.find(x => x.id === "9")["en"], null);
                }
                const header = productivityFields[0];
                const headerName = productivityBulkUpdate[language || 'en'];
                const bodyKeys = productivityBulkUpdatekeys[language || 'en'];
                let statusKeys = Object.keys(bodyKeys);
                const headerKeys = Object.values(headerName);
                const headerKeysLowerCase = Object.keys(header).map(key => key.toLowerCase());
                const notMatched = headerKeys.find(name => !headerKeysLowerCase.includes(name.toLowerCase()));
                if (notMatched) {
                    const message = `${notMatched} Header Key Not Matched.`;
                    return sendResponse(res, 400, null, message, message);
                }
                // Create a case-insensitive mapping from expected header names to actual file header keys
                const headerMap = {};
                Object.keys(header).forEach(fileKey => {
                    const fileKeyLower = fileKey.toLowerCase();
                    // Find which expected header this file key matches
                    Object.keys(headerName).forEach(expectedKey => {
                        if (headerName[expectedKey].toLowerCase() === fileKeyLower) {
                            headerMap[expectedKey] = fileKey;
                        }
                    });
                });
                // productivityFields = productivityFields.map(itr => ({ Type: itr.Type, Activity: itr.Activity, status: itr.status }))
                productivityFields = productivityFields.map(itr => ({ Type: itr[headerMap['Type']], Activity: itr[headerMap['Activity']], status: itr[headerMap['status']] }))
                try {
                    await PRValidator.bulkUpdateProductivityRankingByFile(statusKeys).validateAsync(productivityFields);
                } catch (err) {
                    try {
                        const message = err.details[0].message;
                        console.log(err.details[0]);
                        let errMsg;
                        if (~message.search('status')) {
                            errMsg = productivityMessages.find(x => x.id === "10")[language] || productivityMessages.find(x => x.id === "10")["en"]
                        } else if (~message.search('Activity')) {
                            errMsg = productivityMessages.find(x => x.id === "11")[language] || productivityMessages.find(x => x.id === "11")["en"]
                        } else if (~message.search('Type')) {
                            errMsg = productivityMessages.find(x => x.id === "12")[language] || productivityMessages.find(x => x.id === "12")["en"]
                        } else {
                            errMsg = productivityMessages.find(x => x.id === "13")[language] || productivityMessages.find(x => x.id === "13")["en"]
                        }
                        return res.json({ code: 404, data: null, message: productivityMessages.find(x => x.id === "2")[language] || productivityMessages.find(x => x.id === "2")["en"], error: errMsg });
                    } catch (err) {
                        return res.json(
                            { code: 404, data: null, message: productivityMessages.find(x => x.id === "2")[language] || productivityMessages.find(x => x.id === "2")["en"], error: 'Invalid Inputs In File' },
                        );
                    }
                }

                // Helper function to map localized values to English values
                const mapToEnglish = (localizedValue, keys) => {
                    if (!localizedValue) return null;
                    const valueStr = String(localizedValue).trim();
                    // Try exact match first
                    if (keys[valueStr]) {
                        return keys[valueStr];
                    }
                    // Try case-insensitive match
                    const valueLower = valueStr.toLowerCase();
                    for (const [key, englishValue] of Object.entries(keys)) {
                        if (String(key).toLowerCase() === valueLower) {
                            return englishValue;
                        }
                    }
                    return valueStr; // Return original if no match found
                };

                let rows = _.unique(
                    productivityFields.map(
                        row => {
                            // Map localized Type and status to English values
                            const englishType = mapToEnglish(row.Type, bodyKeys);
                            const englishStatus = mapToEnglish(row.status, bodyKeys);
                            
                            return {
                                type: PRService.TYPES.indexOf(englishType),
                                name: row.Activity,
                                status: PRService.STATUSES.indexOf(englishStatus)
                            };
                        }
                    ),
                    row => row.name,
                );
                let main_domains = [];
                for (let item of rows) {
                    if (item.type == 1) {
                        if (!subDomain(item.name)) {
                            main_domains.push(item)
                        }
                    }
                }
                const domain_names = _.pluck(main_domains, 'name');
                let domain_subdomains = [];
                if (main_domains.length) {
                    for (const i of main_domains) {
                        let get_result = await PRService.getDomainsIdsByName({ organization_id, name: i.name })
                        if (get_result.length) {
                            domain_subdomains = domain_subdomains.concat(get_result.map(itr => ({ application_id: itr._id, status: i.status, name: itr.name, type: 1 })))
                        }
                    }
                }
                const names = _.pluck(rows, 'name');
                let applications = await PRService.getApplicationIdsByName({ organization_id, name: names });

                if (domain_subdomains.length) {
                    applications = applications.filter(item1 =>
                        !domain_subdomains.some(item2 => item2.application_id.toString() == item1._id.toString()))
                }
                if (domain_subdomains.length) {
                    rows = rows.filter(item1 =>
                        !domain_subdomains.some(item2 => item2.name.toString() == item1.name.toString()))
                }
                const applicationsIdsByName = _.object(applications.map(row => [row.name, row._id]));
                const statuses = await PRService.getStatusesByApplicationIds(_.values(applicationsIdsByName));

                let statusesByApplicationId = _.object(statuses.map(row => [row.application_id, row.status]));
                rows.forEach(row => {
                    row.application_id = applicationsIdsByName[row.name];
                });
                let toUpdate = rows
                    .filter((row) => {
                        if (!row.application_id) return false;
                        const status = statusesByApplicationId[row.application_id];
                        return status != row.status;
                    })
                    .map(row => ({ application_id: row.application_id, status: row.status }));

                if (domain_subdomains.length) {
                    toUpdate = toUpdate.concat(domain_subdomains.map(x => ({ application_id: x.application_id, status: x.status })))
                }
                const toUpdateByStatus = _.groupBy(toUpdate, row => row.status);
                const updateTotal = await PRService.bulkUpdateProductivityRankingStatuses(toUpdateByStatus);
                actionsTracker(req, 'Productivity rankings ? updated.', [updateTotal]);
                return res.json({ code: 200, data: null, message: productivityMessages.find(x => x.id === "5")[language] || productivityMessages.find(x => x.id === "5")["en"], error: null });
            })
        } catch (err) {
            return res.json({ code: 400, data: null, message: productivityMessages.find(x => x.id === "14")[language] || productivityMessages.find(x => x.id === "14")["en"], error: null });
        }
    }

    async addUrl(req, res, next) {
        try {
            let { url, department_rules } = await PRValidator.addUrl().validateAsync(req.body);
            const { organization_id, language } = req.decoded;
            url = formateUrl(url);
            const check_url = await PRService.getApplicationIdsByName({ organization_id, name: [url] });
            if (check_url.length !== 0) return sendResponse(res, 400, null, messageTranslate(productivityMessages, "15", language), null);

            await PRService.addUrl(organization_id, url).then(async (result) => {
                await PRService.updateProductivityRanking({ application_id: [result._id], department_rules })
                return sendResponse(res, 200, { url, department_rules }, messageTranslate(productivityMessages, "17", language), null);
            }).catch(error => {
                return sendResponse(res, 200, null, messageTranslate(productivityMessages, "16", language), null);
            })
        } catch (err) {
            next(err)
        }
    }

    
    async addUrlBulk(req, res, next) {
        try {
            upload(req, res, async function (err) {
                const { organization_id, language } = req.decoded;
                if (!req.file || err) {
                    return sendResponse(res, 401, null, productivityMessages.find(x => x.id === "8")[language] || productivityMessages.find(x => x.id === "8")["en"], err);
                }
                const fileName = `${__dirname.split('src')[0]}/public/${req.file.filename}`;
                const workbook = XLSX.readFile(fileName, { cellDates: true });
                const [sheetName] = workbook.SheetNames;
                let productivityFields = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                fs.unlinkSync(fileName);

                if (productivityFields.length === 0) {
                    return sendResponse(res, 401, null, productivityMessages.find(x => x.id === "9")[language] || productivityMessages.find(x => x.id === "9")["en"], null);
                }
                const header = productivityFields[0]; 
                const headerName = productivityBulkUpdate[language || 'en'];
                delete headerName.pre_request;
                const headerKeys = Object.values(headerName);
                const notMatched = headerKeys.find(name => !(name in header)); 
                if (notMatched) {
                    const message = `Please check the ${notMatched}. having invalid inputs or header key not matched`;
                    return sendResponse(res, 400, null, message, message);
                }
                productivityFields = productivityFields.map(itr => ({ 
                    Type: itr[`${headerName['Type']}`], 
                    Activity: formateUrl(itr[`${headerName['Activity']}`] || ''), 
                    status: itr[`${headerName['status']}`] 
                }))
                try {
                    await PRValidator.bulkUpdateProductivityRankingByFileBulkImport().validateAsync(productivityFields);
                } catch (err) {
                    try {
                        const message = err.details[0].message;
                        let errMsg;
                        if (~message.search('status')) {
                            errMsg = productivityMessages.find(x => x.id === "10")[language] || productivityMessages.find(x => x.id === "10")["en"]
                        } else if (~message.search('Activity')) {
                            errMsg = productivityMessages.find(x => x.id === "11")[language] || productivityMessages.find(x => x.id === "11")["en"]
                        } else if (~message.search('Type')) {
                            errMsg = productivityMessages.find(x => x.id === "12")[language] || productivityMessages.find(x => x.id === "12")["en"]
                        } else {
                            errMsg = productivityMessages.find(x => x.id === "13")[language] || productivityMessages.find(x => x.id === "13")["en"]
                        }
                        return res.json({ code: 404, data: null, message: productivityMessages.find(x => x.id === "2")[language] || productivityMessages.find(x => x.id === "2")["en"], error: errMsg });
                    } catch (err) {
                        return res.json(
                            { code: 404, data: null, message: productivityMessages.find(x => x.id === "2")[language] || productivityMessages.find(x => x.id === "2")["en"], error: 'Invalid Inputs In File' },
                        );
                    }
                }
                for (const item of productivityFields) {
                    // Normalize and map status to numeric values
                    const statusLower = String(item.status).toLowerCase().trim();
                    item.Type = String(item.Type).toLowerCase().trim();

                    // Map status string to numeric value
                    if (statusLower === 'productive') {
                        item.status = 1;
                    } else if (statusLower === 'unproductive') {
                        item.status = 2;
                    } else if (statusLower === 'neutral') {
                        item.status = 0;
                    } else {
                        item.status = 0; // Default to neutral
                    }
                }
                let newUrl = _.pluck(productivityFields, 'Activity')
                let existingUrl = await PRService.getApplicationIdsByName({ organization_id, name: newUrl });

                // Separate new URLs and existing URLs
                let newUrls = productivityFields.reduce((prev, item) => {
                    let temp = existingUrl.filter( i => i.name === item.Activity);
                    if(temp.length === 0) prev.push(item);
                    return prev
                }, []);

                let existingUrls = productivityFields.reduce((prev, item) => {
                    let temp = existingUrl.find( i => i.name === item.Activity);
                    if(temp) prev.push({ ...item, application_id: temp._id });
                    return prev
                }, []);
                
                // Add new URLs
                for (const item of newUrls) {
                    try {
                        await PRService.addUrl(organization_id, item.Activity, item.Type).then(async (result) => {
                            const updateData = { 
                                application_id: [result._id], 
                                department_rules: [ { department_id: 0, status: item.status, pre_request: 0 } ] 
                            };
                            await PRService.updateProductivityRanking(updateData);
                        })
                    }
                    catch (e) {
                        console.error('Error adding new URL:', e);
                    }
                }

                // Update status for existing URLs
                for (const item of existingUrls) {
                    try {
                        const updateData = { 
                            application_id: [item.application_id], 
                            department_rules: [ { department_id: 0, status: item.status, pre_request: 0 } ] 
                        };
                        await PRService.updateProductivityRanking(updateData);
                    }
                    catch (e) {
                        console.error('Error updating existing URL:', e);
                    }
                }
                
                return sendResponse(res, 200, null, messageTranslate(productivityMessages, "17", language), null);
            });
        }
        catch (err) {
            next(err);
        }
    }
}

module.exports = new ProductivityRanking;

function subDomain(url) {

    // IF THERE, REMOVE WHITE SPACE FROM BOTH ENDS
    url = url.replace(new RegExp(/^\s+/), ""); // START
    url = url.replace(new RegExp(/\s+$/), ""); // END

    // IF FOUND, CONVERT BACK SLASHES TO FORWARD SLASHES
    url = url.replace(new RegExp(/\\/g), "/");

    // IF THERE, REMOVES 'http://', 'https://' or 'ftp://' FROM THE START
    url = url.replace(new RegExp(/^http\:\/\/|^https\:\/\/|^ftp\:\/\//i), "");

    // IF THERE, REMOVES 'www.' FROM THE START OF THE STRING
    url = url.replace(new RegExp(/^www\./i), "");

    // REMOVE COMPLETE STRING FROM FIRST FORWARD SLASH ON
    url = url.replace(new RegExp(/\/(.*)/), "");

    // REMOVES '.??.??' OR '.???.??' FROM END - e.g. '.CO.UK', '.COM.AU'
    if (url.match(new RegExp(/\.[a-z]{2,3}\.[a-z]{2}$/i))) {
        url = url.replace(new RegExp(/\.[a-z]{2,3}\.[a-z]{2}$/i), "");

        // REMOVES '.??' or '.???' or '.????' FROM END - e.g. '.US', '.COM', '.INFO'
    } else if (url.match(new RegExp(/\.[a-z]{2,4}$/i))) {
        url = url.replace(new RegExp(/\.[a-z]{2,4}$/i), "");
    }

    // CHECK TO SEE IF THERE IS A DOT '.' LEFT IN THE STRING
    var subDomain = (url.match(new RegExp(/\./g))) ? true : false;
    return (subDomain);
}
