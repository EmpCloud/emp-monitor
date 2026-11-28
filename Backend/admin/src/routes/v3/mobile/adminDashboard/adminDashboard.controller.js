
const Validation = require('./adminDashboard.validation');
const Model = require('./adminDashboard.model');

const ShiftUtils = require('../utils/shift.utils');

const moment = require('moment');

const translate = require('../utils/translation');

const EventEmitter = require('../events/event.handler');

const _ = require("underscore");

const CommonHelper = require('../../../../utils/helpers/Common');


const redis = require('../../auth/services/redis.service');
const configFile = require("../../../../../../config/config");

const multer = require('multer');
const fs = require('fs');
const XLSX = require('xlsx');

const upload = multer({
    dest: __dirname.split('src')[0] + 'public',
    filename: function (req, file, callback) {
        callback(null, file.filename + '.xlsx')
    }
}).single('file');

let isExist;

class AdminDashboardController {
     async bulkCreateProject(req, res, next) {
        try {
            upload(req, res, async function (err) {
                const { organization_id, user_id, language } = req.decoded;

                if (!req.file || err) {
                    return res.status(401).json({
                        code: 401,
                        data: null,
                        message: 'File upload failed. Please provide a valid Excel file as form-data.',
                        error: err
                    });
                }

                const fileName = `${__dirname.split('src')[0]}/public/${req.file.filename}`;
                const workbook = XLSX.readFile(fileName, { cellDates: true });
                const [sheetName] = workbook.SheetNames;
                let rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                fs.unlinkSync(fileName);

                if (rows.length === 0) {
                    return res.status(401).json({
                        code: 401,
                        data: null,
                        message: 'File is empty. Please provide a file with client data.',
                        error: null
                    });
                }

                const header = rows[0];
                const requiredHeaders = ['Client Name', 'Manager Name', 'Employee Name', 'Start Date', 'End Date'];
                const notMatched = requiredHeaders.find(name => !(name in header));
                if (notMatched) {
                    const message = `Header key '${notMatched}' not found. Please ensure all required headers are present: ${requiredHeaders.join(', ')}`;
                    return res.status(400).json({ code: 400, data: null, message, error: message });
                }

                try {
                    await Validation.validateBulkCreateProject().validateAsync(rows);
                } catch (validationErr) {
                    const message = validationErr.details ? validationErr.details[0].message : 'Invalid data in file';
                    return res.status(404).json({ code: 404, data: null, message: 'Validation failed', error: message });
                }

                let successCount = 0;
                let failed = [];

                for (const row of rows) {
                    try {
                        const title = row['Client Name'];
                        const managerFullName = row['Manager Name'];
                        const employeeFullName = row['Employee Name'];
                        const start_date = row['Start Date'];
                        const end_date = row['End Date'];
                        const description = (row['Description'] || title).toString();

                        const existing = await Model.findProjectSameName({ title, organization_id });
                        if (existing) {
                            failed.push({ title, reason: `Client '${title}' already exists` });
                            continue;
                        }

                        const managerNames = managerFullName.toString().split(',').map(name => name.trim()).filter(name => name);
                        if (managerNames.length === 0) {
                            failed.push({ title, reason: `No valid manager names provided` });
                            continue;
                        }

                        const managers = await Model.findNonAdminsByFullNames({ full_names: managerNames, organization_id });
                        if (managers.length === 0) {
                            failed.push({ title, reason: `No managers found for: ${managerNames.join(', ')}` });
                            continue;
                        }
                        if (managers.length < managerNames.length) {
                            const foundNames = managers.map(m => `${m.first_name} ${m.last_name}`).join(', ');
                            const missingNames = managerNames.filter(name => !managers.some(m => 
                                `${m.first_name} ${m.last_name}`.toLowerCase() === name.toLowerCase() ||
                                `${m.first_name}${m.last_name}`.toLowerCase() === name.toLowerCase().replace(/\s/g, '')
                            ));
                            failed.push({ title, reason: `Some managers not found or not eligible. Found: ${foundNames}. Missing: ${missingNames.join(', ')}` });
                            continue;
                        }

                        const employeeNames = employeeFullName.toString().split(',').map(name => name.trim()).filter(name => name);
                        if (employeeNames.length === 0) {
                            failed.push({ title, reason: `No valid employee names provided` });
                            continue;
                        }

                        const employees = await Model.findEmployeesByFullNames({ full_names: employeeNames, organization_id });
                        if (employees.length === 0) {
                            failed.push({ title, reason: `No employees found for: ${employeeNames.join(', ')}` });
                            continue;
                        }
                        if (employees.length < employeeNames.length) {
                            const foundNames = employees.map(e => `${e.first_name} ${e.last_name}`).join(', ');
                            const missingNames = employeeNames.filter(name => !employees.some(e => 
                                `${e.first_name} ${e.last_name}`.toLowerCase() === name.toLowerCase() ||
                                `${e.first_name}${e.last_name}`.toLowerCase() === name.toLowerCase().replace(/\s/g, '')
                            ));
                            failed.push({ title, reason: `Some employees not found. Found: ${foundNames}. Missing: ${missingNames.join(', ')}` });
                            continue;
                        }

                        const project = await Model.createProject({
                            organization_id,
                            title,
                            description,
                            created_by: user_id,
                            assigned_non_admin_users: managers.map(m => m.id),
                            assigned_users: employees.map(e => e.id),
                            start_date,
                            end_date,
                        });

                        if (project._id) {
                            await Model.createProjectFolder({ organization_id, title: "Current Task", project_id: project._id, created_by: user_id });
                            await Model.createProjectFolder({ organization_id, title: "Next Task", project_id: project._id, created_by: user_id });
                            await Model.createProjectFolder({ organization_id, title: "Future Task", project_id: project._id, created_by: user_id });
                            await Model.createProjectFolder({ organization_id, title: "Finished Task", project_id: project._id, created_by: user_id });
                        }

                        successCount++;
                    } catch (taskError) {
                        failed.push({ title: row['Client Name'], reason: taskError.message || 'Unknown error' });
                    }
                }

                const data = {
                    total: rows.length,
                    success: successCount,
                    failed: failed.length,
                    failedProjects: failed
                };

                if (successCount === 0) {
                    return res.status(400).json({ code: 400, data, message: 'No Client were created. Please check the errors.', error: null });
                }

                return res.status(200).json({ code: 200, data, message: `Successfully created ${successCount} out of ${rows.length} client.`, error: null });
            });
        } catch (error) {
            next(error);
        }
     }

    async createProject(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { title, description, assigned_non_admin_users, assigned_users, start_date, end_date } = await Validation.validateCreateProject().validateAsync(req.body);
            let isExist = await Model.findProjectSameName({ title, organization_id });
            if (isExist !== null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 2)[language || 'en'] });

            if (assigned_non_admin_users.length) assigned_non_admin_users = Array.from(new Set(assigned_non_admin_users));
            if (assigned_users.length) assigned_users = Array.from(new Set(assigned_users));

            let assignedNonAdmin = await Model.findNonAdmin(assigned_non_admin_users, organization_id);
            let assignedEmployee = await Model.findEmployee(assigned_users, organization_id);
            if (assignedNonAdmin.length == 0 && !configFile.DISABLE_VALIDATION_NON_ADMIN_ASSIGNED_PROJECT_TASK.includes(organization_id)) return res.status(404).json({ code: 404, data: null, error: null, message: translate.find(i => i.id == 43)[language || 'en'] });
            if (assignedEmployee.length == 0 && !configFile.DISABLE_VALIDATION_NON_ADMIN_ASSIGNED_PROJECT_TASK.includes(organization_id)) return res.status(404).json({ code: 404, data: null, error: null, message: translate.find(i => i.id == 25)[language || 'en'] });
            assigned_non_admin_users = _.pluck(assignedNonAdmin, "id");
            assigned_users = _.pluck(assignedEmployee, "id");

            let project = await Model.createProject({ organization_id, title, description, created_by: user_id, assigned_non_admin_users: Array.from(new Set(assigned_non_admin_users)), assigned_users: Array.from(new Set(assigned_users)), start_date, end_date });
            if (project._id) {
                await Model.createProjectFolder({ organization_id, title: "Current Task", project_id: project._id, created_by: user_id });
                await Model.createProjectFolder({ organization_id, title: "Next Task", project_id: project._id, created_by: user_id });
                await Model.createProjectFolder({ organization_id, title: "Future Task", project_id: project._id, created_by: user_id });
                await Model.createProjectFolder({ organization_id, title: "Finished Task", project_id: project._id, created_by: user_id });
            }
            return res.status(200).json({ code: 200, data: project, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async updateProject(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { title, description, _id, assigned_non_admin_users, assigned_users, start_date, end_date } = await Validation.validateUpdateProject().validateAsync(req.body);

            if (assigned_non_admin_users?.length) assigned_non_admin_users = Array.from(new Set(assigned_non_admin_users));
            if (assigned_users?.length) assigned_users = Array.from(new Set(assigned_users));

            let isExist = await Model.findProject({ _id, organization_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            let sameNameProject = await Model.findProjectSameName({ title, organization_id });
            if (sameNameProject !== null) {
                if (String(sameNameProject._id) !== String(isExist._id)) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 2)[language || 'en'] });
            }

            let assignedNonAdmin = await Model.findNonAdmin(assigned_non_admin_users, organization_id);
            let assignedEmployee = await Model.findEmployee(assigned_users, organization_id);
            if (assignedNonAdmin.length == 0 && !configFile.DISABLE_VALIDATION_NON_ADMIN_ASSIGNED_PROJECT_TASK.includes(organization_id)) return res.status(404).json({ code: 404, data: null, error: null, message: translate.find(i => i.id == 43)[language || 'en'] });
            if (assignedEmployee.length == 0 && !configFile.DISABLE_VALIDATION_NON_ADMIN_ASSIGNED_PROJECT_TASK.includes(organization_id)) return res.status(404).json({ code: 404, data: null, error: null, message: translate.find(i => i.id == 25)[language || 'en'] });
            assigned_non_admin_users = _.pluck(assignedNonAdmin, "id");
            assigned_users = _.pluck(assignedEmployee, "id");

            if (isExist.assigned_users) {
                let removedEmployees = isExist.assigned_users.filter(value => !assigned_users.includes(value));
                if (removedEmployees.length != 0) {
                    // Find if given user has any assigned task or not.
                    let taskData = await Model.findEmployeeTaskInProject(removedEmployees, _id)
                    if (taskData.length > 0) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 45)[language || 'en'] });
                }
            }

            let project = await Model.updatedProject({ organization_id, created_by: user_id, title, description, _id, assigned_non_admin_users, assigned_users, start_date, end_date });
            return res.status(200).json({ code: 200, data: project, error: null, message: translate.find(i => i.id == 5)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async deleteProject(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { _id } = await Validation.validateDeleteProject().validateAsync(req.body);

            let isExist = await Model.findProject({ _id, organization_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });
            isExist.is_deleted = true;
            await isExist.save();
            EventEmitter.emit('project-deleted-task-update', _id);
            return res.status(200).json({ code: 200, data: null, error: null, message: translate.find(i => i.id == 6)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchProject(req, res, next) {
        try {
            let { organization_id, user_id, employee_id, language } = req.decoded;
            let { skip, limit, search, sort } = await Validation.validateFetchProject().validateAsync(req.query);
            if (skip) skip = +skip;
            if (limit) limit = +limit;

            let [project, [docCount]] = await Promise.all([
                Model.fetchProject({ skip, limit, search, organization_id, non_admin_id: employee_id, sort }),
                Model.fetchProject({ skip, limit, search, organization_id, non_admin_id: employee_id, sort, count: true })
            ])
            let [defaultProjectStatus] = await Model.fetchProject({ skip: 0, limit: 1, search: "Default", organization_id, });
            if (!defaultProjectStatus && project.length === 0) {
                let projectCreated = await Model.createProject({ organization_id, title: "Default", description: "Default", created_by: user_id, start_date: moment().format('YYYY-MM-DD'), end_date: moment().add(1, 'months').format('YYYY-MM-DD') });
                if (projectCreated._id) {
                    await Model.createProjectFolder({ organization_id, title: "Current Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Next Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Future Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Finished Task", project_id: project._id, created_by: user_id });
                }
                if (project.length < 10 && !defaultProjectStatus) {
                    project.push(projectCreated._doc);
                    if (docCount) docCount.count++;
                    else docCount = { count: 1 };
                }
            }

            let assignedUserDataId = _.pluck(project, "assigned_users").filter(i => i)
            let assignedNonAdminUserDataId = _.pluck(project, "assigned_non_admin_users").filter(i => i)

            assignedUserDataId = arrayParser(assignedUserDataId);
            assignedNonAdminUserDataId = arrayParser(assignedNonAdminUserDataId);

            let assignedEmployeeDetails = [];
            let assignedNonAdminDetails = [];

            if (assignedUserDataId.length) {
                assignedEmployeeDetails = await Model.findEmployee(Array.from(new Set(assignedUserDataId)), organization_id);

            }
            if (assignedNonAdminUserDataId.length) {
                assignedNonAdminDetails = await Model.findNonAdmin(Array.from(new Set(assignedNonAdminUserDataId)), organization_id);
            }
            let finalData = [];
            for (let { assigned_users, assigned_non_admin_users, ...props } of project) {
                if (!assigned_non_admin_users && !assigned_users) {
                    finalData.push({ ...props, assigned_users, assigned_non_admin_users });
                    continue;
                }
                if (assigned_users?.length) assigned_users = assigned_users.map(it => assignedEmployeeDetails.find(x => x.id == it));
                if (assigned_non_admin_users?.length) assigned_non_admin_users = assigned_non_admin_users.map(it => assignedNonAdminDetails.find(x => x.id == it));
                finalData.push({ ...props, assigned_users, assigned_non_admin_users });
            }

            return res.status(200).json({ code: 200, data: finalData, error: null, message: translate.find(i => i.id == 1)[language || 'en'], count: docCount?.count });
        } catch (error) {
            next(error);
        }
    }

    async assignEmployeeProject(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { employee_id, _id } = await Validation.validateAssignEmployeeProject().validateAsync(req.body);

            let [employeeData] = await Model.fetchEmployees([employee_id], organization_id);
            if (!employeeData) return res.status(404).json({ code: 404, data: null, error: null, message: translate.find(i => i.id == 7)[language || 'en'] });
            let isExist = await Model.findProject({ _id, organization_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            if (!isExist.assigned_users.includes(+employee_id)) {
                isExist.assigned_users.push(+employee_id);
                await isExist.save();
                return res.status(200).json({ code: 200, data: isExist, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
            } else return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 8)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async removeEmployeeProject(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { employee_id, _id } = await Validation.validateAssignEmployeeProject().validateAsync(req.body);

            let [employeeData] = await Model.fetchEmployees([employee_id], organization_id);
            if (!employeeData) return res.status(404).json({ code: 404, data: null, error: null, message: translate.find(i => i.id == 7)[language || 'en'] });
            let isExist = await Model.findProject({ _id, organization_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            if (isExist.assigned_users.includes(+employee_id)) {
                isExist.assigned_users = isExist.assigned_users.filter(id => id !== +employee_id);
                await isExist.save();
                return res.status(200).json({ code: 200, data: isExist, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
            } else return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 37)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async viewAssignEmployee(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { _id } = await Validation.validateDeleteProject().validateAsync(req.query);
            let isExist = await Model.findProject({ _id, organization_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });
            let employeeDetails = await Model.fetchEmployeeDetails(organization_id, isExist.assigned_users);
            res.status(200).json({ code: 200, data: employeeDetails, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchProjectEmployeeWise(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { search, employee_id } = await Validation.validateFetchProjectEmployee().validateAsync(req.query);
            let [project, [projectCount]] = await Promise.all([
                Model.fetchProjectMobile({ search, organization_id, employee_id }),
                Model.fetchProjectMobile({ search, organization_id, employee_id, count: true })
            ])
            let defaultProjectStatus = await Model.fetchProject({ skip: 0, limit: 10, search: "Default", organization_id });
            defaultProjectStatus = defaultProjectStatus.filter(p => p.title == "Default");
            if (defaultProjectStatus.length === 0) {
                let projectCreated = await Model.createProject({ organization_id, title: "Default", description: "Default", created_by: user_id, start_date: moment().format('YYYY-MM-DD'), end_date: moment().add(1, 'months').format('YYYY-MM-DD') });
                if (projectCreated._id) {
                    await Model.createProjectFolder({ organization_id, title: "Current Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Next Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Future Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Finished Task", project_id: project._id, created_by: user_id });
                }
                if (project.length < 10) project.push(projectCreated._doc);
            } else if (defaultProjectStatus.length !== 0 && project.filter(i => i.title === "Default").length == 0 && project.length < 10 && !search) {
                project.push(defaultProjectStatus[0]);
                if (projectCount) {
                    projectCount.count++;
                }
                else {
                    projectCount = { count: 1 };
                }
            }
            return res.status(200).json({ code: 200, data: project, error: null, message: translate.find(i => i.id == 1)[language || 'en'], count: projectCount?.count });
        }
        catch (error) {
            next(error);
        }
    }

    async fetchProjectMobile(req, res, next) {
        try {
            let { organization_id, user_id, employee_id, language } = req.decoded;
            let { skip, limit, search } = await Validation.validateFetchProject().validateAsync(req.query);
            if (skip) skip = +skip;
            if (limit) limit = +limit;

            let [project, [projectCount]] = await Promise.all([
                Model.fetchProjectMobile({ skip, limit, search, organization_id, employee_id }),
                Model.fetchProjectMobile({ skip, limit, search, organization_id, employee_id, count: true })
            ])

            let defaultProjectStatus = await Model.fetchProject({ skip: 0, limit: 10, search: "Default", organization_id });
            defaultProjectStatus = defaultProjectStatus.filter(p => p.title == "Default");
            if (defaultProjectStatus.length === 0) {
                let projectCreated = await Model.createProject({ organization_id, title: "Default", description: "Default", created_by: user_id, start_date: moment().format('YYYY-MM-DD'), end_date: moment().add(1, 'months').format('YYYY-MM-DD') });
                if (projectCreated._id) {
                    await Model.createProjectFolder({ organization_id, title: "Current Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Next Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Future Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Finished Task", project_id: project._id, created_by: user_id });
                }
                if (project.length < 10) project.push(projectCreated._doc);
            } else if (defaultProjectStatus.length !== 0 && project.filter(i => i.title === "Default").length == 0 && project.length < 10 && !search) {
                project.push(defaultProjectStatus[0]);
                if (projectCount) {
                    projectCount.count++;
                }
                else {
                    projectCount = { count: 1 };
                }
            }

            return res.status(200).json({ code: 200, data: project, error: null, message: translate.find(i => i.id == 1)[language || 'en'], count: projectCount?.count });
        } catch (error) {
            next(error);
        }
    }

    async createProjectFolder(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { title, project_id } = await Validation.validateCreateProjectFolder().validateAsync(req.body);
            let isExist = await Model.findProjectFolderSameName({ title, organization_id, project_id });
            if (isExist !== null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 9)[language || 'en'] });

            isExist = await Model.findProject({ _id: project_id, organization_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            let projectFolder = await Model.createProjectFolder({ organization_id, title, project_id, created_by: user_id });
            return res.status(200).json({ code: 200, data: projectFolder, error: null, message: translate.find(i => i.id == 10)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async updateProjectFolder(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { title, project_id, _id } = await Validation.validateUpdateProjectFolder().validateAsync(req.body);
            let isExist = await Model.findProjectFolderSameName({ title, organization_id, project_id });
            if (isExist !== null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 9)[language || 'en'] });

            isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            isExist = await Model.findProjectFolder({ _id, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });
            isExist.name = title;
            await isExist.save();

            return res.status(200).json({ code: 200, data: isExist, error: null, message: translate.find(i => i.id == 11)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async deleteProjectFolder(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { _id } = await Validation.validateDeleteProject().validateAsync(req.body);

            let isExist = await Model.findProjectFolder({ _id, project_id: null });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });
            isExist.is_deleted = true;
            await isExist.save();

            return res.status(200).json({ code: 200, data: null, error: null, message: translate.find(i => i.id == 12)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchProjectFolder(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { skip, limit, search, project_id } = await Validation.validateFetchProjectFolder().validateAsync(req.query);
            if (skip) skip = +skip;
            if (limit) limit = +limit;
            let projectFolders = await Model.fetchProjectFolder({ skip, limit, search, organization_id, project_id });

            return res.status(200).json({ code: 200, data: projectFolders, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async createProjectTask(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { title, project_id, folder_id, employee_id } = await Validation.validateCreateProjectTaskDashboard().validateAsync(req.body);
            // let isExist = await Model.findProjectTaskSameName({ title, organization_id, project_id, folder_id });
            // if (isExist !== null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 13)[language || 'en'] });


            isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            isExist = await Model.findProjectFolder({ _id: folder_id, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });

            let projectTask = await Model.createProjectTask({ organization_id, title, project_id, folder_id, created_by: user_id, employee_id });
            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 15)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    async bulkCreateProjectTask(req, res, next) {
        try {
            upload(req, res, async function (err) {
                const { organization_id, user_id, language } = req.decoded;
                
                if (!req.file || err) {
                    return res.status(401).json({ 
                        code: 401, 
                        data: null, 
                        message: 'File upload failed. Please provide a valid Excel file.', 
                        error: err 
                    });
                }

                const fileName = `${__dirname.split('src')[0]}/public/${req.file.filename}`;
                const workbook = XLSX.readFile(fileName, { cellDates: true });
                const [sheetName] = workbook.SheetNames;
                let taskFields = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                fs.unlinkSync(fileName);

                if (taskFields.length === 0) {
                    return res.status(401).json({ 
                        code: 401, 
                        data: null, 
                        message: 'File is empty. Please provide a file with task data.', 
                        error: null 
                    });
                }

                const header = taskFields[0];
                const requiredHeaders = ['Title', 'Client Name', 'Folder Name', 'Employee Name'];
                const notMatched = requiredHeaders.find(name => !(name in header));
                
                if (notMatched) {
                    const message = `Header key '${notMatched}' not found. Please ensure all required headers are present: ${requiredHeaders.join(', ')}`;
                    return res.status(400).json({ 
                        code: 400, 
                        data: null, 
                        message: message, 
                        error: message 
                    });
                }

                try {
                    await Validation.validateBulkCreateProjectTask().validateAsync(taskFields);
                } catch (validationErr) {
                    const message = validationErr.details ? validationErr.details[0].message : 'Invalid data in file';
                    return res.status(404).json({ 
                        code: 404, 
                        data: null, 
                        message: 'Validation failed', 
                        error: message 
                    });
                }

                let successCount = 0;
                let failedTasks = [];

                // Get all unique Client names and fetch projects
                const projectNames = [...new Set(taskFields.map(t => t['Client Name'].trim()))];
                const projects = await Model.findProjectsByNames({ names: projectNames, organization_id });
                const projectMap = {};
                projects?.forEach(p => {
                    projectMap[p.title] = p;
                });

                // Process each task
                for (const task of taskFields) {
                    try {
                        const title = task['Title'].trim();
                        const project_name = task['Client Name'].trim();
                        const folder_name = task['Folder Name'].trim();
                        const employee_name = task['Employee Name'].trim();

                        // Find project
                        const project = projectMap[project_name];
                        if (!project) {
                            failedTasks.push({ title, reason: `Project '${project_name}' not found` });
                            continue;
                        }

                        // Find folder
                        const folder = await Model.findProjectFolderName({ name: folder_name, project_id: project._id });
                        if (!folder) {
                            failedTasks.push({ title, reason: `Folder '${folder_name}' not found in project '${project_name}'` });
                            continue;
                        }

                        // Find employee by full name
                        const employees = await Model.findEmployeesByFullNames({ full_names: [employee_name], organization_id });
                        if (!employees || employees.length === 0) {
                            failedTasks.push({ title, reason: `Employee '${employee_name}' not found` });
                            continue;
                        }
                        const employee = employees[0];

                        // Create task
                        await Model.createProjectTask({ 
                            organization_id, 
                            title, 
                            project_id: project._id, 
                            folder_id: folder._id, 
                            created_by: user_id, 
                            employee_id: employee.id 
                        });

                        successCount++;
                    } catch (taskError) {
                        failedTasks.push({ 
                            title: task.title, 
                            reason: taskError.message || 'Unknown error' 
                        });
                    }
                }

                const responseData = {
                    total: taskFields.length,
                    success: successCount,
                    failed: failedTasks.length,
                    failedTasks: failedTasks
                };

                if (successCount === 0) {
                    return res.status(400).json({ 
                        code: 400, 
                        data: responseData, 
                        message: 'No tasks were created. Please check the errors.', 
                        error: null 
                    });
                }

                return res.status(200).json({ 
                    code: 200, 
                    data: responseData, 
                    message: `Successfully created ${successCount} out of ${taskFields.length} tasks.`, 
                    error: null 
                });
            });
        } catch (error) {
            next(error);
        }
    }

    async updateProjectTask(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { title, project_id, folder_id, task_id } = await Validation.validateUpdateProjectTask().validateAsync(req.body);

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            let isExist = await Model.findProjectTaskSameName({ title, organization_id, project_id, folder_id, task_id });
            if (isExist !== null) {
                // if (isExist._id !== projectTask._id) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 13)[language || 'en'] });
            }

            isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            if (!isExist?.assigned_users?.includes(projectTask?.assigned_user) && isExist.title !== "Default") return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 46)[language || 'en'] });

            isExist = await Model.findProjectFolder({ _id: folder_id, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });


            projectTask.name = title;
            projectTask.project_id = project_id;
            projectTask.folder_id = folder_id;
            await projectTask.save();

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 16)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async updateProjectTaskMobile(req, res, next) {
        try {
            let taskStartTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;
            let { title, project_id, folder_name, task_id, is_start } = await Validation.validateUpdateProjectTaskMobile().validateAsync(req.body);

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            let isExist = await Model.findProjectTaskSameName({ title, organization_id, project_id, task_id });
            if (isExist !== null) {
                // if (isExist._id !== projectTask._id) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 13)[language || 'en'] });
            }

            isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            isExist = await Model.findProjectFolderName({ name: folder_name, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });


            projectTask.name = title;
            projectTask.project_id = project_id;
            projectTask.folder_id = isExist._id;
            await projectTask.save();

            if (is_start) {
                // assigned_user,status=1
                let task_id = projectTask._id;
                let isRunningTask = await Model.findRunningTask(employee_id);
                if (isRunningTask !== null) return res.status(200).json({ code: 200, message: translate.find(i => i.id == 54)[language || 'en'], data: null, error: null });

                projectTask = await Model.findTaskById({ _id: task_id });
                if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

                if (projectTask.assigned_user !== employee_id) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 26)[language || 'en'], data: null, error: null });
                if (projectTask.status === 1 || projectTask.status === 3) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 27)[language || 'en'], data: null, error: null });

                let [employeeShift] = await Model.getEmployeeShift(employee_id)
                let date = moment.tz(timezone).format('YYYY-MM-DD');
                if (employeeShift) {
                    let shiftData = JSON.parse(employeeShift.data)[moment.tz(timezone).format('dddd').toLowerCase().slice(0, 3)];
                    if (shiftData.status === true) {
                        if (ShiftUtils.isEndInNextDay(shiftData.time.start, shiftData.time.end) && moment(taskStartTime).isAfter(moment(shiftData.time.end, 'HH:mm').utc()) == false) {
                            date = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
                        }
                    }
                }
                let [employeeAttendance] = await Model.getEmployeeAttendance(date, employee_id)
                if (employeeAttendance) {
                    let prReport = await Model.getEmployeeAttendanceReport(moment(employeeAttendance.date).format('YYYY-MM-DD'), employee_id, organization_id);
                    projectTask.status = 1;
                    projectTask.task_working_status.push({
                        start_time: taskStartTime,
                        productivity_report_id: prReport._id
                    })
                    await projectTask.save();
                }
                else {
                    // Create Attendance Record and start application tracking.
                    let response = await Model.createAttendanceRecord(employee_id, organization_id, date, taskStartTime);
                    //response.insertId
                    let prReport = await Model.createEmployeeProductivityReport(department_id, location_id, employee_id, organization_id, date, taskStartTime);

                    projectTask.status = 1;
                    projectTask.task_working_status.push({
                        start_time: taskStartTime,
                        productivity_report_id: prReport._id
                    })
                    await projectTask.save();
                }
            }

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 16)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async deleteProjectTask(req, res, next) {
        try {
            let taskEndTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let taskEndIsoString = moment().utc().toISOString();
            let { organization_id, user_id, language, timezone } = req.decoded;
            let { _id: task_id } = await Validation.validateDeleteProject().validateAsync(req.query);

            let projectTask = await Model.findTaskById({ _id: task_id, organization_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });
            if(projectTask.status == 1) return res.status(200).json({ code: 200, message: translate.find(i => i.id == 55)[language || 'en'], data: projectTask, error: null });
            let finishedFolder = await Model.findProjectFolderSameName({ title: "Finished Task", project_id: projectTask.project_id, organization_id, })
            if (!finishedFolder) {
                finishedFolder = await Model.createProjectFolder({ organization_id, project_id: projectTask.project_id, title: "Finished Task" });
                if (!finishedFolder) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 44)[language || 'en'], data: null, error: null });
            }
            let taskStartTime = '';
            for (const task_working_status of projectTask.task_working_status) {
                if (task_working_status.end_time && task_working_status.start_time) continue;
                if (!task_working_status.end_time && task_working_status.start_time) {
                    taskStartTime = task_working_status.start_time;
                    break;
                }
            }

            if(projectTask.status === 2) {
                projectTask.folder_id = finishedFolder._id;
                projectTask.task_remaining_time = null;
                projectTask.is_deleted = true;
                projectTask.status = 3;
                await projectTask.save();
                return res.status(200).json({ code: 200, message: translate.find(i => i.id == 29)[language || 'en'], data: projectTask, error: null });
            }
            if(projectTask.status == 1) {
                let employee_id = projectTask.assigned_user;
                let [employeeShift] = await Model.getEmployeeShift(employee_id)
                let date = moment.utc().tz(timezone).format('YYYY-MM-DD');

                if(moment(taskStartTime).format('YYYY-MM-DD') !== date) {
                    let taskEndMidnightTime = moment(taskStartTime).endOf('day').utc().toISOString();

                    for (const task_working_status of projectTask.task_working_status) {
                        if (task_working_status.end_time && task_working_status.start_time) continue;
                        if (!task_working_status.end_time && task_working_status.start_time) {
                            task_working_status.end_time = taskEndMidnightTime;
                            break;
                        }
                    }

                    projectTask.folder_id = finishedFolder._id;
                    projectTask.task_remaining_time = null;
                    projectTask.is_deleted = true;
                    projectTask.status = 3;
                    await projectTask.save();
                    return res.status(200).json({ code: 200, message: translate.find(i => i.id == 29)[language || 'en'], data: projectTask, error: null });
                }

                if (employeeShift) {
                    let shiftData = JSON.parse(employeeShift.data)[moment.tz(timezone).format('dddd').toLowerCase().slice(0, 3)];
                    if (shiftData.status === true) {
                        if (ShiftUtils.isEndInNextDay(shiftData.time.start, shiftData.time.end) && moment(taskEndIsoString).isAfter(moment(shiftData.time.end, 'HH:mm').utc()) == false) {
                            date = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
                        }
                    }
                }
    
                let [employeeAttendance] = await Model.getEmployeeAttendance(date, employee_id)
                if (employeeAttendance) {
                    let prReport = await Model.getEmployeeAttendanceReport(moment(employeeAttendance.date).format('YYYY-MM-DD'), employee_id, organization_id);
    
                    let totalTaskTime = 0;
                    projectTask.status = 3;
                    for (const task_working_status of projectTask.task_working_status) {
                        if (task_working_status.end_time && task_working_status.start_time) continue;
                        if (!task_working_status.end_time && task_working_status.start_time) {
                            task_working_status.end_time = moment.utc(taskEndIsoString).toISOString();
                            totalTaskTime = moment(moment.utc(taskEndIsoString).toISOString()).diff(moment(task_working_status.start_time), 'second');
                            break;
                        }
                    }
                    projectTask.task_finished_time = taskEndIsoString;
                    projectTask.total_working_time += totalTaskTime;
                    projectTask.folder_id = finishedFolder._id;
                    projectTask.task_remaining_time = null;
                    projectTask.is_deleted = true;
                    await projectTask.save();
                    prReport.productive_duration += totalTaskTime;
                    prReport.logged_duration += totalTaskTime;
                    await prReport.save();
                    await Model.updateEmployeeAttendance(employee_id, organization_id, employeeAttendance.attendance_id, taskEndTime);
    
                    return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 17)[language || 'en'] });
                }
            }
            else {
                projectTask.is_deleted = true;
                await projectTask.save();
            }

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 17)[language || 'en'] });
        } catch (error) {
            console.log(error);
            next(error);
        }
    }

    async deleteProjectTaskMultiple(req, res, next) {
        try {
            let taskEndTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let taskEndIsoString = moment().utc().toISOString();
            let { organization_id, user_id, language, timezone } = req.decoded;
            let { _ids: task_ids } = await Validation.validateDeleteMultipleProjectTask().validateAsync(req.body);

            let success = [];
            let error = [];

            for (const task_id of task_ids) {
                try {
                    let projectTask = await Model.findTaskById({ _id: task_id });
                    if (!projectTask) {
                        error.push(task_id);
                        continue;
                    }
                    
                    let finishedFolder = await Model.findProjectFolderSameName({ title: "Finished Task", project_id: projectTask.project_id, organization_id, })
                    if (!finishedFolder) {
                        finishedFolder = await Model.createProjectFolder({ organization_id, project_id: projectTask.project_id, title: "Finished Task" });
                        if (!finishedFolder) {
                            error.push(task_id);
                            continue;
                        }
                    }
                    let taskStartTime = '';
                    for (const task_working_status of projectTask.task_working_status) {
                        if (task_working_status.end_time && task_working_status.start_time) continue;
                        if (!task_working_status.end_time && task_working_status.start_time) {
                            taskStartTime = task_working_status.start_time;
                            break;
                        }
                    }
        
                    if(projectTask.status === 2) {
                        projectTask.folder_id = finishedFolder._id;
                        projectTask.task_remaining_time = null;
                        projectTask.is_deleted = true;
                        projectTask.status = 3;
                        await projectTask.save();
                        success.push(task_id);
                        continue;
                    }
                    if(projectTask.status == 1) {
                        let employee_id = projectTask.assigned_user;
                        let [employeeShift] = await Model.getEmployeeShift(employee_id)
                        let date = moment.utc().tz(timezone).format('YYYY-MM-DD');
        
                        if(moment(taskStartTime).format('YYYY-MM-DD') !== date) {
                            let taskEndMidnightTime = moment(taskStartTime).endOf('day').utc().toISOString();
        
                            for (const task_working_status of projectTask.task_working_status) {
                                if (task_working_status.end_time && task_working_status.start_time) continue;
                                if (!task_working_status.end_time && task_working_status.start_time) {
                                    task_working_status.end_time = taskEndMidnightTime;
                                    break;
                                }
                            }
        
                            projectTask.folder_id = finishedFolder._id;
                            projectTask.task_remaining_time = null;
                            projectTask.is_deleted = true;
                            projectTask.status = 3;
                            await projectTask.save();
                            success.push(task_id);
                            continue;
                        }
        
                        if (employeeShift) {
                            let shiftData = JSON.parse(employeeShift.data)[moment.tz(timezone).format('dddd').toLowerCase().slice(0, 3)];
                            if (shiftData.status === true) {
                                if (ShiftUtils.isEndInNextDay(shiftData.time.start, shiftData.time.end) && moment(taskEndIsoString).isAfter(moment(shiftData.time.end, 'HH:mm').utc()) == false) {
                                    date = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
                                }
                            }
                        }
            
                        let [employeeAttendance] = await Model.getEmployeeAttendance(date, employee_id)
                        if (employeeAttendance) {
                            let prReport = await Model.getEmployeeAttendanceReport(moment(employeeAttendance.date).format('YYYY-MM-DD'), employee_id, organization_id);
            
                            let totalTaskTime = 0;
                            projectTask.status = 3;
                            for (const task_working_status of projectTask.task_working_status) {
                                if (task_working_status.end_time && task_working_status.start_time) continue;
                                if (!task_working_status.end_time && task_working_status.start_time) {
                                    task_working_status.end_time = moment.utc(taskEndIsoString).toISOString();
                                    totalTaskTime = moment(moment.utc(taskEndIsoString).toISOString()).diff(moment(task_working_status.start_time), 'second');
                                    break;
                                }
                            }
                            projectTask.task_finished_time = taskEndIsoString;
                            projectTask.total_working_time += totalTaskTime;
                            projectTask.folder_id = finishedFolder._id;
                            projectTask.task_remaining_time = null;
                            projectTask.is_deleted = true;
                            await projectTask.save();
                            prReport.productive_duration += totalTaskTime;
                            prReport.logged_duration += totalTaskTime;
                            await prReport.save();
                            await Model.updateEmployeeAttendance(employee_id, organization_id, employeeAttendance.attendance_id, taskEndTime);
            
                            success.push(task_id);
                            continue;
                        }
                    }
                    else {
                        projectTask.is_deleted = true;
                        await projectTask.save();
                        success.push(task_id);
                        continue;
                    }
                }
                catch(e) {
                    error.push(task_id);
                }
            }

            return res.status(200).json({ code: 200, data: {success, error}, error: null, message: translate.find(i => i.id == 17)[language || 'en'] });
        } catch (error) {
            console.log(error);
            next(error);
        }
    }

    async fetchProjectTask(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { skip, limit, search, project_id, folder_id, assigned_non_admin_users, assigned_users } = await Validation.validateFetchProjectTask().validateAsync(req.query);

            let isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            isExist = await Model.findProjectFolder({ _id: folder_id, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });

            let projectTasks = await Model.fetchProjectTask({ skip, limit, search, organization_id, project_id, folder_id, employee_id: assigned_users, non_admin: assigned_non_admin_users });

            let assignEmployeeDetails = [];

            for (const projectTask of projectTasks) {
                if (projectTask.assigned_user) assignEmployeeDetails.push(projectTask.assigned_user);
            }

            let employeeDetails = [];
            if (assignEmployeeDetails.length) {
                employeeDetails = await Model.fetchEmployeeDetails(organization_id, Array.from(new Set(assignEmployeeDetails)));
            }

            for (const projectTask of projectTasks) {
                if (projectTask.assigned_user) {
                    projectTask.assigned_user = employeeDetails.find(i => i.id = projectTask.assigned_user)
                }
            }

            return res.status(200).json({ code: 200, data: projectTasks, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }


    async fetchTaskList(req, res, next) {
        try {
            let { organization_id, user_id, language, is_admin, is_manager, is_teamlead } = req.decoded;
            let { skip, limit, search, employee_id, manager_id, project_id, folder_id, start_date, end_date, task_id, sortColumn, sortOrder } = await Validation.validateFetchProjectTaskList().validateAsync(req.query);

            if (start_date && end_date) {
                start_date = moment(start_date).startOf('day').toISOString();
                end_date = moment(end_date).endOf('day').toISOString();
            }

            if (!is_admin && (is_manager || is_teamlead)) manager_id = req.decoded.employee_id;

            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskList({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder }),
                Model.fetchProjectTaskList({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder })
            ]);
 
            let assignedNonAdmin = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_non_admin_users))));
            let assignedUsers = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_users))));
            let assignUser = _.pluck(projectTasks, "assigned_user");

            if (assignedNonAdmin.length && assignedNonAdmin) assignedNonAdmin = await Model.fetchEmployeeDetails(organization_id, assignedNonAdmin);
            if (assignedUsers.length && assignedUsers) assignedUsers = await Model.fetchEmployeeDetails(organization_id, assignedUsers);
            if (assignUser.length && assignUser) assignUser = await Model.fetchEmployeeDetails(organization_id, assignUser);

            for (const projectTask of projectTasks) {
                let totalTaskedWorkedTime = 0;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.start_time && task_working_status.end_time) {
                        totalTaskedWorkedTime += moment(moment(task_working_status.end_time).utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                    else {
                        totalTaskedWorkedTime += moment(moment().utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                }
                projectTask.total_working_time = totalTaskedWorkedTime;
                if (projectTask.project_data.assigned_non_admin_users && projectTask.project_data.assigned_non_admin_users.length) {
                    projectTask.project_data.assigned_non_admin_users = assignedNonAdmin.filter(u => projectTask?.project_data?.assigned_non_admin_users?.includes(u.id))
                }
                if (projectTask.project_data.assigned_users && projectTask.project_data.assigned_users.length) {
                    projectTask.project_data.assigned_users = assignedUsers.filter(u => projectTask?.project_data?.assigned_users?.includes(u.id))
                }
                if (projectTask.assigned_user) projectTask.assigned_user = assignUser.find(u => u.id == projectTask.assigned_user);
            }

            return res.status(200).json({ code: 200, data: projectTasks, count: count?.count ?? 0, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchTaskListAttendanceClaim(req, res, next) {
        try {
            let { organization_id, user_id, language, is_admin, is_manager, is_teamlead } = req.decoded;
            let { skip, limit, search, employee_id, manager_id, project_id, folder_id, start_date, end_date, task_id, sortColumn, sortOrder } = await Validation.validateFetchProjectTaskList().validateAsync(req.query);
            if (start_date && end_date) {
                start_date = moment(start_date).startOf('day').toISOString();
                end_date = moment(end_date).endOf('day').toISOString();
            }
            // if (!is_admin && (is_manager || is_teamlead)) manager_id = req.decoded.employee_id;
            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskList({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder }),
                Model.fetchProjectTaskList({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder })
            ]);
 
            let assignedNonAdmin = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_non_admin_users))));
            let assignedUsers = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_users))));
            let assignUser = _.pluck(projectTasks, "assigned_user");
            if (assignedNonAdmin.length && assignedNonAdmin) assignedNonAdmin = await Model.fetchEmployeeDetails(organization_id, assignedNonAdmin);
            if (assignedUsers.length && assignedUsers) assignedUsers = await Model.fetchEmployeeDetails(organization_id, assignedUsers);
            if (assignUser.length && assignUser) assignUser = await Model.fetchEmployeeDetails(organization_id, assignUser);
            for (const projectTask of projectTasks) {
                let totalTaskedWorkedTime = 0;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.start_time && task_working_status.end_time) {
                        totalTaskedWorkedTime += moment(moment(task_working_status.end_time).utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                    else {
                        totalTaskedWorkedTime += moment(moment().utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                }
                projectTask.total_working_time = totalTaskedWorkedTime;
                if (projectTask.project_data.assigned_non_admin_users && projectTask.project_data.assigned_non_admin_users.length) {
                    projectTask.project_data.assigned_non_admin_users = assignedNonAdmin.filter(u => projectTask?.project_data?.assigned_non_admin_users?.includes(u.id))
                }
                if (projectTask.project_data.assigned_users && projectTask.project_data.assigned_users.length) {
                    projectTask.project_data.assigned_users = assignedUsers.filter(u => projectTask?.project_data?.assigned_users?.includes(u.id))
                }
                if (projectTask.assigned_user) projectTask.assigned_user = assignUser.find(u => u.id == projectTask.assigned_user);
            }
            return res.status(200).json({ code: 200, data: projectTasks, count: count?.count ?? 0, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchTaskListDownload(req, res, next) {
        try {
            let { organization_id, user_id, language, is_admin } = req.decoded;
            let { skip, limit, search, employee_id, manager_id, project_id, folder_id, start_date, end_date, task_id, sortColumn, sortOrder } = await Validation.validateFetchProjectTaskList().validateAsync(req.query);

            if (start_date && end_date) {
                start_date = moment(start_date).startOf('day').toISOString();
                end_date = moment(end_date).endOf('day').toISOString();
            }

            if (!is_admin) manager_id = req.decoded.employee_id;

            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskListDownload({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder }),
                Model.fetchProjectTaskListDownload({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder })
            ]);
 
            let assignedNonAdmin = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_non_admin_users))));
            let assignedUsers = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_users))));
            let assignUser = _.pluck(projectTasks, "assigned_user");

            if (assignedNonAdmin.length && assignedNonAdmin) assignedNonAdmin = await Model.fetchEmployeeDetails(organization_id, assignedNonAdmin);
            if (assignedUsers.length && assignedUsers) assignedUsers = await Model.fetchEmployeeDetails(organization_id, assignedUsers);
            if (assignUser.length && assignUser) assignUser = await Model.fetchEmployeeDetails(organization_id, assignUser);

            for (const projectTask of projectTasks) {
                let totalTaskedWorkedTime = 0;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.start_time && task_working_status.end_time) {
                        totalTaskedWorkedTime += moment(moment(task_working_status.end_time).utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                    else {
                        totalTaskedWorkedTime += moment(moment().utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                }
                projectTask.total_working_time = totalTaskedWorkedTime;
                if (projectTask.project_data.assigned_non_admin_users && projectTask.project_data.assigned_non_admin_users.length) {
                    projectTask.project_data.assigned_non_admin_users = assignedNonAdmin.filter(u => projectTask?.project_data?.assigned_non_admin_users?.includes(u.id))
                }
                if (projectTask.project_data.assigned_users && projectTask.project_data.assigned_users.length) {
                    projectTask.project_data.assigned_users = assignedUsers.filter(u => projectTask?.project_data?.assigned_users?.includes(u.id))
                }
                if (projectTask.assigned_user) projectTask.assigned_user = assignUser.find(u => u.id == projectTask.assigned_user);
            }

            return res.status(200).json({ code: 200, data: projectTasks, count: count?.count ?? 0, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchTaskListDownloadNonConsolidated(req, res, next) {
        try {
            let { organization_id, user_id, language, is_admin } = req.decoded;
            let { skip, limit, search, employee_id, manager_id, project_id, folder_id, start_date, end_date, task_id, sortColumn, sortOrder } = await Validation.validateFetchProjectTaskList().validateAsync(req.query);

            if (start_date && end_date) {
                start_date = moment(start_date).startOf('day').toISOString();
                end_date = moment(end_date).endOf('day').toISOString();
            }

            if (!is_admin) manager_id = req.decoded.employee_id;

            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskListDownload({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder }),
                Model.fetchProjectTaskListDownload({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder })
            ]);
 
            let assignedNonAdmin = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_non_admin_users))));
            let assignedUsers = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_users))));
            let assignUser = _.pluck(projectTasks, "assigned_user");

            if (assignedNonAdmin.length && assignedNonAdmin) assignedNonAdmin = await Model.fetchEmployeeDetails(organization_id, assignedNonAdmin);
            if (assignedUsers.length && assignedUsers) assignedUsers = await Model.fetchEmployeeDetails(organization_id, assignedUsers);
            if (assignUser.length && assignUser) assignUser = await Model.fetchEmployeeDetails(organization_id, assignUser);

            for (const projectTask of projectTasks) {
                let totalTaskedWorkedTime = 0;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.start_time && task_working_status.end_time) {
                        totalTaskedWorkedTime += moment(moment(task_working_status.end_time).utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                    else {
                        totalTaskedWorkedTime += moment(moment().utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                }
                projectTask.total_working_time = totalTaskedWorkedTime;
                if (projectTask.project_data.assigned_non_admin_users && projectTask.project_data.assigned_non_admin_users.length) {
                    projectTask.project_data.assigned_non_admin_users = assignedNonAdmin.filter(u => projectTask?.project_data?.assigned_non_admin_users?.includes(u.id))
                }
                if (projectTask.project_data.assigned_users && projectTask.project_data.assigned_users.length) {
                    projectTask.project_data.assigned_users = assignedUsers.filter(u => projectTask?.project_data?.assigned_users?.includes(u.id))
                }
                if (projectTask.assigned_user) projectTask.assigned_user = assignUser.find(u => u.id == projectTask.assigned_user);
            }

            const finalProjectTask = [];

            for (const pTask of projectTasks) {
                const baseData = {
                    _id: pTask._id,
                    employee_id: pTask?.assigned_user?.id,
                    first_name: pTask?.assigned_user?.first_name,
                    last_name: pTask?.assigned_user?.last_name,
                    email: pTask?.assigned_user?.email,
                    location_name: pTask?.assigned_user?.location_name,
                    department_name: pTask?.assigned_user?.department_name,
                    timezone: pTask?.assigned_user?.timezone,
                    folder_name: pTask.folder_data.name,
                    project_name: pTask.project_data.title,
                    task_name: pTask.name
                };
            

                if (pTask.task_working_status.length === 0) {
                    finalProjectTask.push({ ...baseData, total_working_time: 0 });
                } else {

                    for (const taskWorkingStatus of pTask.task_working_status) {
                        const { start_time, end_time, is_desktop_task = false } = taskWorkingStatus;
                        const total_working_time = start_time 
                            ? moment(end_time || moment().utc()).diff(moment(start_time).utc(), 'seconds') 
                            : 0;
            
                        if (
                            moment(start_time).isBefore(start_date) &&
                            moment(end_time).isAfter(end_date)
                        ) {
                            finalProjectTask.push({
                                ...baseData,
                                start_time,
                                end_time,
                                total_working_time,
                                is_desktop_task: is_desktop_task ?? false
                            });
                        }
                    }
                }
            }
            
            if(finalProjectTask.length == 0) return res.status(200).json({ code: 200, data: finalProjectTask,  error: null, message: translate.find(i => i.id == 56)[language || 'en'] });
            return res.status(200).json({ code: 200, data: finalProjectTask,  error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }


    async fetchProjectDetails(req, res, next) {
        try {
            let { organization_id, user_id, language, is_admin } = req.decoded;
            let { project_id } = await Validation.validateProjectId().validateAsync(req.query);
            let manager_id = null;
            if (!is_admin) manager_id = req.decoded.employee_id;
            let projectDetails = await Model.fetchProjectDetails({ organization_id, project_id });
            if (projectDetails[0].title == "Default") {
                let result = await Model.fetchAllEmployeeDetails(organization_id);
                result = result.map(result => result.id);
                projectDetails[0].assigned_users = result;
            }

            let assignedNonAdmin = Array.from(new Set(arrayParser(projectDetails.map(pt => pt.assigned_non_admin_users))));
            let assignedUsers = Array.from(new Set(arrayParser(projectDetails.map(pt => pt.assigned_users))));

            if (assignedNonAdmin.length && assignedNonAdmin) assignedNonAdmin = await Model.fetchEmployeeDetails(organization_id, assignedNonAdmin);
            if (assignedUsers.length && assignedUsers) assignedUsers = await Model.fetchEmployeeDetails(organization_id, assignedUsers);

            for (let projectDetail of projectDetails) {
                if (projectDetail.assigned_non_admin_users && projectDetail.assigned_non_admin_users.length) {
                    projectDetail.assigned_non_admin_users = assignedNonAdmin.filter(u => projectDetail?.assigned_non_admin_users?.includes(u.id))
                }
                if (projectDetail.assigned_users && projectDetail.assigned_users.length) {
                    projectDetail.assigned_users = assignedUsers.filter(u => projectDetail?.assigned_users?.includes(u.id))
                }
            }

            return res.status(200).json({ code: 200, data: projectDetails, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async assignEmployeeTask(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { task_id, employee_id } = await Validation.validateAssignEmployeeTask().validateAsync(req.body);

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });
            if (projectTask.assigned_user) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 21)[language || 'en'], data: null, error: null });
            projectTask.assigned_user = employee_id;
            await projectTask.save();

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 22)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async removeAssignEmployeeTask(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { task_id, employee_id } = await Validation.validateAssignEmployeeTask().validateAsync(req.body);

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            projectTask.assigned_user = null;
            await projectTask.save();

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 23)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async taskAssignEmployee(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { task_id } = await Validation.validateFetchAssignEmployeeTask().validateAsync(req.body);

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            if (projectTask.assigned_user) {
                let employeeDetails = await Model.fetchEmployeeDetails(organization_id, projectTask.assigned_user);
                if (!employeeDetails) return res.status(404).json({ code: 404, data: projectTask.assigned_user, error: null, message: translate.find(i => i.id == 25)[language || 'en'] });
                return res.status(200).json({ code: 200, data: employeeDetails, error: null, message: translate.find(i => i.id == 22)[language || 'en'] });
            }
            else return res.status(404).json({ code: 404, data: projectTask.assigned_user, error: null, message: translate.find(i => i.id == 25)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    async createProjectTaskTaskMobile(req, res, next) {
        try {
            let taskStartTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;
            let { title, project_id, folder_name, is_start } = await Validation.validateCreateProjectTask().validateAsync(req.body);
            // let isExist = await Model.findProjectTaskSameName({ title, organization_id, project_id, task_id: null });
            // if (isExist !== null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 13)[language || 'en'] });


            isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            isExist = await Model.findProjectFolderName({ name: folder_name, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });

            let projectTask = await Model.createProjectTask({ organization_id, title, project_id, folder_id: isExist._id, created_by: user_id, employee_id });

            if (is_start) {
                // assigned_user,status=1
                let task_id = projectTask._id;
                let isRunningTask = await Model.findRunningTask(employee_id);
                if (isRunningTask !== null) return res.status(200).json({ code: 200, message: translate.find(i => i.id == 47)[language || 'en'], data: null, error: null });

                projectTask = await Model.findTaskById({ _id: task_id });
                if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

                if (projectTask.assigned_user !== employee_id) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 26)[language || 'en'], data: null, error: null });
                if (projectTask.status === 1 || projectTask.status === 3) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 27)[language || 'en'], data: null, error: null });

                let [employeeShift] = await Model.getEmployeeShift(employee_id)
                let date = moment.tz(timezone).format('YYYY-MM-DD');
                if (employeeShift) {
                    let shiftData = JSON.parse(employeeShift.data)[moment.tz(timezone).format('dddd').toLowerCase().slice(0, 3)];
                    if (shiftData.status === true) {
                        if (ShiftUtils.isEndInNextDay(shiftData.time.start, shiftData.time.end) && moment(taskStartTime).isAfter(moment(shiftData.time.end, 'HH:mm').utc()) == false) {
                            date = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
                        }
                    }
                }
                let [employeeAttendance] = await Model.getEmployeeAttendance(date, employee_id)
                if (employeeAttendance) {
                    let prReport = await Model.getEmployeeAttendanceReport(moment(employeeAttendance.date).format('YYYY-MM-DD'), employee_id, organization_id);
                    projectTask.status = 1;
                    projectTask.task_working_status.push({
                        start_time: taskStartTime,
                        productivity_report_id: prReport._id
                    })
                    await projectTask.save();
                }
                else {
                    // Create Attendance Record and start application tracking.
                    let response = await Model.createAttendanceRecord(employee_id, organization_id, date, taskStartTime);
                    //response.insertId
                    let prReport = await Model.createEmployeeProductivityReport(department_id, location_id, employee_id, organization_id, date, taskStartTime);

                    projectTask.status = 1;
                    projectTask.task_working_status.push({
                        start_time: taskStartTime,
                        productivity_report_id: prReport._id
                    })
                    await projectTask.save();
                }
            }

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 15)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    async fetchProjectTaskMobile(req, res, next) {
        try {
            let { organization_id, user_id, employee_id, language } = req.decoded;
            let { skip, limit, search, project_id, folder_id } = await Validation.validateFetchProjectTask().validateAsync(req.query);

            let isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            isExist = await Model.findProjectFolder({ _id: folder_id, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });

            let projectTasks = await Model.fetchProjectTask({ skip, limit, search, organization_id, project_id, folder_id, employee_id });

            let assignEmployeeDetails = [];

            for (const projectTask of projectTasks) {
                if (projectTask.assigned_user) assignEmployeeDetails.push(projectTask.assigned_user);
            }

            let employeeDetails = [];
            if (assignEmployeeDetails.length) {
                employeeDetails = await Model.fetchEmployeeDetails(organization_id, Array.from(new Set(assignEmployeeDetails)));
            }

            for (const projectTask of projectTasks) {
                if (projectTask.assigned_user) {
                    projectTask.assigned_user = employeeDetails.find(i => i.id = projectTask.assigned_user)
                }
            }

            return res.status(200).json({ code: 200, data: projectTasks, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchTaskListMobile(req, res, next) {
        try {
            let { organization_id, user_id, language, employee_id } = req.decoded;
            let { skip, limit, search, project_id, folder_name, start_date, end_date, task_id, sort_by } = await Validation.validateFetchProjectTaskListMobile().validateAsync(req.query);

            if (start_date && end_date) {
                start_date = moment(start_date).toISOString();
                end_date = moment(end_date).add(1, 'days').toISOString();
            }

            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskListMobile({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id: null, project_id, folder_name, start_date, end_date, sort_by }),
                Model.fetchProjectTaskListMobile({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id: null, project_id, folder_name, start_date, end_date, sort_by })
            ]);

            let finialTaskList = [];
            for (const { task_working_status, ...remainingData } of projectTasks) {
                let activeTime = 0;

                switch (remainingData?.folder_data?.name) {
                    case 'Current Task':
                        remainingData.folder_data.name = translate.find(i => i.id == 48)[language || 'en'];
                        break;
                    case 'Next Task':
                        remainingData.folder_data.name = translate.find(i => i.id == 49)[language || 'en'];
                        break;
                    case 'Future Task':
                        remainingData.folder_data.name = translate.find(i => i.id == 50)[language || 'en'];
                        break;
                    case 'Finished Task':
                        remainingData.folder_data.name = translate.find(i => i.id == 51)[language || 'en'];
                        break;
                    default:
                        break;
                }

                if (task_working_status.length) {
                    for (const taskTiming of task_working_status) {
                        if (taskTiming.start_time && taskTiming.end_time) {
                            activeTime += moment(moment(taskTiming.end_time).utc().toISOString()).diff(moment(taskTiming.start_time).utc(), 'seconds');
                        }
                        else {
                            activeTime += moment(moment().utc().toISOString()).diff(moment(taskTiming.start_time).utc(), 'seconds');
                        }
                    }
                }
                finialTaskList.push({
                    ...remainingData,
                    active_time: activeTime
                })
            }

            return res.status(200).json({ code: 200, data: finialTaskList, count: count?.count ?? 0, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async startProjectTaskMobile(req, res, next) {
        try {
            let taskStartTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let taskActiveTimeIso = moment().utc().toISOString();

            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;

            let task_id = req.query.task_id;
            if (!task_id) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 39)[language || 'en'], data: null, error: null });

            // assigned_user,status=1
            let isRunningTask = await Model.findRunningTask(employee_id);
            if (isRunningTask !== null) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 40)[language || 'en'], data: null, error: null });

            let projectTask = await Model.findTaskById({ _id: task_id, organization_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            if(projectTask.is_desktop_running) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 27)[language || 'en'], data: null, error: null });
            if (projectTask.assigned_user !== employee_id) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 26)[language || 'en'], data: null, error: null });
            if (projectTask.status === 1 || projectTask.status === 3) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 27)[language || 'en'], data: null, error: null });

            let [employeeShift] = await Model.getEmployeeShift(employee_id)
            let date = moment(taskActiveTimeIso).utc().tz(timezone).format('YYYY-MM-DD');
            if (employeeShift) {
                let shiftData = JSON.parse(employeeShift.data)[moment.tz(timezone).format('dddd').toLowerCase().slice(0, 3)];
                if (shiftData.status === true) {
                    if (ShiftUtils.isEndInNextDay(shiftData.time.start, shiftData.time.end) && moment(taskActiveTimeIso).isAfter(moment(shiftData.time.end, 'HH:mm').utc()) == false) {
                        date = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
                    }
                }
            }
            let [employeeAttendance] = await Model.getEmployeeAttendance(date, employee_id)
            if (employeeAttendance) {
                let prReport = await Model.getEmployeeAttendanceReport(moment(employeeAttendance.date).format('YYYY-MM-DD'), employee_id, organization_id);
                projectTask.status = 1;
                projectTask.task_working_status.push({
                    start_time: taskActiveTimeIso,
                    productivity_report_id: prReport._id
                })
                projectTask.is_mobile_running = true;
                await projectTask.save();
            }
            else {
                // Create Attendance Record and start application tracking.
                let response = await Model.createAttendanceRecord(employee_id, organization_id, date, taskStartTime);
                //response.insertId
                let prReport = await Model.createEmployeeProductivityReport(department_id, location_id, employee_id, organization_id, date, taskStartTime);

                projectTask.status = 1;
                projectTask.task_working_status.push({
                    start_time: taskActiveTimeIso,
                    productivity_report_id: prReport._id
                })
                projectTask.is_mobile_running = true;
                await projectTask.save();
            }
            return res.status(200).json({ code: 200, message: translate.find(i => i.id == 28)[language || 'en'], data: projectTask, error: null });
        } catch (error) {
            next(error);
        }
    }

    async stopProjectTaskMobile(req, res, next) {
        try {
            const stopAttemptMomentUtc = moment.utc();
            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;

            let task_id = req.query.task_id;
            if (!task_id) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 39)[language || 'en'], data: null, error: null });

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            if (projectTask.assigned_user !== employee_id) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 26)[language || 'en'], data: null, error: null });
            if (projectTask.status === 0 || projectTask.status === 2 || projectTask.status === 3) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 41)[language || 'en'], data: null, error: null });
            if (projectTask.is_desktop_running) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 27)[language || 'en'], data: null, error: null });

            const activeWorkingStatus = projectTask.task_working_status.find(status => status.start_time && !status.end_time);
            if (!activeWorkingStatus) {
                return res.status(400).json({ code: 400, message: translate.find(i => i.id == 41)[language || 'en'], data: null, error: null });
            }

            const userTimezone = timezone || 'UTC';
            const taskStartMomentUtc = moment.utc(activeWorkingStatus.start_time);
            const taskStartMomentLocal = taskStartMomentUtc.clone().tz(userTimezone);
            const attendanceDate = taskStartMomentLocal.format('YYYY-MM-DD');

            const dayEndLocal = taskStartMomentLocal.clone().set({ hour: 23, minute: 59, second: 59, millisecond: 0 });
            let finalStopMomentUtc = stopAttemptMomentUtc.clone();
            const dayEndUtc = dayEndLocal.clone().utc();

            if (finalStopMomentUtc.isAfter(dayEndUtc)) {
                finalStopMomentUtc = dayEndUtc;
            }
            if (finalStopMomentUtc.isBefore(taskStartMomentUtc)) {
                finalStopMomentUtc = taskStartMomentUtc.clone();
            }

            const finalStopIso = finalStopMomentUtc.toISOString();
            const finalStopSql = finalStopMomentUtc.format('YYYY-MM-DD HH:mm:ss');
            let [employeeAttendance] = await Model.getEmployeeAttendance(attendanceDate, employee_id);

            if (!employeeAttendance) {
                const fallbackDate = moment().tz(userTimezone).format('YYYY-MM-DD');
                if (fallbackDate !== attendanceDate) {
                    [employeeAttendance] = await Model.getEmployeeAttendance(fallbackDate, employee_id);
                }
            }

            if (employeeAttendance) {
                let prReport = await Model.getEmployeeAttendanceReport(moment(employeeAttendance.date).format('YYYY-MM-DD'), employee_id, organization_id, false);

                let totalTaskTime = Math.max(0, finalStopMomentUtc.diff(taskStartMomentUtc, 'seconds'));
                projectTask.status = 2;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.end_time && task_working_status.start_time) continue;
                    if (!task_working_status.end_time && task_working_status.start_time) {
                        task_working_status.end_time = finalStopIso;
                        break;
                    }
                }
                projectTask.total_working_time = (projectTask.total_working_time || 0) + totalTaskTime;
                projectTask.task_remaining_time = null;
                projectTask.is_mobile_running = false;
                await projectTask.save();

                if (prReport && totalTaskTime > 0) {
                    prReport.productive_duration += totalTaskTime;
                    prReport.logged_duration += totalTaskTime;
                    await prReport.save();
                }

                await Model.updateEmployeeAttendance(employee_id, organization_id, employeeAttendance.attendance_id, finalStopSql);
                return res.status(200).json({ code: 200, message: translate.find(i => i.id == 30)[language || 'en'], data: projectTask, error: null });
            }
            else return res.status(404).json({ code: 404, message: translate.find(i => i.id == 42)[language || 'en'], error: null, data: null });
        } catch (error) {
            next(error);
        }
    }

    async finishProjectTaskMobile(req, res, next) {
        try {
            const finishAttemptMomentUtc = moment.utc();
            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;

            let task_id = req.query.task_id;
            if (!task_id) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 39)[language || 'en'], data: null, error: null });

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            if(projectTask.status == 1 && projectTask.is_desktop_running) return res.status(401).json({ code: 401, data: null, error: null, message: translate.find(i=> i.id == 27)[language || 'en']})

            if (projectTask.assigned_user !== employee_id) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 26)[language || 'en'], data: null, error: null });

            let finishedFolder = await Model.findProjectFolderSameName({ title: "Finished Task", project_id: projectTask.project_id, organization_id, })
            if (!finishedFolder) {
                finishedFolder = await Model.createProjectFolder({ organization_id, project_id: projectTask.project_id, title: "Finished Task" });
                if (!finishedFolder) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 44)[language || 'en'], data: null, error: null });
            }

            const userTimezone = timezone || 'UTC';

            if(projectTask.status === 2) {
                projectTask.folder_id = finishedFolder._id;
                projectTask.status = 3;
                projectTask.task_remaining_time = null;
                projectTask.is_mobile_running = false;
                await projectTask.save();
                return res.status(200).json({ code: 200, message: translate.find(i => i.id == 29)[language || 'en'], data: projectTask, error: null });
            }

            const activeWorkingStatus = projectTask.task_working_status.find(status => status.start_time && !status.end_time);
            if (!activeWorkingStatus) {
                return res.status(400).json({ code: 400, message: translate.find(i => i.id == 41)[language || 'en'], data: null, error: null });
            }

            const taskStartMomentUtc = moment.utc(activeWorkingStatus.start_time);
            const taskStartMomentLocal = taskStartMomentUtc.clone().tz(userTimezone);
            const attendanceDate = taskStartMomentLocal.format('YYYY-MM-DD');

            const dayEndLocal = taskStartMomentLocal.clone().set({ hour: 23, minute: 59, second: 59, millisecond: 0 });
            let finalFinishMomentUtc = finishAttemptMomentUtc.clone();
            const dayEndUtc = dayEndLocal.clone().utc();

            if (finalFinishMomentUtc.isAfter(dayEndUtc)) {
                finalFinishMomentUtc = dayEndUtc;
            }
            if (finalFinishMomentUtc.isBefore(taskStartMomentUtc)) {
                finalFinishMomentUtc = taskStartMomentUtc.clone();
            }

            const finalFinishIso = finalFinishMomentUtc.toISOString();
            const finalFinishSql = finalFinishMomentUtc.format('YYYY-MM-DD HH:mm:ss');

            let [employeeShift] = await Model.getEmployeeShift(employee_id);
            let date = finalFinishMomentUtc.clone().tz(userTimezone).format('YYYY-MM-DD');
            if (employeeShift) {
                const dayKey = finalFinishMomentUtc.clone().tz(userTimezone).format('dddd').toLowerCase().slice(0, 3);
                let shiftData = JSON.parse(employeeShift.data)[dayKey];
                if (shiftData?.status === true) {
                    if (ShiftUtils.isEndInNextDay(shiftData.time.start, shiftData.time.end) && moment(finalFinishIso).isAfter(moment(shiftData.time.end, 'HH:mm').utc()) == false) {
                        date = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
                    }
                }
            }

            let [employeeAttendance] = await Model.getEmployeeAttendance(date, employee_id);
            if (!employeeAttendance && date !== attendanceDate) {
                [employeeAttendance] = await Model.getEmployeeAttendance(attendanceDate, employee_id);
            }

            if (employeeAttendance) {
                let prReport = await Model.getEmployeeAttendanceReport(moment(employeeAttendance.date).format('YYYY-MM-DD'), employee_id, organization_id);

                let totalTaskTime = Math.max(0, finalFinishMomentUtc.diff(taskStartMomentUtc, 'seconds'));
                projectTask.status = 3;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.end_time && task_working_status.start_time) continue;
                    if (!task_working_status.end_time && task_working_status.start_time) {
                        task_working_status.end_time = finalFinishIso;
                        break;
                    }
                }
                projectTask.task_finished_time = finalFinishIso;
                projectTask.total_working_time = (projectTask.total_working_time || 0) + totalTaskTime;
                projectTask.folder_id = finishedFolder._id;
                projectTask.task_remaining_time = null;
                projectTask.is_mobile_running = false;
                await projectTask.save();

                if (prReport && totalTaskTime > 0) {
                    prReport.productive_duration += totalTaskTime;
                    prReport.logged_duration += totalTaskTime;
                    await prReport.save();
                }

                await Model.updateEmployeeAttendance(employee_id, organization_id, employeeAttendance.attendance_id, finalFinishSql);

                return res.status(200).json({ code: 200, message: translate.find(i => i.id == 29)[language || 'en'], data: projectTask, error: null });
            }
            else return res.status(404).json({ code: 404, message: translate.find(i => i.id == 42)[language || 'en'], error: null, data: null });
        } catch (error) {
            next(error);
        }
    }

    async finishProjectTaskMultipleMobile(req, res, next) {
        try {
            let taskEndTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let taskEndIsoString = moment().utc().toISOString();
            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;

            let { _ids: task_ids } = await Validation.validateDeleteMultipleProjectTask().validateAsync(req.body);

            let success = [];
            let error = [];

            for (const task_id of task_ids) {
                try {
                    let projectTask = await Model.findTaskById({ _id: task_id });
                    if (!projectTask) {
                        error.push(task_id);
                        continue;
                    }
        
                    if (projectTask.assigned_user !== employee_id) {
                        error.push(task_id);
                        continue;
                    }
        
                    let finishedFolder = await Model.findProjectFolderSameName({ title: "Finished Task", project_id: projectTask.project_id, organization_id, })
                    if (!finishedFolder) {
                        finishedFolder = await Model.createProjectFolder({ organization_id, project_id: projectTask.project_id, title: "Finished Task" });
                        if (!finishedFolder) {
                            error.push(task_id);
                            continue;
                        }
                    }
        
                    let [employeeShift] = await Model.getEmployeeShift(employee_id)
                    let date = moment.tz(timezone).format('YYYY-MM-DD');
                    if (employeeShift) {
                        let shiftData = JSON.parse(employeeShift.data)[moment.tz(timezone).format('dddd').toLowerCase().slice(0, 3)];
                        if (shiftData.status === true) {
                            if (ShiftUtils.isEndInNextDay(shiftData.time.start, shiftData.time.end) && moment(taskEndIsoString).isAfter(moment(shiftData.time.end, 'HH:mm').utc()) == false) {
                                date = moment(date).subtract(1, 'days').format('YYYY-MM-DD');
                            }
                        }
                    }
                    if(projectTask.status === 2 || projectTask.status === 0) {
                        projectTask.folder_id = finishedFolder._id;
                        projectTask.task_remaining_time = null;
                        await projectTask.save();
                        success.push(task_id);
                        continue;
                    }
                    let [employeeAttendance] = await Model.getEmployeeAttendance(date, employee_id);
                    if (employeeAttendance) {
                        let prReport = await Model.getEmployeeAttendanceReport(moment(employeeAttendance.date).format('YYYY-MM-DD'), employee_id, organization_id);
        
                        let totalTaskTime = 0;
                        projectTask.status = 3;
                        for (const task_working_status of projectTask.task_working_status) {
                            if (task_working_status.end_time && task_working_status.start_time) continue;
                            if (!task_working_status.end_time && task_working_status.start_time) {
                                task_working_status.end_time = moment.utc(taskEndIsoString).toISOString();
                                totalTaskTime = moment(moment.utc(taskEndIsoString).toISOString()).diff(moment(task_working_status.start_time), 'second');
                            }
                        }
                        projectTask.task_finished_time = taskEndIsoString;
                        projectTask.total_working_time += totalTaskTime;
                        projectTask.folder_id = finishedFolder._id;
                        projectTask.task_remaining_time = null;
                        await projectTask.save();
                        prReport.productive_duration += totalTaskTime;
                        prReport.logged_duration += totalTaskTime;
                        await prReport.save();
                        await Model.updateEmployeeAttendance(employee_id, organization_id, employeeAttendance.attendance_id, taskEndTime);
        
                        success.push(task_id);
                        continue;
                    }
                    else {
                        error.push(task_id);
                        continue;
                    }
                } catch (error) {
                    error.push(task_id);
                    continue;         
                }
            }

            return res.status(200).json({ code: 200, message: translate.find(i => i.id == 29)[language || 'en'], data: {success, error}, error: null });
        } catch (error) {
            next(error);
        }
    }

    async addTaskReminder(req, res, next) {
        try {
            let taskTime = moment().utc();
            let { organization_id, user_id, employee_id, language } = req.decoded;
            let { remaining_time, task_id } = await Validation.validateTaskRemainingTime().validateAsync(req.body);
            taskTime = taskTime.add(remaining_time, 'seconds');

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });
            if (projectTask.assigned_user !== employee_id) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 26)[language || 'en'] });

            projectTask.task_remaining_time = taskTime
            await projectTask.save();

            return res.status(200).json({ code: 200, data: null, message: translate.find(i => i.id == 1)[language || 'en'], error: null });
        }
        catch (error) {
            next(error);
        }
    }

    async getWeeklyTaskDetail(req, res, next) {
        try {
            let { organization_id, user_id, employee_id, timezone, language, productive_hours } = req.decoded;
            let start_date = moment().tz(timezone).utc().subtract(6, 'days');
            let end_date = moment().tz(timezone).utc();

            let projectTask = await Model.getWeeklyTaskDetail(start_date, end_date, employee_id);
            let attendanceTimeClaim = await Model.getEmployeeAttendanceTimeClaim(start_date, end_date, employee_id, organization_id);

            let taskDataS = [];
            for (const { task_working_status } of projectTask) {
                taskDataS = [...task_working_status, ...taskDataS];
            }

            let dates = getDatesBetweenTwo(start_date, end_date);
            let weeklyDates = getWeeklyDates(moment().tz(timezone).format('YYYY-MM-DD'))
            weeklyDates = Object.keys(weeklyDates).map(key => weeklyDates[key]);

            let activityWeekly = {}
            let weeklyTotalWorkedTime = 0;

            for (const date of weeklyDates) {
                activityWeekly[moment(date).format('ddd').toLowerCase()] = 0;
                for (const pT of taskDataS) {
                    if (moment(pT.start_time).isBetween(moment(date).utc(), moment(date).utc().add(1, 'days')) && moment(pT.end_time).isBetween(moment(date).utc(), moment(date).utc().add(1, 'days'))) {
                        activityWeekly[moment(date).format('ddd').toLowerCase()] += moment(pT.end_time).diff(moment(pT.start_time), 'seconds');
                        weeklyTotalWorkedTime += moment(pT.end_time).diff(moment(pT.start_time), 'seconds');
                    }
                }
                let attendanceTimeRequests = attendanceTimeClaim.filter(i => i.date === date);
                for (const attRequest of attendanceTimeRequests) {
                    activityWeekly[moment(date).format('ddd').toLowerCase()] += moment(attRequest.end_time).diff(moment(attRequest.start_time), 'seconds');
                    weeklyTotalWorkedTime += moment(attRequest.end_time).diff(moment(attRequest.start_time), 'seconds');
                }
            }

            let topTaskWeekly = {}

            for (const iterator of projectTask) {
                topTaskWeekly[iterator._id] = iterator;
                topTaskWeekly[iterator._id]['total_working_hours'] = 0;
                for (const task of iterator.task_working_status) {
                    if (moment(task.start_time).isBetween(start_date, end_date) && moment(task.end_time).isBetween(start_date, end_date)) {
                        topTaskWeekly[iterator._id]['total_working_hours'] += moment(task.end_time).diff(moment(task.start_time), 'seconds');
                    }
                }
            }
            let weeklyRecordsTop = [];
            Object.keys(topTaskWeekly).forEach(key => {
                let temp = topTaskWeekly[key];
                delete temp.task_working_status;
                delete temp.task_remaining_time;
                delete temp.total_working_time;
                delete temp.is_deleted;
                delete temp.status;
                weeklyRecordsTop.push(temp);
            })
            weeklyRecordsTop = weeklyRecordsTop.sort((a, b) => b.total_working_hours - a.total_working_hours)
            weeklyRecordsTop.length = 5;
            weeklyRecordsTop = weeklyRecordsTop.filter(a => a);

            //* For Monthly Record Fetch
            start_date = moment().subtract(1, 'months');
            end_date = moment();
            // Get Task for A Months
            let data = await Model.getWeeklyTaskDetail(start_date, end_date, employee_id);
            attendanceTimeClaim = await Model.getEmployeeAttendanceTimeClaim(start_date, end_date, employee_id, organization_id);
            taskDataS = [];
            let lastWorkingDate = [];
            for (const { task_working_status } of data) {
                for (const taskTime of task_working_status) {
                    if (taskTime.start_time) lastWorkingDate.push(moment(taskTime.start_time))
                    if (taskTime.end_time) lastWorkingDate.push(moment(taskTime.end_time))
                    else if (taskTime.start_time && !taskTime.end_time) lastWorkingDate.push(moment().utc())
                }
                taskDataS = [...task_working_status, ...taskDataS];
            }

            let totalWorkedTime = 0;

            for (const taskData of taskDataS) {
                if (moment(taskData.start_time).isBetween(start_date, end_date) && moment(taskData.end_time).isBetween(start_date, end_date)) {
                    totalWorkedTime += moment(taskData.end_time).diff(moment(taskData.start_time), 'seconds');
                }
            }

            for (const attRequest of attendanceTimeClaim) {
                totalWorkedTime+=moment(attRequest.end_time).diff(moment(attRequest.start_time), 'seconds');
            }

            let timeWorked = {
                today: activityWeekly[moment().format('ddd').toLowerCase()],
                weekly: weeklyTotalWorkedTime,
                montly: totalWorkedTime
            }

            return res.status(200).json({ code: 200, data: { activityWeekly, timeWorked, weeklyRecordsTop, lastWorkingTime: lastWorkingDate.length == 0 ? null : moment.utc(moment.max(lastWorkingDate)).tz(timezone).format('YYYY-MM-DD HH:mm:ss'), productive_hours, timezone }, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async getAssignedUserStatus(req, res, next) {
        try {
            let { employee_id, organization_id, language } = req.decoded;
            let [{ count }] = await Model.getEmployeeAssignedStatus(employee_id, organization_id);
            return res.status(200).json({ code: 200, data: { show: count === 0 ? false : true }, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    async getAssignedUserList(req, res, next) {
        try {
            let { employee_id, organization_id, language } = req.decoded;
            let { skip, limit, search } = await Validation.validateGetAssignedUserList().validateAsync(req.query);

            let [assignedUsers, [{ count: assignedUserCount }]] = await Promise.all([
                Model.getEmployeeAssignedList(employee_id, organization_id, skip, limit, search),
                Model.getEmployeeAssignedListCount(employee_id, organization_id, search)
            ])

            let pendingTask = await Model.findRunningTaskMultiple(_.pluck(assignedUsers, 'id'));
            let finalResult = []
            for (let assignedUser of assignedUsers) {
                assignedUser.current_status = pendingTask.find(t => t.assigned_user === assignedUser.id) ? true : false;
                finalResult.push(assignedUser);
            }

            return res.status(200).json({ code: 200, data: finalResult, count: assignedUserCount, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    async getDashboardStatsAssignedEmployees(req, res, next) {
        try {
            let { organization_id, user_id, timezone, employee_id: admin_id, language, productive_hours } = req.decoded;
            let employee_id = +req.query.employee_id;
            if (!employee_id) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 32)[language || 'en'], error: null });

            //checking is user is assigned or not
            let [checkStatus] = await Model.checkEmployeeAssigned(employee_id, admin_id, organization_id);
            if (!checkStatus) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 31)[language || 'en'], error: null });

            let start_date = moment().tz(timezone).utc().subtract(6, 'days');
            let end_date = moment().tz(timezone).utc();

            let projectTask = await Model.getWeeklyTaskDetail(start_date, end_date, employee_id);
            let attendanceTimeClaim = await Model.getEmployeeAttendanceTimeClaim(start_date, end_date, employee_id, organization_id);
            let taskDataS = [];
            for (const { task_working_status } of projectTask) {
                taskDataS = [...task_working_status, ...taskDataS];
            }

            let dates = getDatesBetweenTwo(start_date, end_date);
            let weeklyDates = getWeeklyDates(moment().tz(timezone).format('YYYY-MM-DD'))
            weeklyDates = Object.keys(weeklyDates).map(key => weeklyDates[key]);

            let activityWeekly = {}
            let weeklyTotalWorkedTime = 0;

            for (const date of weeklyDates) {
                activityWeekly[moment(date).format('ddd').toLowerCase()] = 0;
                for (const pT of taskDataS) {
                    if (moment(pT.start_time).isBetween(moment(date).utc(), moment(date).utc().add(1, 'days')) && moment(pT.end_time).isBetween(moment(date).utc(), moment(date).utc().add(1, 'days'))) {
                        activityWeekly[moment(date).format('ddd').toLowerCase()] += moment(pT.end_time).diff(moment(pT.start_time), 'seconds');
                        weeklyTotalWorkedTime += moment(pT.end_time).diff(moment(pT.start_time), 'seconds');
                    }
                }
                let attendanceTimeRequests = attendanceTimeClaim.filter(i => i.date === date);
                for (const attRequest of attendanceTimeRequests) {
                    activityWeekly[moment(date).format('ddd').toLowerCase()] += moment(attRequest.end_time).diff(moment(attRequest.start_time), 'seconds');
                    weeklyTotalWorkedTime += moment(attRequest.end_time).diff(moment(attRequest.start_time), 'seconds');
                }
            }

            let topTaskWeekly = {}

            for (const iterator of projectTask) {
                topTaskWeekly[iterator._id] = iterator;
                topTaskWeekly[iterator._id]['total_working_hours'] = 0;
                for (const task of iterator.task_working_status) {
                    if (moment(task.start_time).isBetween(start_date, end_date) && moment(task.end_time).isBetween(start_date, end_date)) {
                        topTaskWeekly[iterator._id]['total_working_hours'] += moment(task.end_time).diff(moment(task.start_time), 'seconds');
                    }
                }
            }
            let weeklyRecordsTop = [];
            Object.keys(topTaskWeekly).forEach(key => {
                let temp = topTaskWeekly[key];
                delete temp.task_working_status;
                delete temp.task_remaining_time;
                delete temp.total_working_time;
                delete temp.is_deleted;
                delete temp.status;
                weeklyRecordsTop.push(temp);
            })
            weeklyRecordsTop = weeklyRecordsTop.sort((a, b) => b.total_working_hours - a.total_working_hours)
            weeklyRecordsTop.length = 5;
            weeklyRecordsTop = weeklyRecordsTop.filter(a => a);

            //* For Monthly Record Fetch
            start_date = moment().subtract(1, 'months');
            end_date = moment();
            // Get Task for A Months
            let data = await Model.getWeeklyTaskDetail(start_date, end_date, employee_id);
            attendanceTimeClaim = await Model.getEmployeeAttendanceTimeClaim(start_date, end_date, employee_id, organization_id);
            taskDataS = [];
            let lastWorkingDate = [];
            for (const { task_working_status } of data) {
                for (const taskTime of task_working_status) {
                    if (taskTime.start_time) lastWorkingDate.push(moment(taskTime.start_time))
                    if (taskTime.end_time) lastWorkingDate.push(moment(taskTime.end_time))
                    else if (taskTime.start_time && !taskTime.end_time) lastWorkingDate.push(moment().utc())
                }
                taskDataS = [...task_working_status, ...taskDataS];
            }

            let totalWorkedTime = 0;

            for (const taskData of taskDataS) {
                if (moment(taskData.start_time).isBetween(start_date, end_date) && moment(taskData.end_time).isBetween(start_date, end_date)) {
                    totalWorkedTime += moment(taskData.end_time).diff(moment(taskData.start_time), 'seconds');
                }
            }

            for (const attRequest of attendanceTimeClaim) {
                totalWorkedTime+=moment(attRequest.end_time).diff(moment(attRequest.start_time), 'seconds');
            }

            let timeWorked = {
                today: activityWeekly[moment().format('ddd').toLowerCase()],
                weekly: weeklyTotalWorkedTime,
                montly: totalWorkedTime
            }

            return res.status(200).json({ code: 200, data: { activityWeekly, timeWorked, weeklyRecordsTop, lastWorkingTime: lastWorkingDate.length == 0 ? null : moment.utc(moment.max(lastWorkingDate)).tz(checkStatus.timezone || timezone).format('YYYY-MM-DD HH:mm:ss'), productive_hours, timezone: checkStatus.timezone || timezone }, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async getTaskDetail(req, res, next) {
        try {
            let { organization_id, language } = req.decoded;
            let employee_id = req.query.employee_id;
            if (!employee_id) return res.json({ code: 400, message: translate.find(i => i.id == 32)[language || 'en'], data: null, error: null });
            let { startDate, endDate } = req.query;

            let [employee_timezone] = await Model.getEmployeeTimezone(employee_id, organization_id);

            // Parse the provided date in the user's timezone
            const start_time = moment.tz(startDate, 'YYYY-MM-DD', employee_timezone.timezone || 'UTC');
            const end_time = moment.tz(endDate, 'YYYY-MM-DD', employee_timezone.timezone || 'UTC');
            start_time.startOf('day');
            end_time.startOf('day');
            let mobileUsages = await Model.getEmployeeMobileUsage(employee_id, organization_id, start_time.utc().add('-1', 'minute').toISOString(), end_time.utc().add('1', 'day').add('1', 'minute').toISOString());
            let totalMobileUsage = 0;
            let taskWorked = [];
            for (const { task_working_status, ...props } of mobileUsages) {
                for (const { productivity_report_id, ...task } of task_working_status) {
                    if (moment(task.start_time).isBetween(start_time.utc(), end_time.utc()) && moment(task.end_time).isBetween(start_time.utc(), end_time.utc())) {
                        let timespend = moment(task.end_time).diff(moment(task.start_time), 'seconds');
                        totalMobileUsage += timespend;
                        taskWorked.push({
                            ...task, timespend,
                            ...props,
                            timezone: employee_timezone.timezone || 'UTC'
                        })
                    }
                }
            }
            return res.status(200).json({ code: 200, data: { taskWorked, totalMobileUsage }, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    getCurrentLocalizationStatus (req, res, next) {
        try {
            let { language } = req.decoded;
            return res.status(200).json({ code: 200, data: language, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    async updateCurrentLocalizationStatus (req, res, next) {
        try {
            let { language: lang, user_id, employee_id } = req.decoded;
            let language = req.query.language;
            if(!['en', 'ar'].includes(language)) return res.status(403).json({ code: 403, data: null, error: null, message: translate.find(i => i.id == 52)[language || 'en'] });
            req.decoded.language = language;
            await redis.setAsync(`${user_id}_mobile_user`, JSON.stringify({ ...req.decoded }), 'EX', CommonHelper.getTime(process.env.JWT_EXPIRY));
            await Model.updateEmployeeLocalizationStatus(employee_id, language);
            return res.status(200).json({ code: 200, data: language, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    async fetchTaskListDownloadNonConsolidatedMultipleEmployee(req, res, next) {
        try {
            let { organization_id, user_id, language, is_admin } = req.decoded;
            let { skip, limit, search, employee_id, manager_id, project_id, folder_id, start_date, end_date, task_id, sortColumn, sortOrder, employee_ids } = await Validation.validateFetchProjectTaskListMultipleEmployees().validateAsync(req.query);

            if (start_date && end_date) {
                start_date = moment(start_date).toISOString();
                end_date = moment(end_date).add(1, 'days').toISOString();
            }

            if (!is_admin) manager_id = req.decoded.employee_id;

            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskListDownloadMultipleEmployee({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder, employee_ids }),
                Model.fetchProjectTaskListDownloadMultipleEmployee({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder, employee_ids })
            ]);
 
            let assignedNonAdmin = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_non_admin_users))));
            let assignedUsers = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_users))));
            let assignUser = _.pluck(projectTasks, "assigned_user");

            if (assignedNonAdmin.length && assignedNonAdmin) assignedNonAdmin = await Model.fetchEmployeeDetails(organization_id, assignedNonAdmin);
            if (assignedUsers.length && assignedUsers) assignedUsers = await Model.fetchEmployeeDetails(organization_id, assignedUsers);
            if (assignUser.length && assignUser) assignUser = await Model.fetchEmployeeDetails(organization_id, assignUser);

            for (const projectTask of projectTasks) {
                let totalTaskedWorkedTime = 0;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.start_time && task_working_status.end_time) {
                        totalTaskedWorkedTime += moment(moment(task_working_status.end_time).utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                    else {
                        totalTaskedWorkedTime += moment(moment().utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                }
                projectTask.total_working_time = totalTaskedWorkedTime;
                if (projectTask.project_data.assigned_non_admin_users && projectTask.project_data.assigned_non_admin_users.length) {
                    projectTask.project_data.assigned_non_admin_users = assignedNonAdmin.filter(u => projectTask?.project_data?.assigned_non_admin_users?.includes(u.id))
                }
                if (projectTask.project_data.assigned_users && projectTask.project_data.assigned_users.length) {
                    projectTask.project_data.assigned_users = assignedUsers.filter(u => projectTask?.project_data?.assigned_users?.includes(u.id))
                }
                if (projectTask.assigned_user) projectTask.assigned_user = assignUser.find(u => u.id == projectTask.assigned_user);
            }

            const finalProjectTask = [];

            for (const pTask of projectTasks) {
                const baseData = {
                    _id: pTask._id,
                    employee_id: pTask?.assigned_user?.id,
                    first_name: pTask?.assigned_user?.first_name,
                    last_name: pTask?.assigned_user?.last_name,
                    email: pTask?.assigned_user?.email,
                    location_name: pTask?.assigned_user?.location_name,
                    department_name: pTask?.assigned_user?.department_name,
                    timezone: pTask?.assigned_user?.timezone,
                    folder_name: pTask.folder_data.name,
                    project_name: pTask.project_data.title,
                    task_name: pTask.name
                };
            

                if (pTask.task_working_status.length === 0) {
                    finalProjectTask.push({ ...baseData, total_working_time: 0 });
                } else {

                    for (const taskWorkingStatus of pTask.task_working_status) {
                        const { start_time, end_time, is_desktop_task = false } = taskWorkingStatus;
                        const total_working_time = start_time 
                            ? moment(end_time || moment().utc()).diff(moment(start_time).utc(), 'seconds') 
                            : 0;

                        if(moment(start_time).isBetween(start_date, end_date) && moment(end_time).isBetween(start_date, end_date)) {
                            finalProjectTask.push({
                                ...baseData,
                                start_time,
                                end_time,
                                total_working_time, 
                                is_desktop_task: is_desktop_task ?? false
                            });
                        }
                    }
                }
            }
            
            if(finalProjectTask.length == 0) return res.status(200).json({ code: 200, data: finalProjectTask,  error: null, message: translate.find(i => i.id == 56)[language || 'en'] });
            return res.status(200).json({ code: 200, data: finalProjectTask,  error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchTaskListDownloadMultipleEmployee(req, res, next) {
        try {
            let { organization_id, user_id, language, is_admin } = req.decoded;
            let { skip, limit, search, employee_id, manager_id, project_id, folder_id, start_date, end_date, task_id, sortColumn, sortOrder, employee_ids } = await Validation.validateFetchProjectTaskListMultipleEmployees().validateAsync(req.query);

            if (start_date && end_date) {
                start_date = moment(start_date).toISOString();
                end_date = moment(end_date).add(1, 'days').toISOString();
            }

            if (!is_admin) manager_id = req.decoded.employee_id;

            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskListDownloadMultipleEmployee({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder, employee_ids }),
                Model.fetchProjectTaskListDownloadMultipleEmployee({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder, employee_ids })
            ]);
 
            let assignedNonAdmin = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_non_admin_users))));
            let assignedUsers = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_users))));
            let assignUser = _.pluck(projectTasks, "assigned_user");

            if (assignedNonAdmin.length && assignedNonAdmin) assignedNonAdmin = await Model.fetchEmployeeDetails(organization_id, assignedNonAdmin);
            if (assignedUsers.length && assignedUsers) assignedUsers = await Model.fetchEmployeeDetails(organization_id, assignedUsers);
            if (assignUser.length && assignUser) assignUser = await Model.fetchEmployeeDetails(organization_id, assignUser);

            for (const projectTask of projectTasks) {
                let totalTaskedWorkedTime = 0;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.start_time && task_working_status.end_time) {
                        totalTaskedWorkedTime += moment(moment(task_working_status.end_time).utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                    else {
                        totalTaskedWorkedTime += moment(moment().utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                }
                projectTask.total_working_time = totalTaskedWorkedTime;
                if (projectTask.project_data.assigned_non_admin_users && projectTask.project_data.assigned_non_admin_users.length) {
                    projectTask.project_data.assigned_non_admin_users = assignedNonAdmin.filter(u => projectTask?.project_data?.assigned_non_admin_users?.includes(u.id))
                }
                if (projectTask.project_data.assigned_users && projectTask.project_data.assigned_users.length) {
                    projectTask.project_data.assigned_users = assignedUsers.filter(u => projectTask?.project_data?.assigned_users?.includes(u.id))
                }
                if (projectTask.assigned_user) projectTask.assigned_user = assignUser.find(u => u.id == projectTask.assigned_user);
            }

            return res.status(200).json({ code: 200, data: projectTasks, count: count?.count ?? 0, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async fetchTaskListMultipleEmployee(req, res, next) {
        try {
            let { organization_id, user_id, language, is_admin, is_manager, is_teamlead } = req.decoded;
            let { skip, limit, search, employee_id, manager_id, project_id, folder_id, start_date, end_date, task_id, sortColumn, sortOrder, employee_ids } = await Validation.validateFetchProjectTaskListMultipleEmployees().validateAsync(req.query);

            if (start_date && end_date) {
                start_date = moment(start_date).toISOString();
                end_date = moment(end_date).add(1, 'days').toISOString();
            }

            if (!is_admin && (is_manager || is_teamlead)) manager_id = req.decoded.employee_id;

            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskListMultipleEmployees({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder, employee_ids }),
                Model.fetchProjectTaskListMultipleEmployees({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder, employee_ids })
            ]);
 
            let assignedNonAdmin = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_non_admin_users))));
            let assignedUsers = Array.from(new Set(arrayParser(projectTasks.map(pt => pt.project_data.assigned_users))));
            let assignUser = _.pluck(projectTasks, "assigned_user");

            if (assignedNonAdmin.length && assignedNonAdmin) assignedNonAdmin = await Model.fetchEmployeeDetails(organization_id, assignedNonAdmin);
            if (assignedUsers.length && assignedUsers) assignedUsers = await Model.fetchEmployeeDetails(organization_id, assignedUsers);
            if (assignUser.length && assignUser) assignUser = await Model.fetchEmployeeDetails(organization_id, assignUser);

            for (const projectTask of projectTasks) {
                let totalTaskedWorkedTime = 0;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.start_time && task_working_status.end_time) {
                        totalTaskedWorkedTime += moment(moment(task_working_status.end_time).utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                    else {
                        totalTaskedWorkedTime += moment(moment().utc().toISOString()).diff(moment(task_working_status.start_time).utc(), 'seconds');
                    }
                }
                projectTask.total_working_time = totalTaskedWorkedTime;
                if (projectTask.project_data.assigned_non_admin_users && projectTask.project_data.assigned_non_admin_users.length) {
                    projectTask.project_data.assigned_non_admin_users = assignedNonAdmin.filter(u => projectTask?.project_data?.assigned_non_admin_users?.includes(u.id))
                }
                if (projectTask.project_data.assigned_users && projectTask.project_data.assigned_users.length) {
                    projectTask.project_data.assigned_users = assignedUsers.filter(u => projectTask?.project_data?.assigned_users?.includes(u.id))
                }
                if (projectTask.assigned_user) projectTask.assigned_user = assignUser.find(u => u.id == projectTask.assigned_user);
            }

            return res.status(200).json({ code: 200, data: projectTasks, count: count?.count ?? 0, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }


    async getProjectSilah(req, res, next) {
        try {
            let { organization_id, user_id, employee_id, language } = req.decoded;
            let { skip, limit, search } = await Validation.validateFetchProject().validateAsync(req.query);
            if (skip) skip = +skip;
            if (limit) limit = +limit;

            let [project, [projectCount]] = await Promise.all([
                Model.fetchProjectMobile({ skip, limit, search, organization_id, employee_id }),
                Model.fetchProjectMobile({ skip, limit, search, organization_id, employee_id, count: true })
            ])

            let defaultProjectStatus = await Model.fetchProject({ skip: 0, limit: 10, search: "Default", organization_id });
            defaultProjectStatus = defaultProjectStatus.filter(p => p.title == "Default");
            if (defaultProjectStatus.length === 0) {
                let projectCreated = await Model.createProject({ organization_id, title: "Default", description: "Default", created_by: user_id, start_date: moment().format('YYYY-MM-DD'), end_date: moment().add(1, 'months').format('YYYY-MM-DD') });
                if (projectCreated._id) {
                    await Model.createProjectFolder({ organization_id, title: "Current Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Next Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Future Task", project_id: projectCreated._id, created_by: user_id });
                    await Model.createProjectFolder({ organization_id, title: "Finished Task", project_id: projectCreated._id, created_by: user_id });
                }
                if (project.length < 10) project.push(projectCreated._doc);
            } else if (defaultProjectStatus.length !== 0 && project.filter(i => i.title === "Default").length == 0 && project.length < 10 && !search) {
                project.push(defaultProjectStatus[0]);
                if (projectCount) {
                    projectCount.count++;
                }
                else {
                    projectCount = { count: 1 };
                }
            }

            return res.status(200).json({ code: 200, data: project, error: null, message: translate.find(i => i.id == 1)[language || 'en'], count: projectCount?.count });
        } catch (error) {
            next(error);
        }
    }

    async getProjectFolderSilah(req, res, next) {
        try {
            let { organization_id, user_id, language } = req.decoded;
            let { skip, limit, search, project_id } = await Validation.validateFetchProjectFolder().validateAsync(req.query);
            if (skip) skip = +skip;
            if (limit) limit = +limit;
            let projectFolders = await Model.fetchProjectFolder({ skip, limit, search, organization_id, project_id });

            return res.status(200).json({ code: 200, data: projectFolders, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async getProjectTaskSilah(req, res, next) {
        try {
            let { organization_id, user_id, language, employee_id } = req.decoded;
            let { skip, limit, search, project_id, folder_name, start_date, end_date, task_id, sort_by } = await Validation.validateFetchProjectTaskListMobile().validateAsync(req.query);
            sort_by = 'ASC';
            if (start_date && end_date) {
                start_date = null;
                end_date = null;
            }

            let [projectTasks, [count]] = await Promise.all([
                Model.fetchProjectTaskListMobile({ skip, limit, search, organization_id, getCount: false, employee_id, task_id, manager_id: null, project_id, folder_name, start_date, end_date, sort_by }),
                Model.fetchProjectTaskListMobile({ skip, limit, search, organization_id, getCount: true, employee_id, task_id, manager_id: null, project_id, folder_name, start_date, end_date, sort_by })
            ]);

            let finialTaskList = [];
            for (const { task_working_status, ...remainingData } of projectTasks) {
                let activeTime = 0;

                switch (remainingData?.folder_data?.name) {
                    case 'Current Task':
                        remainingData.folder_data.name = translate.find(i => i.id == 48)[language || 'en'];
                        break;
                    case 'Next Task':
                        remainingData.folder_data.name = translate.find(i => i.id == 49)[language || 'en'];
                        break;
                    case 'Future Task':
                        remainingData.folder_data.name = translate.find(i => i.id == 50)[language || 'en'];
                        break;
                    case 'Finished Task':
                        remainingData.folder_data.name = translate.find(i => i.id == 51)[language || 'en'];
                        break;
                    default:
                        break;
                }

                if (task_working_status.length) {
                    for (const taskTiming of task_working_status) {
                        if (taskTiming.start_time && taskTiming.end_time) {
                            activeTime += moment(moment(taskTiming.end_time).utc().toISOString()).diff(moment(taskTiming.start_time).utc(), 'seconds');
                        }
                        else {
                            activeTime += moment(moment().utc().toISOString()).diff(moment(taskTiming.start_time).utc(), 'seconds');
                        }
                    }
                }
                finialTaskList.push({
                    ...remainingData,
                    active_time: activeTime
                })
            }

            return res.status(200).json({ code: 200, data: finialTaskList, count: count?.count ?? 0, error: null, message: translate.find(i => i.id == 1)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }

    async createProjectTaskNew(req, res, next) {
        try {
            let taskStartTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;
            let { title, project_id, folder_name, is_start, description } = await Validation.validateCreateProjectTaskNew().validateAsync(req.body);
            // let isExist = await Model.findProjectTaskSameName({ title, organization_id, project_id, task_id: null });
            // if (isExist !== null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 13)[language || 'en'] });


            isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            isExist = await Model.findProjectFolderName({ name: folder_name, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });

            let projectTask = await Model.createProjectTask({ organization_id, title, project_id, folder_id: isExist._id, created_by: user_id, employee_id, description });

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 15)[language || 'en'] });
        }
        catch (error) {
            next(error);
        }
    }

    async updateProjectTaskNew(req, res, next) {
        try {
            let taskStartTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;
            let { title, project_id, folder_name, task_id, is_start, description } = await Validation.validateUpdateProjectTaskMobileNew().validateAsync(req.body);

            let projectTask = await Model.findTaskById({ _id: task_id, organization_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            // let isExist = await Model.findProjectTaskSameName({ title, organization_id, project_id, task_id });
            // if (isExist !== null) {
            //     if (isExist._id !== projectTask._id) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 13)[language || 'en'] });
            // }

            isExist = await Model.findProject({ _id: project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 4)[language || 'en'] });

            isExist = await Model.findProjectFolderName({ name: folder_name, project_id });
            if (isExist === null) return res.status(400).json({ code: 400, data: null, error: null, message: translate.find(i => i.id == 38)[language || 'en'] });


            projectTask.name = title;
            projectTask.project_id = project_id;
            projectTask.folder_id = isExist._id;
            projectTask.description = description;
            await projectTask.save();

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 16)[language || 'en'] });
        } catch (error) {
            next(error);
        }
    }


    async deleteProjectTaskNew(req, res, next) {
        try {
            let taskEndTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let taskEndIsoString = moment().utc().toISOString();
            let { organization_id, user_id, language, timezone } = req.decoded;
            let { _id: task_id } = await Validation.validateDeleteProject().validateAsync(req.query);

            let projectTask = await Model.findTaskById({ _id: task_id, organization_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });

            let finishedFolder = await Model.findProjectFolderSameName({ title: "Finished Task", project_id: projectTask.project_id, organization_id, })
            if (!finishedFolder) {
                finishedFolder = await Model.createProjectFolder({ organization_id, project_id: projectTask.project_id, title: "Finished Task" });
                if (!finishedFolder) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 44)[language || 'en'], data: null, error: null });
            }


            if (projectTask.status === 2) {
                projectTask.folder_id = finishedFolder._id;
                projectTask.task_remaining_time = null;
                projectTask.is_deleted = true;
                projectTask.status = 3;
                await projectTask.save();
                return res.status(200).json({ code: 200, message: translate.find(i => i.id == 29)[language || 'en'], data: projectTask, error: null });
            }
            if (projectTask.status == 1) {
                let totalTaskTime = 0;

                projectTask.status = 3;
                for (const task_working_status of projectTask.task_working_status) {
                    if (task_working_status.end_time && task_working_status.start_time) continue;
                    if (!task_working_status.end_time && task_working_status.start_time) {
                        task_working_status.end_time = moment.utc(taskEndIsoString).toISOString();
                        totalTaskTime = moment(moment.utc(taskEndIsoString).toISOString()).diff(moment(task_working_status.start_time), 'second');
                        break;
                    }
                }
                projectTask.task_finished_time = taskEndIsoString;
                projectTask.total_working_time += totalTaskTime;
                projectTask.folder_id = finishedFolder._id;
                projectTask.task_remaining_time = null;
                projectTask.is_deleted = true;
                projectTask.is_desktop_running = false;
                await projectTask.save();
                return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 17)[language || 'en'] });
            }
            else {
                projectTask.is_deleted = true;
                await projectTask.save();
            }

            return res.status(200).json({ code: 200, data: projectTask, error: null, message: translate.find(i => i.id == 17)[language || 'en'] });
        } catch (error) {
            console.log(error);
            next(error);
        }
    }

    async startProjectTask(req, res, next) {
        try {
            let taskStartTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let taskActiveTimeIso = moment().utc().toISOString();

            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;

            let task_id = req.query.task_id;
            if (!task_id) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 39)[language || 'en'], data: null, error: null });

            let isRunningTask = await Model.findRunningTask(employee_id);
            if (isRunningTask !== null) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 40)[language || 'en'], data: null, error: null });

            let projectTask = await Model.findTaskById({ _id: task_id, organization_id });
            if (!projectTask) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 19)[language || 'en'], data: null, error: null });
            if (projectTask.is_mobile_running) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 55)[language || 'en'], data: null, error: null });
            if ([3].includes(projectTask.status)) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 27)[language || 'en'], data: null, error: null });

            projectTask.status = 1;
            projectTask.task_working_status.push({
                start_time: taskActiveTimeIso,
                // productivity_report_id: prReport._id,
                is_desktop_task: true
            })
            projectTask.is_desktop_running = true;
            await projectTask.save();
            
            return res.status(200).json({ code: 200, message: translate.find(i => i.id == 28)[language || 'en'], data: projectTask, error: null });
        }
        catch (error) {
            next(error);
        }
    }

    async stopProjectTask(req, res, next) {
        try {
            let taskEndTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let taskActiveTimeIso = moment().utc().toISOString();

            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;

            let task_id = req.query.task_id;
            if (!task_id) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 39)[language || 'en'], data: null, error: null });

            let projectTask = await Model.findTaskById({ _id: task_id, organization_id });
            if (!projectTask) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 19)[language || 'en'], data: null, error: null });
            if (projectTask.is_mobile_running) return res.status(400).json({ code: 400, message: translate.find(i => i.id == 55)[language || 'en'], data: null, error: null });
            if ([0, 2, 3].includes(projectTask.status)) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 27)[language || 'en'], data: null, error: null });

            let totalTaskTime = 0;
            projectTask.status = 2;
            for (const task_working_status of projectTask.task_working_status) {
                if (task_working_status.end_time && task_working_status.start_time) continue;
                if (!task_working_status.end_time && task_working_status.start_time) {
                    task_working_status.end_time = moment.utc(taskActiveTimeIso).toISOString();
                    totalTaskTime = moment(moment.utc(taskActiveTimeIso).toISOString()).diff(moment(task_working_status.start_time), 'second');
                }
            }
            projectTask.total_working_time += totalTaskTime;
            projectTask.task_remaining_time = null;
            projectTask.is_desktop_running = false;
            await projectTask.save();
            // prReport.productive_duration += totalTaskTime;
            // prReport.logged_duration += totalTaskTime;
            // await prReport.save();
            // await Model.updateEmployeeAttendance(employee_id, organization_id, employeeAttendance.attendance_id, taskEndTime);
            return res.status(200).json({ code: 200, message: translate.find(i => i.id == 30)[language || 'en'], data: projectTask, error: null });

        }
        catch (error) {
            console.log(error)
            next(error);
        }
    }

    async finishedProjectTask(req, res, next) {
        try {
            let taskEndTime = moment().utc().format('YYYY-MM-DD HH:mm:ss');
            let taskActiveTimeIso = moment().utc().toISOString();
            let taskEndIsoString = moment().utc().toISOString();

            let { timezone, employee_id, organization_id, department_id, location_id, user_id, language } = req.decoded;

            let task_id = req.query.task_id;
            if (!task_id) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 39)[language || 'en'], data: null, error: null });

            let projectTask = await Model.findTaskById({ _id: task_id, organization_id });
            if (!projectTask) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 19)[language || 'en'], data: null, error: null });
            if(projectTask.status == 1 && projectTask.is_mobile_running) return res.status(401).json({ code: 401, data: null, error: null, message: translate.find(i=> i.id == 55)[language || 'en']})
            if ([0].includes(projectTask.status)) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 56)[language || 'en'], data: null, error: null });
            if ([3].includes(projectTask.status)) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 27)[language || 'en'], data: null, error: null });

            let finishedFolder = await Model.findProjectFolderSameName({ title: "Finished Task", project_id: projectTask.project_id, organization_id, });
            if (!finishedFolder) {
                finishedFolder = await Model.createProjectFolder({ organization_id, project_id: projectTask.project_id, title: "Finished Task" });
                if (!finishedFolder) return res.status(404).json({ code: 404, message: translate.find(i => i.id == 44)[language || 'en'], data: null, error: null });
            }

            if (projectTask.status === 2) {
                projectTask.folder_id = finishedFolder._id;
                projectTask.task_remaining_time = null;
                projectTask.status = 3;
                projectTask.task_finished_time = taskEndIsoString;
                await projectTask.save();
                return res.status(200).json({ code: 200, message: translate.find(i => i.id == 29)[language || 'en'], data: projectTask, error: null });
            }

            let totalTaskTime = 0;
            projectTask.status = 3;
            for (const task_working_status of projectTask.task_working_status) {
                if (task_working_status.end_time && task_working_status.start_time) continue;
                if (!task_working_status.end_time && task_working_status.start_time) {
                    task_working_status.end_time = moment.utc(taskEndIsoString).toISOString();
                    totalTaskTime = moment(moment.utc(taskEndIsoString).toISOString()).diff(moment(task_working_status.start_time), 'second');
                }
            }
            projectTask.task_finished_time = taskEndIsoString;
            projectTask.total_working_time += totalTaskTime;
            projectTask.folder_id = finishedFolder._id;
            projectTask.task_remaining_time = null;
            await projectTask.save();
            // prReport.productive_duration += totalTaskTime;
            // prReport.logged_duration += totalTaskTime;
            // await prReport.save();
            // await Model.updateEmployeeAttendance(employee_id, organization_id, employeeAttendance.attendance_id, taskEndTime);
            return res.status(200).json({ code: 200, message: translate.find(i => i.id == 29)[language || 'en'], data: projectTask, error: null });
        }
        catch (error) {
            next(error);
        }
    }

    async addRemainingTime(req, res, next) {
        try {
            let taskTime = moment().utc();
            let { organization_id, user_id, employee_id, language } = req.decoded;
            let { remaining_time, task_id } = await Validation.validateTaskRemainingTime().validateAsync(req.body);
            taskTime = taskTime.add(remaining_time, 'seconds');

            let projectTask = await Model.findTaskById({ _id: task_id });
            if (!projectTask) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 19)[language || 'en'] });
            if (projectTask.assigned_user !== employee_id) return res.status(404).json({ code: 404, error: null, data: null, message: translate.find(i => i.id == 26)[language || 'en'] });

            projectTask.task_remaining_time = taskTime
            await projectTask.save();

            return res.status(200).json({ code: 200, data: null, message: translate.find(i => i.id == 1)[language || 'en'], error: null });
        }
        catch (error) {
            next(error);
        }
    }

    async assignAllEmployeeToAllProjects(req, res, next) {
        try {
            let { organization_id, language } = req.decoded;
            let [employees, projects] = await Promise.all([
                Model.fetchAllEmployeeDetails(organization_id),
                Model.fetchProject({ organization_id })
            ]);

            for (const project of projects) {
                project.assigned_users = employees.map(employee => employee.id);
                try {
                    await project.save();
                }
                catch (error) {
                    let proj = await Model.findProject({ _id: project._id });
                    proj.assigned_users = employees.map(employee => employee.id);
                    await proj.save();
                }
            }

            return res.status(200).json({ code: 200, data: null, message: translate.find(i => i.id == 1)[language || 'en'], error: null });
        }
        catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminDashboardController();


const getDatesBetweenTwo = (startDate, endDate) => {
    const datesBetween = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        datesBetween.push(new Date(currentDate).toISOString().slice(0, 10));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return (datesBetween);
}


const arrayParser = (arr) => {
    let temp = [];
    for (const iterator of arr) {
        if (Array.isArray(iterator)) temp = [...temp, ...arrayParser(iterator)];
        else temp.push(iterator);
    }
    return temp;
}


function getWeeklyDates(inputDate) {
    const result = {};
    const baseDate = moment(inputDate);

    // Get the previous Sunday
    const prevSunday = baseDate.clone().startOf('week');
    result['mon'] = prevSunday.format('YYYY-MM-DD');

    // Calculate and store the dates for the next six days
    for (let i = 1; i < 8; i++) {
        const currentDate = prevSunday.clone().add(i, 'days');
        result[currentDate.format('ddd').toLowerCase()] = currentDate.format('YYYY-MM-DD');
    }

    return result;
}
