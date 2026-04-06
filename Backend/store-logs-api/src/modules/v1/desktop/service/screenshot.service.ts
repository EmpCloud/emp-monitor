import { IResponse } from '../../../../common/interfaces/response.interface';
import { Injectable } from '@nestjs/common';
import { ResponseHelperService } from 'src/common/helper/response.helper.service';
import { IDecodedToken } from '../../../../common/interfaces/decoded-token.interface';
import { ScreenshotDTO } from '../dto/screenshot.dto';
import { IntegrationModel } from 'src/database/sequelize-db/models/integraion.model';
import { mainFolderNames, providerCodes, localyFolders } from '../constants';
import { saveFiles, deleteFileFromLocal, deleteFilesFromLocal, imageFilesValidate, checkPathExistence } from '../utils/file.utils';
import { UploadDto } from '../dto/upload.dto';
import { StorageUtilInterface } from '../interfaces/storage-util.interface';
import { GoogleDriveUtils } from '../utils/google-drive.utils';
import { S3Util } from '../utils/s3.util';
import { FtpUtils } from '../utils/ftp.utils';
import { ZohoWorkdriveUtils } from '../utils/zoho-workdrive.utils';
import { OnedriveUtils } from '../utils/one-drive.utils';
import { SFtpUtils } from '../utils/SFTP.utils';
import { DropboxUtils } from '../utils/dropbox.utils';
import { WebDavUtils } from '../utils/WebDav.utils';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Logger } from '../../../../common/errlogger/logger';
import ConfigFile from '../../../../../../config/config.js';

const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USERNAME, process.env.MYSQL_PASSWORD, {
    host: process.env.MYSQL_HOST,
    dialect: 'mysql'
});

const logger = new Logger;

const testGDCredentials = {
    dbStorageData: { short_code: 'GD' },
    storage: {
        client_id: '',
        client_secret: '',
        refresh_token: '',
    },
};

const testS3Credentials = {
    dbStorageData: { short_code: 'S3' },
    storage: {
        client_id: '',
        client_secret: '',
        bucket_name: '',
    },
};

const testFTPCredentials = {
    dbStorageData: { short_code: '' },
    storage: {
        username: '',
        password: '',
        host: '',
        port: 3021,
    },
};

const testZHCredentials = {
    dbStorageData: { short_code: 'ZH' },
    storage: {
        zoho_client_id: '',
        zoho_client_secret: '',
        zoho_refresh_token: '',
        domain: 'in',
        team_id: ""
    },
};

const testODCredentials = {
    dbStorageData: { short_code: 'MO' },
    storage: {
        client_id: '',
        client_secret: '',
        refresh_token: '',
        redirect_uri: '',
    },
};

@Injectable()
export class ScreenshotService {
    private providers: Map<string, typeof StorageUtilInterface>;

    constructor(
        private readonly responseHelperService: ResponseHelperService,
        private readonly integrationModel: IntegrationModel,
        private readonly redisService: RedisService,
    ) {
        this.providers = new Map();

        // here is a place for plugging in new providers
        // you should set new entry ['provider_short_code', ProviderClassReference]
        // every provider must implement StorageUtilInterface
        this.providers.set(providerCodes.googleDrive, GoogleDriveUtils);
        this.providers.set(providerCodes.amazonS3, S3Util);
        this.providers.set(providerCodes.FTP, FtpUtils);
        this.providers.set(providerCodes.zohoWorkDrive, ZohoWorkdriveUtils);
        this.providers.set(providerCodes.OneDrive, OnedriveUtils);
        this.providers.set(providerCodes.SFTP, SFtpUtils);
        this.providers.set(providerCodes.Dropbox, DropboxUtils);
        this.providers.set(providerCodes.webdav, WebDavUtils);
    }

    async uploadToCloud(
        Provider: typeof StorageUtilInterface,
        storage,
        files: UploadDto[],
        email: string,
        providerCode: string,
        userDetails: any,
    ) {
        const provider = new Provider();

        if (ConfigFile?.CUSTOM_DATE_EMAIL_SCREEN_FORMAT?.split(",")?.includes(String(userDetails.organization_id)) && providerCode == "MO") {
            try {
                // Create A New Connections
                await provider.initConnection(storage , userDetails.organization_id);
            } catch (error) {
                logger.logger.info(`------${new Date}------${error.stack}------${email}------`);
                return files;
            }

            for (const file of files) {
                if (file.uploaded) continue;
                const day: string = file.originalname.substr(3, 10);
                try {
                    await provider.prepareFolderPath(email, mainFolderNames.screenshots, { type: "CUSTOM_DATE_EMAIL_SCREEN_FORMAT", day  });
                } catch (error) {
                    logger.logger.info(`------${new Date}------${error.stack}------${email}------`);
                    break;
                }

                try {
                    await provider.uploadFile(file);
                    file.uploaded = true;
                    await deleteFileFromLocal(file);
                } catch (error) {
                    logger.logger.info(`------${new Date}------${error.stack}------${email}------`);
                    break;
                }
            }
            return files;
        }
        
        try {
            if (process?.env?.ORG_OFFICE_AGENT_TRANSFORMED?.split(",").includes(String(userDetails.organization_id)) && userDetails?.system_type === 0 && userDetails?.a_email) {
                if (userDetails.a_email) email = userDetails.a_email;
            }
            await provider.initConnection(storage , userDetails.organization_id);
            try {
                if (providerCode === "GD" && process?.env?.UPDATE_IN_SCREENSHOT_OFFICE_USER?.split(",").includes(String(userDetails.organization_id)) && userDetails.system_type == 0) {
                    //! Get user alternative email if present based on office mail id
                    let userRedisEmailScreenshot = await this.redisService.getOrThrow().get(`${userDetails.email}_screenshot`);
                    let storedUserEmail = userDetails.email

                    let userDrivePattern: any;
                    if(userDetails.system_type === 0) {
                        userDrivePattern =`${userDetails.first_name}_${userDetails.last_name}_${userDetails.id}`
                    }

                    //! If userRedis email exist and its didn't match with alternative email then update email with new redis email
                    if ( userRedisEmailScreenshot && userRedisEmailScreenshot !== userDrivePattern) {
                        userDetails.a_email = userDrivePattern;
                        userDetails.email = userRedisEmailScreenshot;

                        //! Rename email in google drive
                        let response: any = await provider.checkIfOfficeAgentFolderExist(userDetails);
                        if (response == false) return files;
                        if (userDrivePattern) email = userDrivePattern;
                        //! If Rename is success then update email with alternative email
    
                        //! Save new alternative email to redis
                        await this.redisService.getOrThrow().set(`${storedUserEmail}_screenshot`, `${userDrivePattern}`);
                    } 
                    else {
                        if(userRedisEmailScreenshot) {
                            email = userDrivePattern;
                        }
                        await this.redisService.getOrThrow().set(`${storedUserEmail}_screenshot`, `${storedUserEmail}`);
                    }
                }
            } catch (error) {
                console.log("Error while rename folder", error);
            }
            await provider.prepareFolderPath(email, mainFolderNames.screenshots, "");
        } catch (error) {
            logger.logger.info(`------${new Date}------${error.stack}------${email}------`);
            try {
                // userDetails.organization_id  
                if(providerCode == "MO") {
                    // let resp = await sequelize.query(`SELECT opc.id, opc.status
                    //     FROM organization_provider_credentials opc 
                    //     JOIN organization_providers op on op.id = opc.org_provider_id 
                    //     WHERE op.organization_id = ${userDetails?.organization_id} AND opc.status = 1`, { type: sequelize.QueryTypes.SELECT }
                    // )
                    // await sequelize.query(`
                    //     UPDATE organization_provider_credentials SET status = 0 
                    //         where id = ${resp[0].id}`, { type: sequelize.QueryTypes.UPDATE }
                    // )
                    logger.logger.error(`------${new Date}------${error.stack}------${email}---${userDetails?.organization_id}---`);
                }
            } catch (error) {
                
            }
            return files;
        }

        if(ConfigFile?.CUSTOM_DATE_EMAIL_SCREEN_FORMAT_S3?.split(",").includes(String(userDetails.organization_id)) && providerCode == "S3") {
            for (const file of files) {
                if (file.uploaded) continue;
                await provider.prepareFolderPath(email, mainFolderNames.screenshots, {type: "CUSTOM_DATE_EMAIL_SCREEN_FORMAT_S3", date: file.originalname.substr(3, 10)});
                try {
                    await provider.uploadFile(file);
                    file.uploaded = true;
                    await deleteFileFromLocal(file);
                } catch (error) {
                    logger.logger.info(`------${new Date}------${error.stack}------${email}------`);
                    break;
                }
            }
            return files;
        }

        for (const file of files) {
            if (file.uploaded) continue;

            try {
                await provider.uploadFile(file);
                file.uploaded = true;
                await deleteFileFromLocal(file);
            } catch (error) {
                if (providerCode === "SFTP") await provider.deleteCreds(userDetails.organization_id);
                logger.logger.info(`------${new Date}------${error.stack}------${email}------`);
                break;
            }
        }
        if (providerCode == 'FTP') {
            await provider.closeConnection()
        }
        if(providerCode == 'SFTP') await provider.deleteCreds(userDetails.organization_id);
        return files;
    }

    async endRequest(statusCode: number, message: string, files: UploadDto[], error = null) {
        if (files && files.length) {
            for (const file of files) {
                if(await checkPathExistence(file.filepath)) {
                    await deleteFileFromLocal(file);
                }
            }
        }
        const uploadedFilenames = files.filter((file) => file.uploaded).map((file) => file.filename);

        return this.responseHelperService.sendResponse(statusCode, message, error, uploadedFilenames);
    }

    hasNonUploadedFiles(files) {
        return files.filter((file) => !file.uploaded).length > 0;
    }

    async upload(files: UploadDto[], userData: IDecodedToken, data: ScreenshotDTO,): Promise<IResponse> {
        try {
            console.log('-e-', userData.employee_id, '-d-', new Date(), ' === Screenshot received === ', '-em-', userData.email, '-f-', files.length,);
            // check file length
            if (files.length === 0) {
                return this.endRequest(404, 'No image file available', files);
            }
            if(ConfigFile.DISABLE_SCREENSHOT_TRACKING.includes(+userData.organization_id)) return this.endRequest(200, 'Successfully screenshot uploaded', files);
            // getting cloud provider data
            let storage = null;
            let dbStorageData = null;
            try {
                let getScrnStorageData = await this.redisService.getOrThrow().get(`${userData.organization_id}_storage_creds`);
                if(getScrnStorageData) {
                    dbStorageData = JSON.parse(getScrnStorageData);
                }
                else {
                    dbStorageData = await this.integrationModel.findOne(userData.organization_id);
                    if (dbStorageData?.organizationproviders?.orgProCreds?.is_expired === 1) return this.endRequest(400, 'Storage access failed, please check your credentials.', files);
                    await this.redisService.getOrThrow().set(`${userData.organization_id}_storage_creds`, JSON.stringify(dbStorageData), 'EX', 28800);
                }
                storage = JSON.parse(dbStorageData.organizationproviders.orgProCreds.creds);
                // ({ dbStorageData, storage } = testZHCredentials);
            } catch (error) {
                return this.endRequest(400, 'Failed to retrieve cloud integration data', files, error);
            }
    
            if (!dbStorageData?.short_code) {
                return this.endRequest(400, 'The cloud provider name is not setup in DB', files);
            }
    
            // checking if provider is supported
            const providerCode = dbStorageData.short_code;
            if (!this.providers.has(providerCode)) {
                return this.endRequest(400, `Provider ${providerCode} is not supported`, files);
            }
    
            // saving files locally
            try {
                await saveFiles(files, userData.email, localyFolders.screenshots, data);
            } catch (error) {
                return this.endRequest(500, 'Failed to dump files to disk', files, error);
            }
            // try {
            //     await imageFilesValidate(files);
            // } catch (error) {
            //     return this.endRequest(400, error.message, files, error);
            // }
            // first upload attempt
            const ProviderClass = this.providers.get(providerCode);
            files = await this.uploadToCloud(ProviderClass, storage, files, userData.email, providerCode, userData);
    
            // if there are not uploaded files left => second attempt after timeout
            if (this.hasNonUploadedFiles(files)) {
                const retryTimeoutSeconds = Number(process.env.RETRY_TIMEOUT_SECONDS) || 5;
                await new Promise((resolve: any) => setTimeout(() => resolve(), retryTimeoutSeconds * 1000));
                await this.uploadToCloud(ProviderClass, storage, files, userData.email, providerCode, userData);
            }
    
            if (this.hasNonUploadedFiles(files)) {
                return this.endRequest(400, 'Failed screenshots uploading', files);
            } else {
                return this.endRequest(200, 'Successfully screenshot uploaded', files);
            }
        } catch (error) {
            return this.endRequest(400, 'Failed screenshots uploading', files);
        }
    }
}
