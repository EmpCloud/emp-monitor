'use strict';
const buildModel = require('../build.model');
const shortenService = require('./shortner.service');
const actionsTracker = require('../../services/actionsTracker');
const event = require('../../auth/services/event.service');
const redis = require('../../auth/services/redis.service');

class BuildService {
    async add(data, res, next) {
        try {
            const { organization_key, build_version, type, mode, url } = data;

            const organization_id = parseInt(shortenService.extend(organization_key)) - +process.env.SHORTNER_DEFAULT_ADDED_VALUE;
            if (!organization_id || organization_id < 0) return res.status(400).json({ code: 400, error: 'organization_key is invalid', message: 'Check organization_key', data: null });

            const [orgData] = await buildModel.getOrganizationAvailability(organization_id);
            if (!orgData) return res.status(400).json({ code: 400, error: 'Error in Organization', message: 'Such Organization does not exists', data: null });

            let file_type;
            if(['win64', 'win86'].includes(type)) file_type = url.indexOf('.exe') > -1 ? '.exe' : '.msi';
            if(['mac'].includes(type)) file_type = '.pkg';
            if(['mac-arm', 'mac-intel'].includes(type)) file_type = '.pkg';
            if(['linux'].includes(type)) file_type = '.run';
            
            const [buildInfo] = await buildModel.getBuildInfo(organization_id, build_version, type, mode, file_type);

            if (buildInfo) {
                await buildModel.updateBuildInfo(buildInfo.id, url);
                actionsTracker(data, 'Build %i updated (?)', [buildInfo.id, { url }]);
                return res.status(200).json({ code: 200, error: null, message: 'Build Data updated', data: { status: 'updated' } });
            } else {
                await buildModel.createBuildInfo(organization_id, build_version, type, mode, url, file_type);
                actionsTracker(data, 'Build added (?)', [{ organization_id, build_version, type, mode, url }]);
                return res.status(200).json({ code: 200, error: null, message: 'Build Data added', data: { status: 'created' } });
            }
        } catch (error) {
            next(error);
        }
    }

    async createBuild(email, res, next) {
        try {
            const [admin] = await buildModel.getAdmin(email);
            if (!admin) return res.json({ code: 400, data: null, message: 'with this email orgnization not found', error: null });

            const data = await redis.getAsync(`${admin.organization_id}_build`);
            if (data) return res.json({ code: 200, data: admin.organization_id, message: 'Craeting build', error: null });

            event.emit('organization-created', admin.organization_id);

            await redis.setAsync(`${admin.organization_id}_build`, 'build processing', 'EX', 60 * 15);

            return res.json({ code: 200, data: admin.organization_id, message: 'Craeting build', error: null });
        } catch (err) {
            next(err);
        }
    }
    async addOnPremise(data, res, next) {
        try {
            const { email, organization_key, build_version, type, mode, url } = data;
            
            const organization_id = parseInt(shortenService.extend(organization_key)) - +process.env.SHORTNER_DEFAULT_ADDED_VALUE;
            if (!organization_id || organization_id < 0) return res.status(400).json({ code: 400, error: 'organization_key is invalid', message: 'Check organization_key', data: null });

            let file_type;
            if(['win64', 'win86'].includes(type)) file_type = url.indexOf('.exe') > -1 ? '.exe' : '.msi';
            if(['mac'].includes(type)) file_type = '.pkg';
            if(['linux'].includes(type)) file_type = '.run';
            
            const [buildInfo] = await buildModel.getOnPremBuildInfo(email, build_version, type, mode, file_type);

            if (buildInfo) {
                await buildModel.updateOnPremBuildInfo(buildInfo.id, url);
                return res.status(200).json({ code: 200, error: null, message: 'OnPrem Build Data updated', data: { status: 'updated' } });
            } else {
                await buildModel.createOnPremBuildInfo(email, organization_id, build_version, type, mode, url, file_type);
                return res.status(200).json({ code: 200, error: null, message: 'OnPrem Build Data added', data: { status: 'created' } });
            }
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new BuildService;