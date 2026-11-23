import * as _ from 'underscore';

import { StorageUtilInterface } from '../interfaces/storage-util.interface';
import { UploadDto } from '../dto/upload.dto';
import { IEnsureFolder } from '../interfaces/storage-folders-cache.interface';

import SftpClient from "ssh2-sftp-client";

export class SFtpUtils implements StorageUtilInterface {
    private client: SftpClient;
    private clientPath;
    private dirClient;
    private delimiter: string = '/';
    private _main: string = '';
    private dayFolderEnsure: IEnsureFolder = {};

    async initConnection(storage: any, organization_id: any): Promise<void> {
        // Each upload attempt owns its connection, including cleanup after a failed connect.
        this.client = new SftpClient();
        this.clientPath = storage.ftp_path;

        let tempConnectionData: any = {
            host: storage.host,
            port: storage.port,
            username: storage.username,
        };

        if(storage.pemPath) tempConnectionData.privateKey = Buffer.from(storage.pemPath.replace(/\\n/g, '\n'), 'utf-8');
        else tempConnectionData.password = storage.password;
        
        await this.client.connect(tempConnectionData);
    };

    async prepareFolderPath(email: string, main: string): Promise<void> {
        // user email is in email
        // main is folder name 
        let listMainPath = await this.client.list(`${this.clientPath}`);
        listMainPath = listMainPath.filter(i => i.name === main);
        if(listMainPath.length === 0) {
            // Create a new folder
            await this.client.mkdir(`${this.clientPath}/${main}`, true);
        }
        let listUserEmailPath = await this.client.list(`${this.clientPath}/${main}`);
        listUserEmailPath = listUserEmailPath.filter(i => i.name === email);
        if(listUserEmailPath.length === 0) {
            // Create a new folder
            await this.client.mkdir(`${this.clientPath}/${main}/${email}`, true);
        }
        this.dirClient = `${this.clientPath}/${main}/${email}`;
    };

    async uploadFile(file: UploadDto): Promise<void> {
        const day = file.originalname.slice(3, 13);
        let listUserEmailPath = await this.client.list(`${this.dirClient}`);
        listUserEmailPath = listUserEmailPath.filter(i => i.name === day);
        if(listUserEmailPath.length === 0) {
            // Create a new folder
            await this.client.mkdir(`${this.dirClient}/${day}`, true);
        }
        await this.client.put(file.filepath, `${this.dirClient}/${day}/${file.originalname}`);
    };

    async initPutClient(baseOptions) {

    };

    async initConnDirClient(baseOptions) {

    };

    async closeConnection(): Promise<void> {
        const client = this.client;
        this.client = undefined;
        if (client) await client.end();
    };

    get main() {
        return this._main;
    }

    set main(part) {
        if (!part) return;
        if (!this.existDelimiter(part)) {
            this._main += this.delimiter;
        }
        this._main += part;
    }

    existDelimiter(part) {
        return _.first(part) === this.delimiter || _.last(this._main) === this.delimiter;
    }

    async initConnection_old(storage: any): Promise<void> {

    };

    async uploadFile_old(file: UploadDto): Promise<void> {

    };
}
