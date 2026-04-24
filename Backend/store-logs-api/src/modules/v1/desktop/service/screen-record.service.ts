import { IResponse } from '../../../../common/interfaces/response.interface';
import { Injectable } from '@nestjs/common';
import { ResponseHelperService } from 'src/common/helper/response.helper.service';
import { IDecodedToken } from '../../../../common/interfaces/decoded-token.interface';
import { ScreenRecordDTO } from '../dto//screen-record.dto';
import { IntegrationModel } from 'src/database/sequelize-db/models/integraion.model';
import {
  saveFiles,
  deleteFileFromLocal,
  deleteFilesFromLocal,
  videoFilesValidate,
  transformVideoFiles
} from '../utils/file.utils';
import { mainFolderNames, providerCodes, localyFolders } from '../constants';
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
import { RedisService } from 'src/common/helper/redis.helper.service';
import configFile from "../../../../../../config/config.js";

@Injectable()
export class ScreenRecordService {
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
  ) {
    const provider = new Provider();
    try {
      await provider.initConnection(storage, 1);
      await provider.prepareFolderPath(email, mainFolderNames.screenRecords,"");
    } catch (error) {
      console.log(error.stack);
      return files;
    }

    for (const file of files) {
      if (file.uploaded) continue;

      try {
        await provider.uploadFile(file);
        file.uploaded = true;
        await deleteFileFromLocal(file);
      } catch (error) {
        console.log(error.stack);
        break;
      }
    }
    return files;
  }

  async endRequest(
    statusCode: number,
    message: string,
    files: UploadDto[],
    error = null,
  ) {
    if (files && files.length) {
      await deleteFilesFromLocal(files);
    }
    const uploadedFilenames = files
      .filter(file => file.uploaded)
      .map(file => file.filename);

    return this.responseHelperService.sendResponse(
      statusCode,
      message,
      error,
      uploadedFilenames,
    );
  }

  hasNonUploadedFiles(files) {
    return files.filter(file => !file.uploaded).length > 0;
  }

  async upload(
    files: UploadDto[],
    userData: IDecodedToken,
    data: ScreenRecordDTO,
  ): Promise<IResponse> {
    console.log(
      '-e-',
      userData.employee_id,
      '-d-',
      new Date(),
      ' === Screen records received === ',
      '-em-',
      userData.email,
      '-f-',
      files.length,
    );
    // check file length
    if (files.length === 0) {
      return this.endRequest(404, 'No records file available', files);
    }

    if(userData?.setting?.screen_record?.is_enabled == 0) return this.endRequest(200, 'Successfully screen records uploaded', files);

    if(configFile.DISABLE_SCREEN_RECORD_TRACKING.includes(+userData.organization_id)) return this.endRequest(200, 'Successfully screen records uploaded', files);

    const allowedUsers = configFile.SCREEN_RECORDING_FOR_SPECIFIC_USERS[userData.organization_id];
    if (allowedUsers && !allowedUsers.includes(userData.id)) {
      return this.endRequest(
        200,
        'Successfully screen records uploaded',
        files,
        null,
      );
    }
    
    // getting cloud provider data
    let storage = null;
    let dbStorageData = null;
    try {
        let getScrnStorageData = await this.redisService.getClient().get(`${userData.organization_id}_storage_creds`);
        if(getScrnStorageData) {
            dbStorageData = JSON.parse(getScrnStorageData);
        }
        else {
            dbStorageData = await this.integrationModel.findOne(userData.organization_id);
            if (dbStorageData?.organizationproviders?.orgProCreds?.is_expired === 1) return this.endRequest(400, 'Storage access failed, please check your credentials.', files);
            await this.redisService.getClient().set(`${userData.organization_id}_storage_creds`, JSON.stringify(dbStorageData), 'EX', 28800);
        }
        storage = JSON.parse(dbStorageData.organizationproviders.orgProCreds.creds);
    } catch (error) {
      return this.endRequest(
        400,
        'Failed to retrieve cloud integration data',
        files,
        error,
      );
    }
    
    if (!dbStorageData?.short_code) {
      return this.endRequest(
        400,
        'The cloud provider name is not setup in DB',
        files,
      );
    }

    // checking if provider is supported
    const providerCode = dbStorageData.short_code;
    if (!this.providers.has(providerCode)) {
      return this.endRequest(
        400,
        `Provider ${providerCode} is not supported`,
        files,
      );
    }
    // saving files locally
    try {
      await saveFiles(files, userData.email, localyFolders.records, data);
    } catch (error) {
      return this.endRequest(500, 'Failed to dump files to disk', files, error);
    }

    //! Code for backend compression has been commented.
    // try {
    //   if(data.mustCompressed) {
    //       await transformVideoFiles(files)
    //   } else {
    //       await videoFilesValidate(files);
    //   }
      
    // } catch (error) {
    //   return this.endRequest(400, error.message, files, error);
    // }
    // first upload attempt
    const ProviderClass = this.providers.get(providerCode);
    files = await this.uploadToCloud(
      ProviderClass,
      storage,
      files,
      userData.email,
    );
    // if there are not uploaded files left => second attempt after timeout
    if (this.hasNonUploadedFiles(files)) {
      const retryTimeoutSeconds =
        Number(process.env.RETRY_TIMEOUT_SECONDS) || 5;
      await new Promise<void>(resolve =>
        setTimeout(() => resolve(), retryTimeoutSeconds * 1000),
      );
      await this.uploadToCloud(ProviderClass, storage, files, userData.email);
    }
    
    if (this.hasNonUploadedFiles(files)) {
      return this.endRequest(400, 'Failed screen records uploading', files);
    } else {
      return this.endRequest(200, 'Successfully screen records uploaded', files);
    }
  }
}
