const StorageModel = require('./Storage.model');
const StorageService = require('./Storage.service');
const joiValidation = require('./Storage.validator');
const actionsTracker = require('../services/actionsTracker');
const S3Utils = require(`${utilsFolder}/helpers/S3Utils`);
const { sendResponse } = require(`${utilsFolder}/myService`);
const { storageMessages, resellerMessage } = require("../../../utils/helpers/LanguageTranslate")
const { translate } = require(`../../../utils/messageTranslation`)
const { ResellerModel } = require('../settings/reseller/Reseller.Model');
const ConfigENV = require('../../../../../config/config');

const SFTPUTILS = require("../useractivity/service/cloudstorageServices/sftp.service");
const DropboxService = require("../useractivity/service/cloudstorageServices/dropbox.service");
const redisService = require('../auth/services/redis.service');
const WebDAVUtils = require("../useractivity/service/cloudstorageServices/webdav.service");


/**
 * Add storage message localozation
 * @function getStorageMessage
 * @param {string} language
 * @param {string} id
 * @param {number} auto_delete_period
 * @returns {string} message
 */
const getStorageMessage = (language, id, auto_delete_period) => {
    let message = translate(storageMessages, id, language)
    message = message.split("=");
    message = message[0] + " " + auto_delete_period + " " + message[1];
    return message.trim();
}
class StorageController {

    async getStorageTypes(req, res) {
        actionsTracker(req, 'Storage types requested.');
        const language = req.decoded.language;
        const organization_id= req.decoded.organization_id;

        try {
            let get_storage_type = await StorageModel.getStorageTypes();
            if (get_storage_type.length > 0) {
                if (!ConfigENV.IS_FTP_ENABLED_ORGANIZATION.split(",").includes(String(organization_id))) get_storage_type = get_storage_type.filter(i => i.id !== 6);
                if (!ConfigENV.IS_SFTP_ENABLED_ORGANIZATION.split(",").includes(String(organization_id))) get_storage_type = get_storage_type.filter(i => i.id !== 7);
                if (!ConfigENV.IS_WEBDAV_ENABLED_ORGANIZATION.split(",").includes(String(organization_id))) get_storage_type = get_storage_type.filter(i => i.id !== 10);
                return sendResponse(res, 200, get_storage_type, storageMessages.find(x => x.id === "1")[language] || storageMessages.find(x => x.id === "1")["en"], null);
            } else {
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "3")[language] || storageMessages.find(x => x.id === "3")["en"], null);
            }
        } catch (err) {
            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "4")[language] || storageMessages.find(x => x.id === "4")["en"], null);
        }
    }

    async addStorageData(req, res) {
        let message;
        const { organization_id, user_id } = req.decoded;
        let provider_id = req.body.storage_type_id;
        let client_id = req.body.client_id;
        let client_secret = req.body.client_secret;
        let bucket_name = req.body.bucket_name;
        let region = req.body.region;
        let org_provided_id;
        let auto_delete_period = req.body.auto_delete_period;
        const language = req.decoded.language;
        let note = req.body.note;

        try {
            var validation = joiValidation.ValidateStorageId(provider_id, auto_delete_period);
            if (validation.error) {
                return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], validation.error.details[0].message);
            }
            let get_type = await StorageModel.getStorageTypeData(provider_id);
            if (get_type.length == 0) {
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "5")[language] || storageMessages.find(x => x.id === "5")["en"], null);
            }

            let check_storage_type = await StorageModel.checkOrgStorageType(provider_id, organization_id);
            if (check_storage_type.length > 0) {
                org_provided_id = check_storage_type[0].id;
            }

            if (!org_provided_id) {
                const add_storage_data = await StorageModel.addStorageData(provider_id, organization_id, user_id);
                if (add_storage_data) {
                    if (add_storage_data.affectedRows > 0) {
                        org_provided_id = add_storage_data.insertId

                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "6")[language] || storageMessages.find(x => x.id === "6")["en"], null);
                    }
                } else {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "7")[language] || storageMessages.find(x => x.id === "7")["en"], null);
                }
            }
            const oldCreds = await StorageModel.getOrgCredsOneType(provider_id, organization_id);
            if (get_type[0].short_code == 'GD') {
                let refresh_token = req.body.refresh_token;
                var validation = joiValidation.addStorageDataType1(client_id, client_secret, refresh_token);
                if (validation.error) {
                    return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], validation.error.details[0].message);
                }

                const isUniqStore = StorageService.isUniqStore(client_id, 'client_id', oldCreds);
                if (!isUniqStore) {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                }

                try {
                    await StorageService.checkAccessToStorage(get_type[0].short_code, { client_id, client_secret, refresh_token });
                } catch (error) {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                }

                let storage_creds = JSON.stringify({ refresh_token: refresh_token, client_id: client_id, client_secret: client_secret })

                const add_storage_creds = await StorageModel.addStorageCreds(org_provided_id, storage_creds, organization_id, user_id, auto_delete_period, null, note);
                if (add_storage_creds) {
                    if (add_storage_creds.affectedRows > 0) {
                        let storage_data = req.body;
                        storage_data.storage_data_id = add_storage_creds.insertId;
                        storage_data.status = 0;
                        storage_data.storage_type = 'Google Drive';
                        storage_data.auto_delete_period = auto_delete_period
                        actionsTracker(req, 'Storage %i data created.', [storage_data.storage_data_id]);
                        message = getStorageMessage(language, "34", auto_delete_period);
                        return sendResponse(res, 200, storage_data, message, null);
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "9")[language] || storageMessages.find(x => x.id === "9")["en"], null);
                    }

                } else {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "10")[language] || storageMessages.find(x => x.id === "10")["en"], null);
                }

            } else if (get_type[0].short_code == 'S3') {
                var validation = joiValidation.addStorageDataType2(client_id, client_secret, bucket_name, region);
                if (validation.error) {
                    return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], validation.error.details[0].message);
                }

                const isUniqStore = StorageService.isUniqStore(client_id, 'client_id', oldCreds);
                if (!isUniqStore) {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                }

                try {
                    await StorageService.checkAccessToStorage(get_type[0].short_code, { client_id, client_secret, bucket_name, region, api_endpoint: req.body.api_endpoint });
                } catch (error) {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                }

                let storage_creds = JSON.stringify({ client_id: client_id, client_secret: client_secret, bucket_name: bucket_name, region: region, api_endpoint: req.body.api_endpoint })
                const add_storage_credsS3 = await StorageModel.addStorageCreds(org_provided_id, storage_creds, organization_id, user_id, auto_delete_period, null, note);
                if (add_storage_credsS3) {
                    if (add_storage_credsS3.affectedRows > 0) {
                        let storage_data = req.body;
                        storage_data.storage_data_id = add_storage_credsS3.insertId;
                        storage_data.status = 0;
                        storage_data.storage_type = 'Amazon - S3 Bucket';
                        storage_data.auto_delete_period = auto_delete_period;
                        storage_data.api_endpoint= req.body.api_endpoint;
                        actionsTracker(req, 'Storage %i data created.', [storage_data.storage_data_id]);
                        message = getStorageMessage(language, "34", auto_delete_period);
                        return sendResponse(res, 200, storage_data, message, null);
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "9")[language] || storageMessages.find(x => x.id === "9")["en"], null);
                    }

                } else {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "10")[language] || storageMessages.find(x => x.id === "10")["en"], null);
                }

            } else if (get_type[0].short_code == 'ZH' || get_type[0].short_code == 'MO') {
                let creds_json;
                let new_storage_type;
                if (get_type[0].short_code == 'ZH') {
                    const { zoho_client_id, zoho_client_secret, zoho_refresh_token, domain, team_id } = req.body;
                    const { error, value: creds } = joiValidation.addZohoStorageData({ zoho_client_id, zoho_client_secret, zoho_refresh_token, domain, team_id });
                    if (error) {
                        return sendResponse(res, 405, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error.details[0].message);
                    }
                    const isUniqStore = StorageService.isUniqStore(zoho_client_id, 'zoho_client_id', oldCreds);
                    if (!isUniqStore) {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                    }

                    try {
                        await StorageService.checkAccessToStorage(get_type[0].short_code, creds);
                    } catch (error) {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                    }

                    new_storage_type = 'Zoho Work Drive';
                    creds_json = JSON.stringify(creds);
                } else {
                    const onedrive_client_id = req.body.onedrive_client_id;
                    const onedrive_client_secret = req.body.onedrive_client_secret;
                    const onedrive_redirect_url = req.body.onedrive_redirect_url;
                    const onedrive_refresh_token = req.body.onedrive_refresh_token;
                    const onedrive_tenantId = req.body.tenantId;

                    var validation = joiValidation.addOneDriveStorageData(onedrive_client_id, onedrive_client_secret, onedrive_redirect_url, onedrive_refresh_token);
                    if (validation.error) {
                        return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], validation.error.details[0].message);
                    }
                    const isUniqStore = StorageService.isUniqStore(onedrive_client_id, 'onedrive_client_id', oldCreds);
                    if (!isUniqStore) {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                    }

                    try {
                        await StorageService.checkAccessToStorage(get_type[0].short_code, { onedrive_client_id, onedrive_client_secret, onedrive_redirect_url, onedrive_refresh_token });
                    } catch (error) {
                        try {
                            const statusCode = error && error.response && error.response.statusCode;
                            const url = error && error.request && error.request.requestUrl || (error && error.options && error.options.url);
                            const body = error && error.response && error.response.body;
                            const graphError = body && body.error ? body.error : (error && error.error ? error.error : null);
                            const graphCode = graphError && graphError.code;
                            const graphMessage = graphError && graphError.message;
                            const innerError = graphError && graphError.innerError;
                            return sendResponse(res, 400, {
                                statusCode,
                                url,
                                graphCode,
                                graphMessage,
                                innerError,
                            }, graphMessage, graphMessage);
                        } catch (e) {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                        }
                    }

                    new_storage_type = 'Microsoft One drive';
                    creds_json = JSON.stringify(
                        {
                            onedrive_client_id: onedrive_client_id,
                            onedrive_client_secret: onedrive_client_secret,
                            onedrive_redirect_url: onedrive_redirect_url,
                            onedrive_refresh_token: onedrive_refresh_token,
                            tenantId: onedrive_tenantId
                        })
                }

                const add_storage_creds_ZH_MO = await StorageModel.addStorageCreds(org_provided_id, creds_json, organization_id, user_id, auto_delete_period, null, note);
                if (add_storage_creds_ZH_MO) {
                    if (add_storage_creds_ZH_MO.affectedRows > 0) {
                        let storage_data_ZH = req.body;
                        storage_data_ZH.storage_data_id = add_storage_creds_ZH_MO.insertId;
                        storage_data_ZH.status = 0;
                        storage_data_ZH.storage_type = new_storage_type;
                        storage_data_ZH.auto_delete_period = auto_delete_period;
                        actionsTracker(req, 'Storage %i data created.', [storage_data_ZH.storage_data_id]);
                        message = getStorageMessage(language, "34", auto_delete_period);
                        return sendResponse(res, 200, storage_data_ZH, message, null);
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "9")[language] || storageMessages.find(x => x.id === "9")["en"], null);
                    }

                } else {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "10")[language] || storageMessages.find(x => x.id === "10")["en"], null);
                }

            } else if (get_type[0].short_code == 'FTP') {
                const { error, value: creds } = joiValidation.addFTPStorageData(req.body);
                if (error) {
                    return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error.details[0].message);
                }
                const isUniqStore = StorageService.isUniqStoreFTP(creds, oldCreds);
                if (!isUniqStore) {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                }

                try {
                    await StorageService.checkAccessToStorage(get_type[0].short_code, creds);
                } catch (error) {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                }

                const ftp_path = StorageService.getFTPPath(creds.ftp_path) || '/';
                const storage_creds = JSON.stringify({ ...creds, ftp_path });
                const add_storage_credsFTP = await StorageModel.addStorageCreds(org_provided_id, storage_creds, organization_id, user_id, auto_delete_period, null, note);
                if (add_storage_credsFTP) {
                    if (add_storage_credsFTP.affectedRows > 0) {
                        const { insertId: storage_data_id } = add_storage_credsFTP;
                        const status = 0;
                        const storage_type = 'FTP Integration';
                        const storage_data = { ...req.body, ftp_path, storage_data_id, status, storage_type }
                        actionsTracker(req, 'Storage %i data created.', [storage_data_id]);
                        message = getStorageMessage(language, "34", auto_delete_period);
                        return sendResponse(res, 200, storage_data, message, null);
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "9")[language] || storageMessages.find(x => x.id === "9")["en"], null);
                    }

                } else {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "10")[language] || storageMessages.find(x => x.id === "10")["en"], null);
                }

            }
            else if (get_type[0].short_code == 'DB') {
                const app_key = req.body.app_key;
                const app_secret = req.body.app_secret;
                const refresh_token = req.body.refresh_token;
                const redirect_uri = req.body.redirect_uri;
                // Validate that either token or app credentials are provided
                if (!app_key || !app_secret) {
                    return sendResponse(res, 400, null, 'Either access_token or app_key/app_secret must be provided', null);
                }
                
                let storage_creds;
                let validation;
                

                    // App Key/Secret approach
                validation = joiValidation.addDropboxStorageDataWithCredentials(app_key, app_secret, refresh_token, redirect_uri);
                if (validation.error) {
                    return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], validation.error.details[0].message);
                }
                
                try {
                    try {
                        // Verify App Key and App Secret by generating token
                        let connection = await DropboxService.initConection({ app_key, app_secret, refresh_token, redirect_uri }, organization_id);
                        const { dbx } = connection;
                        await dbx.filesListFolder({path: ''});  
                        // Check uniqueness based on app_key
                        const isUniqStore = StorageService.isUniqStore(app_key, 'app_key', oldCreds);
                        if (!isUniqStore) {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                        }
                    } catch (error) {
                        console.log(error)
                        return sendResponse(res, 400, null, `Invalid Dropbox credentials: ${error.message}`, null);
                    }
                    

                    
                    // Store app credentials with generated token
                    storage_creds = JSON.stringify({ 
                        app_key: app_key, 
                        app_secret: app_secret,
                        refresh_token: refresh_token,
                        redirect_uri: redirect_uri
                    });
                    
                } catch (error) {
                    return sendResponse(res, 400, null, `Invalid Dropbox credentials: ${error.message}`, null);
                }
                
                
                const add_storage_credsDB = await StorageModel.addStorageCreds(org_provided_id, storage_creds, organization_id, user_id, auto_delete_period, null, note);
                if (add_storage_credsDB) {
                    if (add_storage_credsDB.affectedRows > 0) {
                        let storage_data = req.body;
                        storage_data.storage_data_id = add_storage_credsDB.insertId;
                        storage_data.status = 0;
                        storage_data.storage_type = 'Dropbox';
                        storage_data.auto_delete_period = auto_delete_period;
                        actionsTracker(req, 'Storage %i data created.', [storage_data.storage_data_id]);
                        message = getStorageMessage(language, "34", auto_delete_period);
                        return sendResponse(res, 200, storage_data, message, null);
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "9")[language] || storageMessages.find(x => x.id === "9")["en"], null);
                    }

                } else {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "10")[language] || storageMessages.find(x => x.id === "10")["en"], null);
                }

            }
            else {
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "11")[language] || storageMessages.find(x => x.id === "11")["en"], null);
            }


        } catch (err) {
            return sendResponse(res, 400, null, err.message || storageMessages.find(x => x.id === "12")[language] || storageMessages.find(x => x.id === "12")["en"], err);
        }
    }

    async getStorageTypeWithData(req, res) {
        actionsTracker(req, 'Storage types with data requested.');
        let { organization_id, language } = req.decoded;

        let creds = [];
        let data;
        try {
            const get_storage_type_data = await StorageModel.getStorageTypeWithData(organization_id);
            if (get_storage_type_data.length > 0) {
                for (let creds_list of get_storage_type_data) {
                    if (creds_list.short_code == 'GD') {
                        data = JSON.parse(creds_list.creds);
                        creds.push({
                            note: creds_list?.note,
                            is_expired: creds_list?.is_expired,
                            storage_type_id: creds_list.storage_type_id,
                            name: creds_list.name,
                            storage_data_id: creds_list.storage_data_id,
                            refresh_token: data.refresh_token,
                            client_id: data.client_id,
                            client_secret: data.client_secret,
                            bucket_name: null,
                            username: null,
                            password: null,
                            port: null,
                            host: null,
                            ftp_path: null,
                            region: null,
                            admin_email: null,
                            status: creds_list.status,
                            token: null,
                            zoho_client_id: null,
                            zoho_client_secret: null,
                            zoho_refresh_token: null,
                            domain: null,
                            team_id: null,
                            onedrive_client_id: null,
                            onedrive_client_secret: null,
                            onedrive_redirect_url: null,
                            onedrive_refresh_token: null,
                            auto_delete_period: creds_list.auto_delete_period,
                            reseller: data.reseller ? data.reseller : false,
                            app_key: null, 
                            app_secret: null,
                            redirect_uri: null,
                        })

                    } else if (creds_list.short_code == 'S3') {
                        data = JSON.parse(creds_list.creds);
                        creds.push({
                            note: creds_list?.note,
                            is_expired: creds_list?.is_expired,
                            storage_type_id: creds_list.storage_type_id,
                            name: creds_list.name,
                            storage_data_id: creds_list.storage_data_id,
                            api_endpoint: data.api_endpoint,
                            refresh_token: null,
                            client_id: data.client_id,
                            client_secret: data.client_secret,
                            bucket_name: data.bucket_name,
                            region: data.region,
                            username: null,
                            password: null,
                            port: null,
                            host: null,
                            ftp_path: null,
                            admin_email: null,
                            status: creds_list.status,
                            token: null,
                            zoho_client_id: null,
                            zoho_client_secret: null,
                            zoho_refresh_token: null,
                            domain: null,
                            team_id: null,
                            onedrive_client_id: null,
                            onedrive_client_secret: null,
                            onedrive_redirect_url: null,
                            onedrive_refresh_token: null,
                            auto_delete_period: creds_list.auto_delete_period,
                            reseller: data.reseller ? data.reseller : false,
                            app_key: null, 
                            app_secret: null,
                            refresh_token: null,
                            redirect_uri: null,
                        })

                    } else if (creds_list.short_code == 'ZH') {
                        data = JSON.parse(creds_list.creds);
                        creds.push({
                            note: creds_list?.note,
                            is_expired: creds_list?.is_expired,
                            storage_type_id: creds_list.storage_type_id,
                            name: creds_list.name,
                            storage_data_id: creds_list.storage_data_id,
                            refresh_token: null,
                            client_id: null,
                            client_secret: null,
                            bucket_name: null,
                            username: null,
                            password: null,
                            port: null,
                            host: null,
                            ftp_path: null,
                            region: null,
                            admin_email: null,
                            status: creds_list.status,
                            token: null,
                            zoho_client_id: data.zoho_client_id,
                            zoho_client_secret: data.zoho_client_secret,
                            zoho_refresh_token: data.zoho_refresh_token,
                            domain: data.domain,
                            team_id: data.team_id,
                            onedrive_client_id: null,
                            onedrive_client_secret: null,
                            onedrive_redirect_url: null,
                            onedrive_refresh_token: null,
                            auto_delete_period: creds_list.auto_delete_period,
                            reseller: data.reseller ? data.reseller : false,
                            app_key: null, 
                            app_secret: null,
                            refresh_token: null,
                            redirect_uri: null,
                        })

                    } else if (creds_list.short_code == 'MO') {
                        data = JSON.parse(creds_list.creds);
                        creds.push({
                            note: creds_list?.note,
                            is_expired: creds_list?.is_expired,
                            storage_type_id: creds_list.storage_type_id,
                            name: creds_list.name,
                            storage_data_id: creds_list.storage_data_id,
                            tenantId: data.tenantId,
                            refresh_token: null,
                            client_id: null,
                            client_secret: null,
                            bucket_name: null,
                            username: null,
                            password: null,
                            port: null,
                            host: null,
                            ftp_path: null,
                            region: null,
                            admin_email: null,
                            status: creds_list.status,
                            token: null,
                            zoho_client_id: null,
                            zoho_client_secret: null,
                            zoho_refresh_token: null,
                            domain: null,
                            team_id: null,
                            onedrive_client_id: data.onedrive_client_id,
                            onedrive_client_secret: data.onedrive_client_secret,
                            onedrive_redirect_url: data.onedrive_redirect_url,
                            onedrive_refresh_token: data.onedrive_refresh_token,
                            auto_delete_period: creds_list.auto_delete_period,
                            reseller: data.reseller ? data.reseller : false,
                            app_key: null, 
                            app_secret: null,
                            refresh_token: null,
                            redirect_uri: null,
                        })

                    } else if (creds_list.short_code == 'FTP') {
                        data = JSON.parse(creds_list.creds);
                        creds.push({
                            note: creds_list?.note,
                            is_expired: creds_list?.is_expired,
                            storage_type_id: creds_list.storage_type_id,
                            name: creds_list.name,
                            storage_data_id: creds_list.storage_data_id,
                            refresh_token: null,
                            client_id: null,
                            client_secret: null,
                            bucket_name: null,
                            username: data.username,
                            password: data.password,
                            port: data.port,
                            host: data.host,
                            ftp_path: data.ftp_path,
                            region: null,
                            admin_email: null,
                            status: creds_list.status,
                            token: null,
                            zoho_client_id: null,
                            zoho_client_secret: null,
                            zoho_refresh_token: null,
                            domain: null,
                            team_id: null,
                            onedrive_client_id: null,
                            onedrive_client_secret: null,
                            onedrive_redirect_url: null,
                            onedrive_refresh_token: null,
                            auto_delete_period: creds_list.auto_delete_period,
                            reseller: data.reseller ? data.reseller : false,
                            access_token: null,
                            app_key: null, 
                            app_secret: null,
                            refresh_token: null,
                            redirect_uri: null,
                        })

                    }
                    else if (creds_list.short_code == 'SFTP') {
                        data = JSON.parse(creds_list.creds);
                        creds.push({
                            note: creds_list?.note,
                            is_expired: creds_list?.is_expired,
                            storage_type_id: creds_list.storage_type_id,
                            name: creds_list.name,
                            storage_data_id: creds_list.storage_data_id,
                            refresh_token: null,
                            client_id: null,
                            client_secret: null,
                            bucket_name: null,
                            username: data.username,
                            password: data.password,
                            port: data.port,
                            host: data.host,
                            ftp_path: data.ftp_path,
                            region: null,
                            admin_email: null,
                            status: creds_list.status,
                            token: null,
                            zoho_client_id: null,
                            zoho_client_secret: null,
                            zoho_refresh_token: null,
                            domain: null,
                            team_id: null,
                            onedrive_client_id: null,
                            onedrive_client_secret: null,
                            onedrive_redirect_url: null,
                            onedrive_refresh_token: null,
                            auto_delete_period: creds_list.auto_delete_period,
                            reseller: data.reseller ? data.reseller : false,
                            app_key: null, 
                            app_secret: null,
                            refresh_token: null,
                            redirect_uri: null,
                        })

                    }
                    else if (creds_list.short_code == 'DB') {
                        data = JSON.parse(creds_list.creds);
                        creds.push({
                            note: creds_list?.note,
                            is_expired: creds_list?.is_expired,
                            storage_type_id: creds_list.storage_type_id,
                            name: creds_list.name,
                            storage_data_id: creds_list.storage_data_id,
                            refresh_token: null,
                            client_id: null,
                            client_secret: null,
                            bucket_name: null,
                            username: null,
                            password: null,
                            port: null,
                            host: null,
                            ftp_path: null,
                            region: null,
                            admin_email: null,
                            status: creds_list.status,
                            token: null,
                            access_token: data.access_token,
                            app_key: data.app_key, 
                            app_secret: data.app_secret,
                            refresh_token: data.refresh_token,
                            redirect_uri: data.redirect_uri,
                            zoho_client_id: null,
                            zoho_client_secret: null,
                            zoho_refresh_token: null,
                            domain: null,
                            team_id: null,
                            onedrive_client_id: null,
                            onedrive_client_secret: null,
                            onedrive_redirect_url: null,
                            onedrive_refresh_token: null,
                            auto_delete_period: creds_list.auto_delete_period,
                            reseller: data.reseller ? data.reseller : false,
                        })

                    }
                    else if (creds_list.short_code == 'WD') {
                        // WebDAV stored credentials
                        data = JSON.parse(creds_list.creds);
                        creds.push({
                            note: creds_list?.note,
                            is_expired: creds_list?.is_expired,
                            storage_type_id: creds_list.storage_type_id,
                            name: creds_list.name,
                            storage_data_id: creds_list.storage_data_id,
                            baseUrl: data.baseUrl || data.url || data.host || null,
                            webdav_path: data.webdav_path || null,
                            username: data.username || null,
                            password: data.password || null,
                            port: data.port || null,
                            host: data.host || null,
                            ftp_path: null,
                            region: null,
                            admin_email: null,
                            status: creds_list.status,
                            token: null,
                            zoho_client_id: null,
                            zoho_client_secret: null,
                            zoho_refresh_token: null,
                            domain: null,
                            team_id: null,
                            onedrive_client_id: null,
                            onedrive_client_secret: null,
                            onedrive_redirect_url: null,
                            onedrive_refresh_token: null,
                            auto_delete_period: creds_list.auto_delete_period,
                            reseller: data.reseller ? data.reseller : false,
                            access_token: null,
                            app_key: null,
                            app_secret: null,
                            refresh_token: null,
                            redirect_uri: null,
                            api_endpoint: null,
                            client_id: null,
                            client_secret: null,
                            bucket_name: null,
                        })

                    }
                }
                return sendResponse(res, 200, creds, storageMessages.find(x => x.id === "13")[language] || storageMessages.find(x => x.id === "13")["en"], null);
            } else {
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "3")[language] || storageMessages.find(x => x.id === "3")["en"], null);
            }
        } catch (err) {
            // Previously this catch swallowed the real error and returned a
            // generic "Failed Get Storage Data" with no server log, making
            // storage config crashes invisible. Log the stack so pm2 logs
            // tell us exactly which row / parse / access blew up.
            console.error('[getStorageTypeWithData]', err && err.stack ? err.stack : err);
            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "14")[language] || storageMessages.find(x => x.id === "14")["en"], err && err.message ? err.message : null);
        }
    }

    async UpdateStorageOption(req, res) {
        let { organization_id, language } = req.decoded;
        let { storage_data_id, status } = req.body;

        try {
            var validation = joiValidation.UpdateStorageOption(storage_data_id, status);
            if (validation.error) {
                return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], validation.error.details[0].message);
            }
            const update_status = await StorageModel.UpdateStorageActiveOption(organization_id);
            if (update_status) {
                const activate_storage = await StorageModel.activateStorage(storage_data_id, status);
                if (activate_storage) {
                    if (activate_storage.affectedRows > 0) {
                        actionsTracker(req, 'Storage %i status changed to ?.', [storage_data_id, status]);
                        await redisService.delAsync(`${organization_id}_storage_creds`);
                        return sendResponse(res, 200, req.body, storageMessages.find(x => x.id === "15")[language] || storageMessages.find(x => x.id === "15")["en"], null);
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "16")[language] || storageMessages.find(x => x.id === "16")["en"], null);
                    }
                } else {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "17")[language] || storageMessages.find(x => x.id === "17")["en"], null);
                }
            } else {
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "18")[language] || storageMessages.find(x => x.id === "18")["en"], null);
            }
        } catch (err) {
            return sendResponse(res, 400, null, err.message || storageMessages.find(x => x.id === "19")[language] || storageMessages.find(x => x.id === "19")["en"], err);
        }

    }
    async deleteStorageData(req, res) {
        const organization_id = req.decoded.organization_id;
        let storage_data_id = req.body.storage_data_id;
        const language = req.decoded.language;

        try {
            var validation = joiValidation.ValidateId(storage_data_id);
            if (validation.error) {
                return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], storageMessages.find(x => x.id === "20")[language] || storageMessages.find(x => x.id === "20")["en"]);
            }
            const select_data=await StorageModel.getStorageData(storage_data_id,organization_id);
            if(select_data.length==0)
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "14")[language] || storageMessages.find(x => x.id === "14")["en"], null);
            const delete_data = await StorageModel.deleteStorageData(storage_data_id);
            if (delete_data.affectedRows > 0){
                actionsTracker(req, 'Storage %i data deleted.', [storage_data_id]);
                return sendResponse(res, 200, null, storageMessages.find(x => x.id === "21")[language] || storageMessages.find(x => x.id === "21")["en"], null);
            }else {      
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "22")[language] || storageMessages.find(x => x.id === "22")["en"], null);
            } 
        } catch (err) {
            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "24")[language] || storageMessages.find(x => x.id === "24")["en"], null);
        }

    }

    async updateStorageData(req, res) {
        let { storage_data_id, client_id, client_secret, bucket_name, region, refresh_token, onedrive_client_id,
            onedrive_client_secret, onedrive_redirect_url, onedrive_refresh_token, auto_delete_period, baseUrl, url, webdav_path } = req.body;
        let storage_GD_creds;
        const language = req.decoded.language;
        const organization_id=req.decoded.organization_id;
        let note = req.body.note;

        const {
            zoho_client_id,
            zoho_client_secret,
            zoho_refresh_token,
            domain,
            team_id,
            username,
            password,
            host,
            port,
            ftp_path,
            tenantId,
            api_endpoint,
            access_token,
            app_key,
            app_secret,
            redirect_uri
        } = req.body;

        try {
            let message;
            const { error } = joiValidation.UpdateStorageData({
                client_id,
                client_secret,
                bucket_name,
                region,
                refresh_token,
                storage_data_id,
                zoho_client_id,
                zoho_client_secret,
                zoho_refresh_token,
                team_id,
                domain,
                onedrive_client_id,
                onedrive_client_secret,
                onedrive_redirect_url,
                onedrive_refresh_token,
                username,
                password,
                host,
                port,
                ftp_path,
                api_endpoint,
                auto_delete_period,
                access_token,
                app_key,
                app_secret,
                redirect_uri
            });
            if (error) {
                return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error.details[0].message);
            }

            const get_storage_type_data = await StorageModel.getStorageDataByDataId(storage_data_id,organization_id);
            if (get_storage_type_data.length > 0) {
                await redisService.delAsync(`${organization_id}_storage_creds`);

                let creds = JSON.parse(get_storage_type_data[0].creds);
                auto_delete_period = auto_delete_period || get_storage_type_data[0].auto_delete_period;

                if (get_storage_type_data[0].short_code == 'GD') {
                    client_id = client_id || creds.client_id;
                    client_secret = client_secret || creds.client_secret;
                    refresh_token = refresh_token || creds.refresh_token;

                    try {
                        await StorageService.checkAccessToStorage(get_storage_type_data[0].short_code, { client_id, client_secret, refresh_token });
                    } catch (error) {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                    }

                    storage_GD_creds = JSON.stringify({ refresh_token: refresh_token, client_id: client_id, client_secret: client_secret })
                    const update_GD = await StorageModel.updateStorageData(storage_data_id, storage_GD_creds, auto_delete_period, note);
                    if (update_GD) {
                        if (update_GD.affectedRows > 0) {
                            actionsTracker(req, 'Storage %i data updated.', [storage_data_id]);
                            message = getStorageMessage(language, "33", auto_delete_period);
                            return sendResponse(res, 200, req.body, message, null);
                        } else {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "25")[language] || storageMessages.find(x => x.id === "25")["en"], null);
                        }
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "26")[language] || storageMessages.find(x => x.id === "26")["en"], null);
                    }

                } else if (get_storage_type_data[0].short_code == 'S3') {
                    client_id = client_id || creds.client_id;
                    client_secret = client_secret || creds.client_secret;
                    region = region || creds.region;
                    bucket_name = bucket_name || creds.bucket_name;

                    try {
                        await StorageService.checkAccessToStorage(get_storage_type_data[0].short_code, { client_id, client_secret, bucket_name, region, api_endpoint: api_endpoint });
                    } catch (error) {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                    }

                    storage_GD_creds = JSON.stringify({ client_id: client_id, client_secret: client_secret, bucket_name: bucket_name, region: region, api_endpoint: api_endpoint })
                    const update_S3 = await StorageModel.updateStorageData(storage_data_id, storage_GD_creds, auto_delete_period, note);
                    if (update_S3) {
                        if (update_S3.affectedRows > 0) {
                            await S3Utils.checkS3CorsPolicy({ client_id, client_secret, bucket_name, region, api_endpoint: api_endpoint });
                            actionsTracker(req, 'Storage %i data updated.', [storage_data_id]);
                            message = getStorageMessage(language, "33", auto_delete_period);
                            return sendResponse(res, 200, req.body, message, null);
                        } else {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "25")[language] || storageMessages.find(x => x.id === "25")["en"], null);
                        }
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "26")[language] || storageMessages.find(x => x.id === "26")["en"], null);
                    }
                } else if (get_storage_type_data[0].short_code == 'ZH' || get_storage_type_data[0].short_code == 'MO') {
                    if (get_storage_type_data[0].short_code == 'ZH') {
                        const updatedCreds = StorageService.customAssign(creds, { zoho_client_id, zoho_client_secret, zoho_refresh_token, domain, team_id });

                        try {
                            await StorageService.checkAccessToStorage(get_storage_type_data[0].short_code, updatedCreds);
                        } catch (error) {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                        }

                        storage_GD_creds = JSON.stringify(updatedCreds);
                    } else {
                        onedrive_client_id = onedrive_client_id || creds.onedrive_client_id;
                        onedrive_client_secret = onedrive_client_secret || creds.onedrive_client_secret;
                        onedrive_redirect_url = onedrive_redirect_url || creds.onedrive_redirect_url;
                        onedrive_refresh_token = onedrive_refresh_token || creds.onedrive_refresh_token;

                        try {
                            await StorageService.checkAccessToStorage(get_storage_type_data[0].short_code, { onedrive_client_id, onedrive_client_secret, onedrive_redirect_url, onedrive_refresh_token });
                        } catch (error) {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                        }

                        storage_GD_creds = JSON.stringify(
                            {
                                onedrive_client_id: onedrive_client_id,
                                onedrive_client_secret: onedrive_client_secret,
                                onedrive_redirect_url: onedrive_redirect_url,
                                onedrive_refresh_token: onedrive_refresh_token,
                                tenantId: tenantId
                            })
                    }
                    const update_ZH_MO = await StorageModel.updateStorageData(storage_data_id, storage_GD_creds, auto_delete_period, note);
                    if (update_ZH_MO) {
                        if (update_ZH_MO.affectedRows > 0) {
                            actionsTracker(req, 'Storage %i data updated.', [storage_data_id]);
                            message = getStorageMessage(language, "33", auto_delete_period);
                            return sendResponse(res, 200, req.body, message, null);
                        } else {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "25")[language] || storageMessages.find(x => x.id === "25")["en"], null);
                        }
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "26")[language] || storageMessages.find(x => x.id === "26")["en"], null);
                    }
                } else if (get_storage_type_data[0].short_code == 'FTP') {
                    const path = StorageService.getFTPPath(ftp_path);
                    const updatedCreds = StorageService.customAssign(creds, { username, password, host, port, ftp_path: path });

                    try {
                        await StorageService.checkAccessToStorage(get_storage_type_data[0].short_code, updatedCreds);
                    } catch (error) {
                        console.log('error :>> ', error);
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                    }

                    const storage_FTP_creds = JSON.stringify(updatedCreds)
                    const update_FTP = await StorageModel.updateStorageData(storage_data_id, storage_FTP_creds, auto_delete_period, note);
                    if (update_FTP) {
                        if (update_FTP.affectedRows > 0) {
                            actionsTracker(req, 'Storage %i data updated.', [storage_data_id]);
                            if (!req.body.ftp_path) {
                                req.body.ftp_path = creds.ftp_path;
                            }
                            message = getStorageMessage(language, "33", auto_delete_period);
                            return sendResponse(res, 200, req.body, message, null);
                        } else {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "25")[language] || storageMessages.find(x => x.id === "25")["en"], null);
                        }
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "26")[language] || storageMessages.find(x => x.id === "26")["en"], null);
                    }
                }
                else if (get_storage_type_data[0].short_code == 'DB') {
                    // Handle Dropbox updates - support both access_token and app credentials
                    let updatedCreds = { ...creds };
                    
                    if (access_token) {
                        // Update with new access token
                        updatedCreds.access_token = access_token;
                        
                        try {
                            await StorageService.checkAccessToStorage(get_storage_type_data[0].short_code, { access_token });
                        } catch (error) {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                        }
                    } else if (app_key && app_secret) {
                        // Update with new app credentials
                        updatedCreds.app_key = app_key;
                        updatedCreds.app_secret = app_secret;
                        if (redirect_uri) updatedCreds.redirect_uri = redirect_uri;
                        if (refresh_token) updatedCreds.refresh_token = refresh_token;
                        
                        try {
                            // Test connection with new credentials
                            let connection = await DropboxService.initConection(updatedCreds, organization_id);
                            const { dbx } = connection;
                            await dbx.filesListFolder({path: ''});
                        } catch (error) {
                            return sendResponse(res, 400, null, `Invalid Dropbox credentials: ${error.message}`, null);
                        }
                    }

                    storage_GD_creds = JSON.stringify(updatedCreds);
                    const update_DB = await StorageModel.updateStorageData(storage_data_id, storage_GD_creds, auto_delete_period, note);
                    if (update_DB) {
                        if (update_DB.affectedRows > 0) {
                            actionsTracker(req, 'Storage %i data updated.', [storage_data_id]);
                            message = getStorageMessage(language, "33", auto_delete_period);
                            return sendResponse(res, 200, req.body, message, null);
                        } else {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "25")[language] || storageMessages.find(x => x.id === "25")["en"], null);
                        }
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "26")[language] || storageMessages.find(x => x.id === "26")["en"], null);
                    }
                }
                else if (get_storage_type_data[0].short_code == 'WD') {
                    // WebDAV update support
                    // Merge incoming values with existing creds
                    const targetUrl = baseUrl || url || creds.baseUrl || creds.url || creds.host || null;
                    const updatedCreds = StorageService.customAssign(creds, {
                        baseUrl: targetUrl,
                        webdav_path: webdav_path || creds.webdav_path,
                        username: username || creds.username,
                        password: password || creds.password,
                        port: port || creds.port
                    });

                    // Validate minimal fields exist after merge
                    if (!updatedCreds.baseUrl || !updatedCreds.webdav_path) {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], 'baseUrl and webdav_path are required for WebDAV');
                    }
                    try {
                        // Try to establish connection with updated credentials
                        await WebDAVUtils.initConection(updatedCreds, organization_id);
                    } catch (error) {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], null);
                    }

                    storage_GD_creds = JSON.stringify(updatedCreds);
                    const update_WD = await StorageModel.updateStorageData(storage_data_id, storage_GD_creds, auto_delete_period, note);
                    if (update_WD) {
                        if (update_WD.affectedRows > 0) {
                            actionsTracker(req, 'Storage %i data updated.', [storage_data_id]);
                            message = getStorageMessage(language, "33", auto_delete_period);
                            return sendResponse(res, 200, req.body, message, null);
                        } else {
                            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "25")[language] || storageMessages.find(x => x.id === "25")["en"], null);
                        }
                    } else {
                        return sendResponse(res, 400, null, storageMessages.find(x => x.id === "26")[language] || storageMessages.find(x => x.id === "26")["en"], null);
                    }

                }

                else {
                    return sendResponse(res, 400, null, storageMessages.find(x => x.id === "27")[language] || storageMessages.find(x => x.id === "27")["en"], null);
                }
            } else {
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "28")[language] || storageMessages.find(x => x.id === "28")["en"], null);
            }

        } catch (err) {
            return sendResponse(res, 400, null, err.message || storageMessages.find(x => x.id === "29")[language] || storageMessages.find(x => x.id === "29")["en"], err);
        }

    }
    async getActiveStorageType(req, res, next) {
        try {
            const { organization_id } = req.decoded;
            const language = req.decoded.language;


            const [storage] = await StorageModel.getActiveStorageType(organization_id);
            if (!storage) return sendResponse(res, 400, null, storageMessages.find(x => x.id === "30")[language] || storageMessages.find(x => x.id === "30")["en"], storageMessages.find(x => x.id === "30")[language] || storageMessages.find(x => x.id === "30")["en"]);

            return sendResponse(res, 200, storage, storageMessages.find(x => x.id === "31")[language] || storageMessages.find(x => x.id === "31")["en"], null);
        } catch (err) {
            next(err);
        }

    }

    async addStorageDataForReseller(req, res) {
        let { organization_id, user_id, language, is_employee, is_teamlead, is_manager } = req.decoded;

        try {
            const { error, value } = joiValidation.resellerIds(req.body);
            let { client_organization_ids, enable } = value;
            if (error) {
                return res.json({ code: 404, data: null, message: translate(settingMessages, "2", language), error: error.details[0].message });
            }

            if(is_employee || is_teamlead || is_manager) {
                let [orgDetails] = await ResellerModel.getOrganizationDetails(organization_id);
                if(!orgDetails) return res.json({ code: 400, data: null, message: translate(resellerMessage, "2", language), err: "Not Found." });
                user_id = orgDetails.user_id;
            }
            
            const [reseller] = await ResellerModel.getReseller({ user_id: user_id });
            if (!reseller) return res.json({ code: 400, data: null, message: translate(resellerMessage, "2", language), err: "Not Found." });

            let clients = await ResellerModel.clientStats({ resellerId: reseller.reseller_id });
            if (clients.length === 0) return res.json({ code: 400, data: null, message: translate(resellerMessage, "5", language), err: "Not present." });

            const orgIds = clients.map(x => x.client_organization_id);
            const storage = await ResellerModel.activeStorage({ orgIds });
            clients = clients.map(x => {
                const obj = storage.find(c => c.organization_id == x.client_organization_id);
                x.reseller_storage = obj ? (obj.reseller ? obj.reseller : false) : false;
                x.expiry = JSON.parse(x.expiry);
                if (obj) x.opc_id = obj.opc_id;
                return x;
            });

            const [resellerStorage] = await StorageModel.getActiveStorageType(organization_id);
            if (!resellerStorage) return res.json({ code: 400, data: null, message: storageMessages.find(x => x.id === "5")[language] || storageMessages.find(x => x.id === "5")["en"], error: null });
            if (client_organization_ids.length !== 0) {
                clients = clients.filter(c => {
                    return client_organization_ids.some(o => {
                        return c.client_organization_id == o;
                    });
                })
            }
            for (const { client_organization_id, client_user_id, opc_id } of clients) {
                if (enable == true || enable == "true") {
                    let org_provided_id;
                    let storage_type = await StorageModel.checkOrgStorageType(resellerStorage.provider_id, client_organization_id);
                    if (storage_type.length > 0) {
                        org_provided_id = storage_type[0].id;
                    } else {
                        const storage_data = await StorageModel.addStorageData(resellerStorage.provider_id, client_organization_id, client_user_id);
                        org_provided_id = storage_data.insertId;
                    }
                    let creds = JSON.parse(resellerStorage.creds);
                    creds = { ...creds, reseller: true }
                    const storage_creds = JSON.stringify({ ...creds, reseller: true });
                    await StorageModel.UpdateStorageActiveOption(client_organization_id);
                    await StorageModel.addStorageCreds(org_provided_id, storage_creds, client_organization_id, client_user_id, resellerStorage.auto_delete_period, 1);
                } else if ((enable == false || enable == "false") && opc_id) {
                    await StorageModel.deleteStorageData(opc_id);
                }
            }
            return sendResponse(res, 200, null, storageMessages.find(x => x.id === "13")[language] || storageMessages.find(x => x.id === "13")["en"], null);

        } catch (err) {
            console.log('---------', err);
            return sendResponse(res, 400, null, err.message || storageMessages.find(x => x.id === "12")[language] || storageMessages.find(x => x.id === "12")["en"], err);
        }
    }

    async addStorageDataForResellerTest(req, res) {
        let message;
        let { organization_id: client_organization_id, user_id: client_user_id, language } = req.decoded;
        let { client_id, client_secret, bucket_name, region, auto_delete_period, status } = req.body;
        let provider_id = req.body.storage_type_id;
        let processError = {};

        try {
            var validation = joiValidation.ValidateStorageId(provider_id, auto_delete_period);
            if (validation.error) {
                return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], validation.error.details[0].message);
            }

            const [reseller] = await ResellerModel.get({ user_id: client_user_id });
            if (!reseller) return res.json({ code: 400, data: null, message: translate(resellerMessage, "2", language), err: "Not Found." });

            let clients = await ResellerModel.clientStats({ resellerId: reseller.reseller_id });
            if (clients.length === 0) return res.json({ code: 400, data: null, message: translate(resellerMessage, "5", language), err: "Already present." });

            const get_type = await StorageModel.getStorageTypeData(provider_id);
            if (get_type.length == 0) {
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "5")[language] || storageMessages.find(x => x.id === "5")["en"], null);
            }
            let storage_data = req.body;
            for (const { client_organization_id: organization_id, client_user_id: user_id } of clients) {
                let org_provided_id;
                let check_storage_type = await StorageModel.checkOrgStorageType(provider_id, organization_id);
                if (check_storage_type.length > 0) {
                    org_provided_id = check_storage_type[0].id;
                }

                if (!org_provided_id) {
                    const add_storage_data = await StorageModel.addStorageData(provider_id, organization_id, user_id);
                    if (add_storage_data.affectedRows > 0) {
                        org_provided_id = add_storage_data.insertId

                    } else {
                        //break
                        processError = { code: 400, message: storageMessages.find(x => x.id === "6")[language] || storageMessages.find(x => x.id === "6")["en"] }
                        break;
                    }

                }
                let breakFor = false;
                const oldCreds = await StorageModel.getOrgCredsOneType(provider_id, organization_id);
                switch (get_type[0].short_code) {
                    case 'GD': {
                        let refresh_token = req.body.refresh_token;
                        var validation = joiValidation.addStorageDataType1(client_id, client_secret, refresh_token);
                        if (validation.error) {
                            processError = { code: 404, message: storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error: validation.error.details[0].message };
                            breakFor = true;
                            break;
                        }

                        const isUniqStore = StorageService.isUniqStore(client_id, 'client_id', oldCreds);
                        if (!isUniqStore) {
                            break;
                            // return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                        }

                        try {
                            await StorageService.checkAccessToStorage(get_type[0].short_code, { client_id, client_secret, refresh_token });
                        } catch (error) {
                            breakFor = true;
                            processError = { code: 400, message: storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], error: null };
                            break;
                        }

                        let storage_creds = JSON.stringify({ refresh_token: refresh_token, client_id: client_id, client_secret: client_secret })

                        await StorageModel.addStorageCreds(org_provided_id, storage_creds, organization_id, user_id, auto_delete_period);
                        break;
                    }
                    case 'S3': {
                        var validation = joiValidation.addStorageDataType2(client_id, client_secret, bucket_name, region);
                        if (validation.error) {
                            processError = { code: 404, message: storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error: validation.error.details[0].message };
                            breakFor = true;
                            break
                        }

                        const isUniqStore = StorageService.isUniqStore(client_id, 'client_id', oldCreds);
                        if (!isUniqStore) {
                            break;
                            // return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                        }

                        try {
                            await StorageService.checkAccessToStorage(get_type[0].short_code, { client_id, client_secret, bucket_name, region });
                        } catch (error) {
                            breakFor = true;
                            processError = { code: 400, message: storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], error: null };
                            break;
                        }

                        let storage_creds = JSON.stringify({ client_id: client_id, client_secret: client_secret, bucket_name: bucket_name, region: region })
                        await StorageModel.addStorageCreds(org_provided_id, storage_creds, organization_id, user_id, auto_delete_period);
                        break;
                    }
                    case 'ZH' || 'MO': {
                        let creds_json;
                        let new_storage_type;
                        if (get_type[0].short_code == 'ZH') {
                            const { zoho_client_id, zoho_client_secret, zoho_refresh_token, domain, team_id } = req.body;
                            const { error, value: creds } = joiValidation.addZohoStorageData({ zoho_client_id, zoho_client_secret, zoho_refresh_token, domain, team_id });
                            if (error) {
                                processError = { code: 404, message: storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error: validation.error.details[0].message };
                                breakFor = true;
                                break
                            }
                            const isUniqStore = StorageService.isUniqStore(zoho_client_id, 'zoho_client_id', oldCreds);
                            if (!isUniqStore) {
                                break;
                                // return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                            }

                            try {
                                await StorageService.checkAccessToStorage(get_type[0].short_code, creds);
                            } catch (error) {
                                processError = { code: 400, message: storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], error: null };
                                breakFor = true;
                                break
                            }

                            new_storage_type = 'Zoho Work Drive';
                            creds_json = JSON.stringify(creds);
                        } else {
                            const onedrive_client_id = req.body.onedrive_client_id;
                            const onedrive_client_secret = req.body.onedrive_client_secret;
                            const onedrive_redirect_url = req.body.onedrive_redirect_url;
                            const onedrive_refresh_token = req.body.onedrive_refresh_token;

                            var validation = joiValidation.addOneDriveStorageData(onedrive_client_id, onedrive_client_secret, onedrive_redirect_url, onedrive_refresh_token);
                            if (validation.error) {
                                processError = { code: 404, message: storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error: validation.error.details[0].message };
                                breakFor = true;
                                break;
                            }
                            const isUniqStore = StorageService.isUniqStore(onedrive_client_id, 'onedrive_client_id', oldCreds);
                            if (!isUniqStore) {
                                break;
                                // return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                            }

                            try {
                                await StorageService.checkAccessToStorage(get_type[0].short_code, { onedrive_client_id, onedrive_client_secret, onedrive_redirect_url, onedrive_refresh_token });
                            } catch (error) {
                                processError = { code: 400, message: storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], error: null };
                                breakFor = true;
                                break
                            }

                            new_storage_type = 'Microsoft One drive';
                            creds_json = JSON.stringify(
                                {
                                    onedrive_client_id: onedrive_client_id,
                                    onedrive_client_secret: onedrive_client_secret,
                                    onedrive_redirect_url: onedrive_redirect_url,
                                    onedrive_refresh_token: onedrive_refresh_token
                                })
                        }

                        await StorageModel.addStorageCreds(org_provided_id, creds_json, organization_id, user_id, auto_delete_period);
                        break;
                    }
                    case 'FTP': {
                        const { error, value: creds } = joiValidation.addFTPStorageData(req.body);
                        if (error) {
                            processError = { code: 404, message: storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error: validation.error.details[0].message };
                            breakFor = true;
                            break;
                        }
                        const isUniqStore = StorageService.isUniqStoreFTP(creds, oldCreds);
                        if (!isUniqStore) {
                            break;
                            // return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                        }

                        try {
                            await StorageService.checkAccessToStorage(get_type[0].short_code, creds);
                        } catch (error) {
                            processError = { code: 400, message: storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], error: null };
                            breakFor = true;
                            break;
                        }

                        const ftp_path = StorageService.getFTPPath(creds.ftp_path) || '/';
                        const storage_creds = JSON.stringify({ ...creds, ftp_path });
                        await StorageModel.addStorageCreds(org_provided_id, storage_creds, organization_id, user_id, auto_delete_period);
                        break;
                    }
                    case 'DB': {
                        const access_token = req.body.token;
                        var validation = joiValidation.addDropboxStorageData(access_token);
                        if (validation.error) {
                            processError = { code: 404, message: storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], error: validation.error.details[0].message };
                            breakFor = true;
                            break;
                        }

                        const isUniqStore = StorageService.isUniqStore(access_token, 'access_token', oldCreds);
                        if (!isUniqStore) {
                            break;
                            // return sendResponse(res, 400, null, storageMessages.find(x => x.id === "8")[language] || storageMessages.find(x => x.id === "8")["en"], null);
                        }

                        try {
                            await StorageService.checkAccessToStorage(get_type[0].short_code, { access_token });
                        } catch (error) {
                            processError = { code: 400, message: storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], error: null };
                            breakFor = true;
                            break;
                        }

                        let storage_creds = JSON.stringify({ access_token: access_token });
                        await StorageModel.addStorageCreds(org_provided_id, storage_creds, organization_id, user_id, auto_delete_period);
                        break;
                    }
                    default: {
                        processError = { code: 400, message: storageMessages.find(x => x.id === "11")[language] || storageMessages.find(x => x.id === "11")["en"], error: null };
                        breakFor = true;
                        break;
                    }
                }

                if (breakFor) {
                    break;
                }
            }
            message = getStorageMessage(language, "34", auto_delete_period);
            if (processError.code) {
                return sendResponse(res, processError.code, null, processError.message, processError.error);
            } else {
                return sendResponse(res, 200, null, 'Storage Added.', null);
            }
        } catch (err) {
            console.log('--------', err);
            return sendResponse(res, 400, null, err.message || storageMessages.find(x => x.id === "12")[language] || storageMessages.find(x => x.id === "12")["en"], err);
        }
    }


    async addSftpIntegrationData(req, res, next) {
        let { organization_id, user_id, language = "en" } = req.decoded;
        const fs = require("fs");
        try {
            // if(!req?.file?.path) return res.json({ code: 400, error: "SERVER KEY NOT FOUND"})

            let { username, host, ftp_path, port = 22, pemPath = "", auto_delete_period, password= "12", note   } = req.body;

            if (!username || !host || !ftp_path || !port || !auto_delete_period) {
                return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], null);
            }
            if(req?.file?.path) pemPath = fs.readFileSync(req?.file?.path).toString().replace(/\n/g, '\\n');

            await SFTPUTILS.initConection({ username, host, ftp_path, port, pemPath, password}, organization_id);
            
            let storage_creds = JSON.stringify({ username, host, ftp_path, port, pemPath, auto_delete_period, password  });

            let insertId = await StorageModel.addStorageData("7", organization_id, user_id)
            await StorageModel.addStorageCreds(insertId.insertId, storage_creds, organization_id, user_id, auto_delete_period, null, note);
            
            if (req?.file?.path) {
                try { fs.unlinkSync(req.file.path); } catch (_) { /* already gone */ }
            }
            try { await SFTPUTILS.deleteCreds(`${organization_id}`); } catch (_) {}

            return sendResponse(res, 200, null, storageMessages.find(x => x.id === "13")[language] || storageMessages.find(x => x.id === "13")["en"], null);
        } catch (error) {
            // Cleanup must not throw — otherwise it masks the real error with a
            // misleading TypeError ("path argument must be of type string...").
            if (req?.file?.path) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            try { await SFTPUTILS.deleteCreds(`${organization_id}`); } catch (_) {}
            if (error.message === "connect: getConnection: All configured authentication methods failed") {
                return sendResponse(res, 400, null, storageMessages.find(x => x.id === "32")[language] || storageMessages.find(x => x.id === "32")["en"], error?.message);
            }
            else return sendResponse(res, 400, null, storageMessages.find(x => x.id === "9")[language] || storageMessages.find(x => x.id === "9")["en"], error?.message);
        }
    }

    async addWebdavIntegrationData(req, res, next) {
        let { organization_id, user_id, language = "en" } = req.decoded;
        try {
            let { baseUrl, url, host, webdav_path, port = 80, username = "", password = "", auto_delete_period, note } = req.body;

            const targetUrl = baseUrl || url || (host ? `${host}${port ? `:${port}` : ''}` : null);
            if (!targetUrl || !webdav_path || !auto_delete_period) {
                return sendResponse(res, 404, null, storageMessages.find(x => x.id === "2")[language] || storageMessages.find(x => x.id === "2")["en"], null);
            }

            const storageObj = {
                baseUrl: targetUrl,
                webdav_path,
                username,
                password,
                port
            };

            // Try to init connection to validate credentials
            await WebDAVUtils.initConection(storageObj, organization_id);

            const storage_creds = JSON.stringify({ baseUrl: targetUrl, webdav_path, username, password, port, auto_delete_period });

            // Determine provider id for WebDAV. Prefer storage_type_id from body, else find by short_code 'WD'
            let provider_id = req.body.storage_type_id;
            if (!provider_id) {
                const providers = await StorageModel.getStorageTypes();
                const found = providers.find(p => p.short_code && p.short_code.toUpperCase() === 'WD');
                if (found) provider_id = found.id;
            }
            if (!provider_id) {
                return sendResponse(res, 400, null, 'WebDAV provider is not configured in providers table', null);
            }

            const insertRes = await StorageModel.addStorageData(provider_id, organization_id, user_id);
            await StorageModel.addStorageCreds(insertRes.insertId, storage_creds, organization_id, user_id, auto_delete_period, null, note);

            return sendResponse(res, 200, null, storageMessages.find(x => x.id === "13")[language] || storageMessages.find(x => x.id === "13")["en"], null);
        } catch (error) {
            try { await WebDAVUtils.deleteCreds(`${organization_id}`); } catch (e) {}
            return sendResponse(res, 400, null, storageMessages.find(x => x.id === "9")[language] || storageMessages.find(x => x.id === "9")["en"], error?.message || null);
        }
    }
}
module.exports = new StorageController;