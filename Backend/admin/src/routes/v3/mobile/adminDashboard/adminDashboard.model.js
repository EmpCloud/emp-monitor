const mongoose = require('mongoose');
const { ProjectSchemaModel, FolderSchemaModel, TaskSchemaModel } = require('../../../../models/silah_db.schema');
const EmployeeProductivityModel = require('../../../../models/employee_productivity.schema');
const ActivityRequestModel = require('../../../../models/activity_request.schema');

const mySql = require('../../../../database/MySqlConnection').getInstance();

const moment = require('moment');

class AdminDashboardModel {
    createProject({ organization_id, title, description, created_by, assigned_non_admin_users = null, assigned_users = null, start_date, end_date }) {
        if(start_date) start_date = moment(start_date).format('YYYY-MM-DD');
        if(end_date) end_date = moment(end_date).format('YYYY-MM-DD');
        return new ProjectSchemaModel({
            organization_id,
            title,
            description,
            created_by,
            assigned_non_admin_users,
            assigned_users,
            start_date, 
            end_date
        }).save();
    }

    findProjectSameName({ title, organization_id }) {
        return ProjectSchemaModel.findOne({
            title,
            organization_id,
            is_deleted: false,
        });
    }

    findProject({ _id, organization_id }) {
        const filter = { _id: _id, is_deleted: false };
        if (organization_id) filter.organization_id = organization_id;
        return ProjectSchemaModel.findOne(filter);
    }

    updatedProject({ organization_id, title, description, created_by, _id, assigned_non_admin_users, assigned_users, start_date, end_date }) {
        if(start_date) start_date = moment(start_date).format('YYYY-MM-DD');
        if(end_date) end_date = moment(end_date).format('YYYY-MM-DD');
        return ProjectSchemaModel.findOneAndUpdate({
            _id: new mongoose.Types.ObjectId(_id),
        }, {
            title,
            description,
            assigned_non_admin_users,
            assigned_users,
            start_date,
            end_date
        });
    }

    fetchProject({ skip, limit, search, organization_id, employee_id, non_admin_id, sort, count }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { title: new RegExp(search, 'i') },
                        { description: new RegExp(search, 'i') }
                    ]
                }
            });
        }

        if (employee_id) {
            pipeline.push({
              $match: {
                $or: [
                  {
                    assigned_users: {
                      $elemMatch: { $eq: employee_id },
                    },
                  },
                  {
                    title: "Default"
                  }
                ],
              },
            });
        }

        if (non_admin_id) {
            pipeline.push({
              $match: {
                $or: [
                  {
                    assigned_non_admin_users: {
                      $elemMatch: { $eq: non_admin_id },
                    },
                  },
                  {
                    title: "Default"
                  }
                ],
              },
            });
        }

        if (organization_id) {
            pipeline.push({
                $match: {
                    organization_id: organization_id,
                    is_deleted: false
                }
            });
        }

        if(count) {
            pipeline.push({
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            });
            return ProjectSchemaModel.aggregate(pipeline);
        }

        if(sort) {
            pipeline.push({
                $sort: {
                    title: sort == "ASC" ? 1 : -1
                }
            });
        }

        if (skip) {
            pipeline.push({ $skip: skip });
        }

        if (limit) {
            pipeline.push({ $limit: limit });
        }
        return ProjectSchemaModel.aggregate(pipeline);
    }

    fetchProjectMobile({ skip, limit, search, organization_id, employee_id, non_admin_id, count }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { title: new RegExp(search, 'i') },
                        { description: new RegExp(search, 'i') }
                    ]
                }
            });
        }

        if (employee_id && search !== "Default") {
            pipeline.push({
                $match: {
                    assigned_users: {
                        $elemMatch: { $eq: employee_id }
                    }
                }
            });
        }

        if (non_admin_id) {
            pipeline.push({
                $match: {
                    assigned_non_admin_users: {
                        $elemMatch: { $eq: non_admin_id }
                    }
                }
            });
        }

        if (organization_id) {
            pipeline.push({
                $match: {
                    organization_id: organization_id,
                    is_deleted: false
                }
            });
        }

        if(count) {
            pipeline.push({
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            });
            return ProjectSchemaModel.aggregate(pipeline);
        }

        if (skip) {
            pipeline.push({ $skip: skip });
        }

        if (limit) {
            pipeline.push({ $limit: limit });
        }
        return ProjectSchemaModel.aggregate(pipeline);
    }

    fetchEmployees(employee_ids, organization_id) {
        let query = `
            SELECT e.id, e.organization_id
                FROM employees e
                JOIN users u ON u.id = e.user_id
                WHERE e.organization_id = ? AND e.id IN (?)
        `
        return mySql.query(query, [organization_id, employee_ids]);
    }

    fetchEmployeeDetails(organization_id, assigned_users) {
        let query = `
            SELECT e.id, e.organization_id, u.first_name, u.last_name, u.email, ol.name as location_name, od.name as department_name
                FROM employees e
                JOIN users u ON u.id = e.user_id
                JOIN organization_locations ol ON ol.id = e.location_id
                JOIN organization_departments od ON od.id = e.department_id
                WHERE e.organization_id = ? AND e.id IN (?)
        `;
        return mySql.query(query, [organization_id, assigned_users]);
    }

    fetchAllEmployeeDetails(organization_id) {
        let query = `
            SELECT e.id FROM employees e 
            WHERE e.organization_id = ?
        `;
        return mySql.query(query, [organization_id]);
    }

    findProjectFolderSameName({ title, organization_id, project_id }) {
        return FolderSchemaModel.findOne({ name: title, organization_id, project_id, is_deleted: false });
    }

    createProjectFolder({ organization_id, title, project_id, created_by }) {
        return new FolderSchemaModel({
            organization_id,
            name: title,
            project_id: new mongoose.Types.ObjectId(project_id),
            created_by,
        }).save();
    }

    findProjectFolder({ _id, project_id }) {
        let query = {
            _id: _id,
            is_deleted: false,
        };
        if (project_id) query.project_id = new mongoose.Types.ObjectId(project_id);
        return FolderSchemaModel.findOne(query);
    }

    findProjectFolderName({ name, project_id }) {
        let query = {
            name: name,
            is_deleted: false,
        };
        if (project_id) query.project_id = new mongoose.Types.ObjectId(project_id);
        return FolderSchemaModel.findOne(query);
    }

    fetchProjectFolder({ skip, limit, search, organization_id, project_id }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    name: new RegExp(search, 'i') 
                }
            });
        }

        if (organization_id) {
            pipeline.push({
                $match: {
                    organization_id: organization_id,
                    is_deleted: false,
                    project_id: new mongoose.Types.ObjectId(project_id)
                }
            });
        }

        if (skip) {
            pipeline.push({ $skip: skip });
        }

        if (limit) {
            pipeline.push({ $limit: limit });
        }
        return FolderSchemaModel.aggregate(pipeline);

    }

    findProjectTaskSameName({ title, organization_id, project_id, folder_id, task_id }) {
        let query = { name: title, organization_id, project_id, is_deleted: false }
        if(folder_id) query.folder_id = new mongoose.Types.ObjectId(folder_id);
        if(task_id) query._id ={ $ne: [task_id] };
        return TaskSchemaModel.findOne(query);
    }

    createProjectTask({ organization_id, title, project_id, folder_id, created_by: user_id, employee_id = null, description = "" }) {
        let data = {
            organization_id,
            name: title,
            project_id: new mongoose.Types.ObjectId(project_id),
            folder_id: new mongoose.Types.ObjectId(folder_id),
            created_by: user_id,
            description
        }
        if(employee_id) data.assigned_user = employee_id;
        return new TaskSchemaModel(data).save()
    }

    findTaskById({ _id, organization_id }) {
        const filter = { _id: new mongoose.Types.ObjectId(_id), is_deleted: false };
        if (organization_id) filter.organization_id = organization_id;
        return TaskSchemaModel.findOne(filter);
    }

    fetchProjectTask({ skip, limit, search, organization_id, project_id, folder_id, employee_id = null }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    name: new RegExp(search, 'i')
                }
            });
        }

        if (employee_id) {
            pipeline.push({
                $match: {
                    assigned_user: employee_id
                }
            });
        }

        if (organization_id) {
            pipeline.push({
                $match: {
                    organization_id: organization_id,
                    is_deleted: false,
                    project_id: new mongoose.Types.ObjectId(project_id),
                    folder_id: new mongoose.Types.ObjectId(folder_id),
                }
            });
        }

        if (skip) {
            pipeline.push({ $skip: skip });
        }

        if (limit) {
            pipeline.push({ $limit: limit });
        }
        return TaskSchemaModel.aggregate(pipeline);

    }

    fetchProjectTaskList({ skip, limit, search, organization_id, getCount, employee_id,task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn,sortOrder }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    name: new RegExp(search, 'i')
                }
            });
        } 

        if (+employee_id) {
            pipeline.push({
                $match: {
                    assigned_user: +employee_id
                }
            });
        }

        if (task_id) {
            pipeline.push({
                $match: {
                    _id: new mongoose.Types.ObjectId(task_id)
                }
            });
        }
        
        if (project_id) {
            pipeline.push({
                $match: {
                    project_id: new mongoose.Types.ObjectId(project_id)
                }
            });
        }

        if (folder_id) {
            pipeline.push({
                $match: {
                    folder_id: new mongoose.Types.ObjectId(folder_id)
                }
            });
        }

        if (+organization_id) {
            pipeline.push({
                $match: {
                    organization_id: +organization_id,
                    is_deleted: false,
                }
            });
        }

        if (start_date && end_date) {
             let startDate = new Date(start_date);
            let endDate = new Date(end_date); 
            pipeline.push({
                $match: {
                    $or: [
                        {
                            "task_working_status.start_time": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            "task_working_status.end_time": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            createdAt: {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            updatedAt: {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            "project_data.createdAt": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            "project_data.updatedAt": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        }
                    ]
                }
            });
        }

        pipeline.push({ 
                $lookup: {
                  from: "folders",
                  localField: "folder_id",
                  foreignField: "_id",
                  as: "folder_data"
                }
              },
              {
                $unwind: "$folder_data"
              },
              {
                $lookup: {
                  from: "projects",
                  localField: "project_id",
                  foreignField: "_id",
                  as: "project_data"
                }
              },
              {
                $unwind: "$project_data"
              },
        );

        if(manager_id) {
            pipeline.push({
                $match: {
                    "$or": [
                        { "project_data.title": "Default" },
                        { "project_data.assigned_non_admin_users": +manager_id }
                    ]
                }
            });
        }

        pipeline.push(
            {
                $project: {
                  name: 1,
                  status: 1,
                  assigned_user: 1,
                  task_remaining_time: 1,
                  total_working_time: 1,
                  task_working_status: 1,
                  description: 1,
                  "folder_data._id": 1,
                  "folder_data.name": 1,
                  "project_data._id": 1,
                  "project_data.title": 1,
                  "project_data.assigned_non_admin_users": 1,
                  "project_data.assigned_users": 1,
                }
            }
        )

        if (sortColumn) {
            switch (sortColumn) {
                case 'project_name':
                    sortColumn = "project_data.title";
                    break;
                case 'folder_name':
                    sortColumn = "folder_data.name";
                    break;
                case 'task_name':
                    sortColumn = "name";
                    break;
                default:
                    sortColumn = "taskName";
            }
        
            const sortOrderValue = (sortOrder && sortOrder === 'A') ? 1 : -1;
            const sortObject = {};
            sortObject[sortColumn] = sortOrderValue;
        
            pipeline.push({
                $sort: sortObject
            });
        }
        
        if (getCount) {
            pipeline.push(
                { $group: { _id: null, count: { $sum: 1 } } },
        )
        }else{
            if (skip) {
                pipeline.push({ $skip: +skip });
            }
    
            if (+limit) {
                pipeline.push({ $limit: +limit });
            }
        }
        return TaskSchemaModel.aggregate(pipeline);
    }

    fetchProjectTaskListMultipleEmployees({ skip, limit, search, organization_id, getCount, employee_id,task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn, sortOrder, employee_ids }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    name: new RegExp(search, 'i')
                }
            });
        } 

        if (+employee_id) {
            pipeline.push({
                $match: {
                    assigned_user: +employee_id
                }
            });
        }

        if (employee_ids) {
            employee_ids = employee_ids
                .split(',')
                .map(i => i.trim())
                .filter(i => i !== '')  // remove empty entries
                .map(Number);
            if (employee_ids.length) {
                pipeline.push({
                    $match: {
                        assigned_user: { $in: employee_ids }
                    }
                });
            }
        }

        if (task_id) {
            pipeline.push({
                $match: {
                    _id: new mongoose.Types.ObjectId(task_id)
                }
            });
        }
        
        if (project_id) {
            pipeline.push({
                $match: {
                    project_id: new mongoose.Types.ObjectId(project_id)
                }
            });
        }

        if (folder_id) {
            pipeline.push({
                $match: {
                    folder_id: new mongoose.Types.ObjectId(folder_id)
                }
            });
        }

        if (+organization_id) {
            pipeline.push({
                $match: {
                    organization_id: +organization_id,
                    is_deleted: false,
                }
            });
        }

        if (start_date && end_date) {
             let startDate = new Date(start_date);
            let endDate = new Date(end_date); 
            pipeline.push({
                $match: {
                    $or: [
                        {
                            "task_working_status.start_time": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            "task_working_status.end_time": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            createdAt: {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            updatedAt: {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            "project_data.createdAt": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            "project_data.updatedAt": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        }
                    ]
                }
            });
        }

        pipeline.push({ 
                $lookup: {
                  from: "folders",
                  localField: "folder_id",
                  foreignField: "_id",
                  as: "folder_data"
                }
              },
              {
                $unwind: "$folder_data"
              },
              {
                $lookup: {
                  from: "projects",
                  localField: "project_id",
                  foreignField: "_id",
                  as: "project_data"
                }
              },
              {
                $unwind: "$project_data"
              },
        );

        if(manager_id) {
            pipeline.push({
                $match: {
                    "$or": [
                        { "project_data.title": "Default" },
                        { "project_data.assigned_non_admin_users": +manager_id }
                    ]
                }
            });
        }

        pipeline.push(
            {
                $project: {
                  name: 1,
                  status: 1,
                  assigned_user: 1,
                  task_remaining_time: 1,
                  total_working_time: 1,
                  task_working_status: 1,
                  description: 1,
                  "folder_data._id": 1,
                  "folder_data.name": 1,
                  "project_data._id": 1,
                  "project_data.title": 1,
                  "project_data.assigned_non_admin_users": 1,
                  "project_data.assigned_users": 1,
                }
            }
        )

        if (sortColumn) {
            switch (sortColumn) {
                case 'project_name':
                    sortColumn = "project_data.title";
                    break;
                case 'folder_name':
                    sortColumn = "folder_data.name";
                    break;
                case 'task_name':
                    sortColumn = "name";
                    break;
                default:
                    sortColumn = "taskName";
            }
        
            const sortOrderValue = (sortOrder && sortOrder === 'A') ? 1 : -1;
            const sortObject = {};
            sortObject[sortColumn] = sortOrderValue;
        
            pipeline.push({
                $sort: sortObject
            });
        }
        
        if (getCount) {
            pipeline.push(
                { $group: { _id: null, count: { $sum: 1 } } },
        )
        }else{
            if (skip) {
                pipeline.push({ $skip: +skip });
            }
    
            if (+limit) {
                pipeline.push({ $limit: +limit });
            }
        }
        return TaskSchemaModel.aggregate(pipeline);
    }

    fetchProjectTaskListDownload({ skip, limit, search, organization_id, getCount, employee_id,task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn,sortOrder }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    name: new RegExp(search, 'i')
                }
            });
        } 

        if (+employee_id) {
            pipeline.push({
                $match: {
                    assigned_user: +employee_id
                }
            });
        }

        if (task_id) {
            pipeline.push({
                $match: {
                    _id: new mongoose.Types.ObjectId(task_id)
                }
            });
        }
        
        if (project_id) {
            pipeline.push({
                $match: {
                    project_id: new mongoose.Types.ObjectId(project_id)
                }
            });
        }

        if (folder_id) {
            pipeline.push({
                $match: {
                    folder_id: new mongoose.Types.ObjectId(folder_id)
                }
            });
        }

        if (+organization_id) {
            pipeline.push({
                $match: {
                    organization_id: +organization_id,
                    is_deleted: false,
                }
            });
        }

        if (start_date && end_date) {
             let startDate = new Date(start_date);
            let endDate = new Date(end_date); 
            pipeline.push({
                $match: {
                    $or: [
                        {
                            "task_working_status.start_time": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            "task_working_status.end_time": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            createdAt: {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                    ]
                }
            });
        }

        pipeline.push({ 
                $lookup: {
                  from: "folders",
                  localField: "folder_id",
                  foreignField: "_id",
                  as: "folder_data"
                }
              },
              {
                $unwind: "$folder_data"
              },
              {
                $lookup: {
                  from: "projects",
                  localField: "project_id",
                  foreignField: "_id",
                  as: "project_data"
                }
              },
              {
                $unwind: "$project_data"
              },
        );

        if(manager_id) {
            pipeline.push({
                $match: {
                    "$or": [
                        { "project_data.title": "Default" },
                        { "project_data.assigned_non_admin_users": +manager_id }
                    ]
                }
            });
        }

        pipeline.push(
            {
                $project: {
                  name: 1,
                  status: 1,
                  assigned_user: 1,
                  task_remaining_time: 1,
                  total_working_time: 1,
                  task_working_status: 1,
                  description: 1,
                  "folder_data._id": 1,
                  "folder_data.name": 1,
                  "project_data._id": 1,
                  "project_data.title": 1,
                  "project_data.assigned_non_admin_users": 1,
                  "project_data.assigned_users": 1,
                }
            }
        )

        if (sortColumn) {
            switch (sortColumn) {
                case 'project_name':
                    sortColumn = "project_data.title";
                    break;
                case 'folder_name':
                    sortColumn = "folder_data.name";
                    break;
                case 'task_name':
                    sortColumn = "name";
                    break;
                default:
                    sortColumn = "taskName";
            }
        
            const sortOrderValue = (sortOrder && sortOrder === 'A') ? 1 : -1;
            const sortObject = {};
            sortObject[sortColumn] = sortOrderValue;
        
            pipeline.push({
                $sort: sortObject
            });
        }
        
        if (getCount) {
            pipeline.push(
                { $group: { _id: null, count: { $sum: 1 } } },
            )
        }
        return TaskSchemaModel.aggregate(pipeline);
    }

    fetchProjectTaskListDownloadMultipleEmployee({ skip, limit, search, organization_id, getCount, employee_id,task_id, manager_id, project_id, folder_id, start_date, end_date, sortColumn,sortOrder, employee_ids }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    name: new RegExp(search, 'i')
                }
            });
        } 

        if (+employee_id) {
            pipeline.push({
                $match: {
                    assigned_user: +employee_id
                }
            });
        }

        if (employee_ids) {
            employee_ids = employee_ids
                .split(',')
                .map(i => i.trim())
                .filter(i => i !== '')  // remove empty entries
                .map(Number);
            if (employee_ids.length) {
                pipeline.push({
                    $match: {
                        assigned_user: { $in: employee_ids }
                    }
                });
            }
        }

        if (task_id) {
            pipeline.push({
                $match: {
                    _id: new mongoose.Types.ObjectId(task_id)
                }
            });
        }
        
        if (project_id) {
            pipeline.push({
                $match: {
                    project_id: new mongoose.Types.ObjectId(project_id)
                }
            });
        }

        if (folder_id) {
            pipeline.push({
                $match: {
                    folder_id: new mongoose.Types.ObjectId(folder_id)
                }
            });
        }

        if (+organization_id) {
            pipeline.push({
                $match: {
                    organization_id: +organization_id,
                    is_deleted: false,
                }
            });
        }

        if (start_date && end_date) {
             let startDate = new Date(start_date);
            let endDate = new Date(end_date); 
            pipeline.push({
                $match: {
                    $or: [
                        {
                            "task_working_status.start_time": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            "task_working_status.end_time": {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            createdAt: {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                        {
                            updatedAt: {
                                $gte: startDate,
                                $lte: endDate
                            }
                        },
                    ]
                }
            });
        }

        pipeline.push({ 
                $lookup: {
                  from: "folders",
                  localField: "folder_id",
                  foreignField: "_id",
                  as: "folder_data"
                }
              },
              {
                $unwind: "$folder_data"
              },
              {
                $lookup: {
                  from: "projects",
                  localField: "project_id",
                  foreignField: "_id",
                  as: "project_data"
                }
              },
              {
                $unwind: "$project_data"
              },
        );

        if(manager_id) {
            pipeline.push({
                $match: {
                    "$or": [
                        { "project_data.title": "Default" },
                        { "project_data.assigned_non_admin_users": +manager_id }
                    ]
                }
            });
        }

        pipeline.push(
            {
                $project: {
                  name: 1,
                  status: 1,
                  assigned_user: 1,
                  task_remaining_time: 1,
                  total_working_time: 1,
                  task_working_status: 1,
                  description: 1,
                  "folder_data._id": 1,
                  "folder_data.name": 1,
                  "project_data._id": 1,
                  "project_data.title": 1,
                  "project_data.assigned_non_admin_users": 1,
                  "project_data.assigned_users": 1,
                }
            }
        )

        if (sortColumn) {
            switch (sortColumn) {
                case 'project_name':
                    sortColumn = "project_data.title";
                    break;
                case 'folder_name':
                    sortColumn = "folder_data.name";
                    break;
                case 'task_name':
                    sortColumn = "name";
                    break;
                default:
                    sortColumn = "taskName";
            }
        
            const sortOrderValue = (sortOrder && sortOrder === 'A') ? 1 : -1;
            const sortObject = {};
            sortObject[sortColumn] = sortOrderValue;
        
            pipeline.push({
                $sort: sortObject
            });
        }
        
        if (getCount) {
            pipeline.push(
                { $group: { _id: null, count: { $sum: 1 } } },
            )
        }
        return TaskSchemaModel.aggregate(pipeline);
    }

    fetchProjectDetails({ organization_id, project_id }) {
        let pipeline = []; 
       
        if (project_id) {
            pipeline.push({
                $match: {
                    _id: new mongoose.Types.ObjectId(project_id)
                }
            });
        } 

        if (+organization_id) {
            pipeline.push({
                $match: {
                    organization_id: +organization_id,
                    is_deleted: false,
                }
            });
        }

        pipeline.push({
                $project: {
                    _id: 1,
                    created_by: 1,
                    assigned_users: 1,
                    assigned_non_admin_users: 1, 
                    title: 1,
                    description: 1,
                    start_date: 1,
                    end_date: 1
                }
            }) 
        
        // return ProjectSchemaModel.aggregate(pipeline);
        return ProjectSchemaModel.aggregate(pipeline)
        .then(result => { 
            return result;
        });
    }

    fetchProjectTaskListMobile({ skip, limit, search, organization_id, getCount, employee_id,task_id, manager_id, project_id, folder_name, start_date, end_date, sort_by }) {
        let pipeline = [];

        if (search) {
            pipeline.push({
                $match: {
                    name: new RegExp(search, 'i')
                }
            });
        } 

        if (+employee_id) {
            pipeline.push({
                $match: {
                    assigned_user: +employee_id
                }
            });
        }

        if (task_id) {
            pipeline.push({
                $match: {
                    _id: new mongoose.Types.ObjectId(task_id)
                }
            });
        }
        
        if (project_id) {
            pipeline.push({
                $match: {
                    project_id: new mongoose.Types.ObjectId(project_id)
                }
            });
        }

        if (+organization_id) {
            pipeline.push({
                $match: {
                    organization_id: +organization_id,
                    is_deleted: false,
                }
            });
        }

        if (start_date && end_date) {
            pipeline.push({
                $match: {
                    "task_working_status.start_time": {
                        $gte: new Date(start_date),
                        $lte: new Date(end_date)
                    },
                    "task_working_status.end_time": {
                        $gte: new Date(start_date),
                        $lte: new Date(end_date)
                    }
                }
            });
        }

        pipeline.push({ 
                $lookup: {
                  from: "folders",
                  localField: "folder_id",
                  foreignField: "_id",
                  as: "folder_data"
                }
              },
              {
                $unwind: "$folder_data"
              });
        
        if(folder_name) {
            pipeline.push({
                $match: {
                    "folder_data.name": folder_name
                }
            });
        }

              pipeline.push({
                $lookup: {
                  from: "projects",
                  localField: "project_id",
                  foreignField: "_id",
                  as: "project_data"
                }
              },
              {
                $unwind: "$project_data"
              },
        );

        if(manager_id) {
            pipeline.push({
                $match: {
                    "$or": [
                        { "project_data.title": "Default" },
                        { "project_data.assigned_non_admin_users": +manager_id }
                    ]
                }
            });
        }

        pipeline.push({
            $sort: {
                createdAt: -1
            }
        })

        pipeline.push(
            {
                $project: {
                  name: 1,
                  status: 1,
                  assigned_user: 1,
                  task_remaining_time: 1,
                  task_finished_time: 1,
                  "folder_data._id": 1,
                  "folder_data.name": 1,
                  "project_data._id": 1,
                  "project_data.title": 1,
                  "task_working_status": 1,
                  "createdAt": 1,
                  "description": 1
                }
            }
        )

        if (sort_by) {
            pipeline.push({
                $addFields: {
                    statusPriority: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$status", 1] }, then: 0 }, // highest priority
                                { case: { $eq: ["$status", 0] }, then: 1 },
                                { case: { $eq: ["$status", 2] }, then: 2 },
                                { case: { $eq: ["$status", 3] }, then: 3 }
                            ],
                            default: 4
                        }
                    }
                }
            });

            pipeline.push({
                $sort: {
                    statusPriority: 1,
                    createdAt: sort_by === "ASC" ? 1 : -1
                }
            })
        }

        if (getCount) {
            pipeline.push(
                { $group: { _id: null, count: { $sum: 1 } } },
        )
        }else{
            if (skip) {
                pipeline.push({ $skip: +skip });
            }
    
            if (+limit) {
                pipeline.push({ $limit: +limit });
            }
        }
        return TaskSchemaModel.aggregate(pipeline);
    }

    findRunningTask(employee_id) {
        return TaskSchemaModel.findOne({
            assigned_user: employee_id,
            status: 1,
            is_deleted: false
        });
    }

    getEmployeeShift(employee_id) {
        let query = `SELECT os.data, e.timezone
                FROM organization_shifts os
                JOIN employees e ON os.id = e.shift_id
                WHERE e.id = ${employee_id}
            `
        return mySql.query(query);
    }

    getEmployeeAttendance (date, employee_id) {
        let query = `SELECT e.id, ea.id as attendance_id, ea.date
                    FROM employees e
                    JOIN employee_attendance ea ON ea.employee_id = e.id
                    WHERE ea.date = "${date}" AND e.id = ${employee_id}`
        return mySql.query(query);
    }

    getEmployeeAttendanceReport(date, employee_id, organization_id, flag) {
        if(flag) return EmployeeProductivityModel.find({yyyymmdd: +date.split('-').join(''), employee_id, organization_id})
        return EmployeeProductivityModel.findOne({yyyymmdd: +date.split('-').join(''), employee_id, organization_id});
    }

    createAttendanceRecord(employee_id, organization_id, date, startTime) {
        let query = `
            INSERT INTO employee_attendance (employee_id, organization_id, date, start_time, end_time) VALUES (?,?,?,?,?)
        `;
        return mySql.query(query, [employee_id, organization_id, date, startTime, startTime])
    }

    createEmployeeProductivityReport(department_id, location_id, employee_id, organization_id, date) {
        return new EmployeeProductivityModel({
            logged_duration: 0,
            offline_time: 0,
            employee_id: employee_id,
            department_id: department_id,
            location_id: location_id,
            organization_id: organization_id,
            productive_duration: 0,
            non_productive_duration: 0,
            neutral_duration: 0,
            idle_duration: 0,
            break_duration: 0,
            year: +date.split('-')[0],
            month:  +date.split('-')[1],
            day:  +date.split('-')[2],
            yyyymmdd: +date.split('-').join(''),
            date: date,
        }).save();
    }

    updateEmployeeAttendance(employee_id, organization_id, attendance_id, endTime) {
        let query = `
            UPDATE employee_attendance
            SET end_time = ?
            WHERE id = ?
        `;
        return mySql.query(query, [endTime, attendance_id]);
    }

    getWeeklyTaskDetail(start_time, end_time, employee_id) {
        return TaskSchemaModel.aggregate([
            {
                $match: {
                    "$or": [
                        {
                            "task_working_status.start_time": { $gte: new Date(start_time), $lte: new Date(end_time) }
                        },
                        {
                            "task_working_status.end_time": { $gte: new Date(start_time), $lte: new Date(end_time) }
                        }
                    ],
                    assigned_user: employee_id,
                    status: { $ne: 0}
                }
            }
        ])
    }

    getEmployeeAssignedStatus(employee_id, organization_id) {
        let query = `
            SELECT count(e.id) as count
            FROM employees e
            JOIN user_role ur ON ur.user_id = e.user_id
            JOIN roles r ON r.id = ur.role_id
            JOIN assigned_employees ae ON ae.to_assigned_id = e.id AND ae.role_id = ur.role_id 
            WHERE e.id = ${employee_id} AND e.organization_id = ${organization_id} 
            AND (r.name != "Employee" AND r.name != "employee")
        `;
        return mySql.query(query);
    }

    getEmployeeAssignedList(employee_id, organization_id, skip, limit, search) {
        let query = `
            SELECT e.id, u.first_name, u.last_name, u.email, u.a_email, od.name as department_name, u.photo_path
                FROM employees e
                JOIN users u ON u.id = e.user_id 
                JOIN assigned_employees ae ON ae.employee_id = e.id 
                JOIN organization_departments od ON e.department_id = od.id
                WHERE to_assigned_id = ${employee_id} AND e.organization_id = ${organization_id}
        `;
        if(search) query += ` AND concat(u.first_name,' ',u.last_name) LIKE '%${search}%'`;
        query += ` LIMIT ${limit} OFFSET ${skip}`;
        return mySql.query(query);
    }

    getEmployeeAssignedListCount(employee_id, organization_id,search) {
        let query = `
            SELECT count(e.id) as count 
                FROM employees e
                JOIN users u ON u.id = e.user_id 
                JOIN assigned_employees ae ON ae.employee_id = e.id 
                WHERE to_assigned_id = ${employee_id} AND e.organization_id = ${organization_id}
        `;
        if(search) query += ` AND concat(u.first_name,' ',u.last_name) LIKE '%${search}%'`;
        return mySql.query(query);
    }

    checkEmployeeAssigned(employee_id, admin_id, organization_id) {
        let query = `
            SELECT ae.id, e.timezone
                FROM assigned_employees ae
                JOIN employees e ON e.id = ae.employee_id
                WHERE ae.employee_id = ${employee_id} AND ae.to_assigned_id = ${admin_id} AND e.organization_id = ${organization_id}
        `;
        return mySql.query(query);
    }

    getEmployeeTimezone(employee_id, organization_id) {
        let query = `
            SELECT e.id, e.timezone
                FROM employees e 
                WHERE e.organization_id = ${organization_id} AND e.id = ${employee_id}
        `;
        return mySql.query(query);
    }

    getEmployeeMobileUsage (employee_id, organization_id, start_date, end_date) {
        return TaskSchemaModel.aggregate([
            {
                $match: {
                    "$or": [
                        {
                            "task_working_status.start_time": { $gte: new Date(start_date), $lte: new Date(end_date) }
                        },
                        {
                            "task_working_status.end_time": { $gte: new Date(start_date), $lte: new Date(end_date) }
                        }
                    ],
                    assigned_user: +employee_id,
                    status: { $ne: 0},
                    organization_id: organization_id
                }
            },
            {
                $project: {
                    assigned_user: 0,
                    status: 0,
                    is_deleted: 0,
                    total_working_time: 0,
                    task_remaining_time: 0,
                    project_id: 0,
                    folder_id: 0,
                    _id: 0,
                }
            }
        ])
    }

    findNonAdmin(assigned_non_admin_users, organization_id) {
        let query = `
            SELECT e.id, u.first_name, u.last_name
                FROM employees e
                JOIN users u ON u.id = e.user_id
                JOIN user_role ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE e.organization_id = ${organization_id} AND e.id IN (${assigned_non_admin_users}) AND r.name != "Employee"
        `;
        return mySql.query(query);
    }
    
    findEmployee(assigned_users, organization_id) {
        let query = `
            SELECT e.id, u.first_name, u.last_name
                FROM employees e
                JOIN users u ON u.id = e.user_id
                JOIN user_role ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE e.organization_id = ${organization_id} AND e.id IN (${assigned_users})
        `;
        return mySql.query(query);
    }

    findEmployeeTaskInProject(employeeIds, project_id) {
        return TaskSchemaModel.find({ 
            assigned_user: { $in: employeeIds }, 
            project_id: new mongoose.Types.ObjectId(project_id) 
        })
    }

    findRunningTaskMultiple(employee_ids) {
        return TaskSchemaModel.find({
            assigned_user: {
                $in: employee_ids
            },
            status: 1,
            is_deleted: false
        });
    }

    updateEmployeeLocalizationStatus(employee_id, language) {
        let query = `
            UPDATE employees 
                SET language = "${language}"
                WHERE id = ${employee_id}
        `;
        return mySql.query(query);
    }

    getEmployeeAttendanceTimeClaim(start_date, end_date, employee_id, organization_id) {
        return ActivityRequestModel.aggregate([
            {
                $match: {
                    "start_time": { $gte: new Date(start_date), $lte: new Date(end_date) },
                    "end_time": { $gte: new Date(start_date), $lte: new Date(end_date) },
                    "employee_id": employee_id,
                    "organization_id": organization_id,
                    "status": 1,
                    "type": 3
                }
            }
        ])
    }

    findProjectsByNames({ names, organization_id }) {
        return ProjectSchemaModel.find({
            title: { $in: names },
            organization_id: organization_id,
            is_deleted: false,
        });
    }
    
    findNonAdminByFullName({ full_name, organization_id }) {
        let query = `
            SELECT e.id, e.organization_id, u.first_name, u.last_name
                FROM employees e
                JOIN users u ON u.id = e.user_id
                JOIN user_role ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE e.organization_id = ? 
                  AND r.name != "Employee"
                  AND (
                        LOWER(CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name))) = LOWER(TRIM(?)) OR
                        LOWER(CONCAT(TRIM(u.first_name), TRIM(u.last_name))) = LOWER(REPLACE(TRIM(?), ' ', '')) OR
                        LOWER(TRIM(u.first_name)) = LOWER(TRIM(?)) OR
                        LOWER(TRIM(u.last_name)) = LOWER(TRIM(?))
                  )
                LIMIT 1
        `;
        return mySql.query(query, [organization_id, full_name, full_name, full_name, full_name]).then(results => results[0] || null);
    }

    findNonAdminsByFullNames({ full_names, organization_id }) {
        if (!full_names || full_names.length === 0) return Promise.resolve([]);
        
        const placeholders = full_names.map(() => '(LOWER(CONCAT(TRIM(u.first_name), \' \', TRIM(u.last_name))) = LOWER(TRIM(?)) OR LOWER(CONCAT(TRIM(u.first_name), TRIM(u.last_name))) = LOWER(REPLACE(TRIM(?), \' \', \'\')) OR LOWER(TRIM(u.first_name)) = LOWER(TRIM(?)) OR LOWER(TRIM(u.last_name)) = LOWER(TRIM(?)))').join(' OR ');
        
        const params = [];
        full_names.forEach(name => {
            params.push(name, name, name, name);
        });
        params.unshift(organization_id);
        
        let query = `
            SELECT e.id, e.organization_id, u.first_name, u.last_name
                FROM employees e
                JOIN users u ON u.id = e.user_id
                JOIN user_role ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE e.organization_id = ? 
                  AND r.name != "Employee"
                  AND (${placeholders})
        `;
        return mySql.query(query, params);
    }

    findEmployeesByFullNames({ full_names, organization_id }) {
        if (!full_names || full_names.length === 0) return Promise.resolve([]);
        
        const placeholders = full_names.map(() => '(LOWER(CONCAT(TRIM(u.first_name), \' \', TRIM(u.last_name))) = LOWER(TRIM(?)) OR LOWER(CONCAT(TRIM(u.first_name), TRIM(u.last_name))) = LOWER(REPLACE(TRIM(?), \' \', \'\')) OR LOWER(TRIM(u.first_name)) = LOWER(TRIM(?)) OR LOWER(TRIM(u.last_name)) = LOWER(TRIM(?)))').join(' OR ');
        
        const params = [];
        full_names.forEach(name => {
            params.push(name, name, name, name);
        });
        params.unshift(organization_id);
        
        let query = `
            SELECT e.id, e.organization_id, u.first_name, u.last_name
                FROM employees e
                JOIN users u ON u.id = e.user_id
                WHERE e.organization_id = ? 
                  AND (${placeholders})
        `;
        return mySql.query(query, params);
    }
}

module.exports = new AdminDashboardModel();