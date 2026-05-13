import { StorageUtilInterface } from '../interfaces/storage-util.interface';
import { UploadDto } from '../dto/upload.dto';
import { createReadStream } from 'fs';
import { Dropbox } from 'dropbox';
import axios from 'axios';
import Redis from 'ioredis';

export class DropboxUtils implements StorageUtilInterface {
    private dropboxClient: Dropbox;
    private email: string;
    private main: string;
    private type: string;
    private date: string;
    private redisClient: Redis;

    constructor() {
        // Initialize Redis client directly
        this.redisClient = new Redis({
            host: process.env.REDIS_HOST,
            port: 6379,
            password: process.env.REDIS_PASSWORD
        });
    }

    async initConnection(storage: any, organization_id?: number): Promise<void> {
        try {
            // Check for cached token first
            let token = await this.redisClient.get(`dropbox:token:${organization_id}`);
            
            if (token) {
                this.dropboxClient = new Dropbox({
                    accessToken: token
                });
                
                // Verify connection by listing root folder
                await this.dropboxClient.filesListFolder({ path: '' });
            } else {
                // Refresh token using app credentials
                const { app_key, app_secret, refresh_token } = storage;
                
                const response = await axios.post(
                    'https://api.dropboxapi.com/oauth2/token',
                    new URLSearchParams({
                        refresh_token: refresh_token,
                        grant_type: 'refresh_token'
                    }).toString(),
                    {
                        headers: { 
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Basic ${Buffer.from(`${app_key}:${app_secret}`).toString('base64')}`
                        },
                        auth: {
                            username: app_key,
                            password: app_secret
                        }
                    }
                );

                this.dropboxClient = new Dropbox({
                    accessToken: response.data.access_token
                });

                // Verify connection by listing root folder
                await this.dropboxClient.filesListFolder({ path: '' });

                // Cache the token for 3 hours 55 minutes (Dropbox tokens are valid for 4 hours)
                await this.redisClient.setex(`dropbox:token:${organization_id}`, 3 * 60 * 60 + 55 * 60, response.data.access_token);
            }
        } catch (error) {
            throw error;
        }
    }

    async prepareFolderPath(email: string, main: string, custom: any): Promise<void> {
        this.main = main;
        this.email = email;
    }

    async uploadFile({ originalname, filepath, mimetype }: UploadDto): Promise<void> {
        const day = originalname.substr(3, 10);
        let folderPath = `/${this.main}/${this.email}/${day}`;
        this.date = day;

        const filePath = `${folderPath}/${originalname}`;
        
        try {
            // Create folder structure if it doesn't exist
            await this.createFolderIfNotExists(folderPath);
            
            // Upload file
            const fileBuffer = await this.readFileAsBuffer(filepath);
            
            const response = await this.dropboxClient.filesUpload({
                path: filePath,
                contents: fileBuffer,
                mode: { '.tag': 'overwrite' },
                autorename: false
            });
            
            if (!response.result) {
                throw new Error('Failed to upload file to Dropbox');
            }
        } catch (error) {
            throw new Error(`Dropbox upload failed: ${error.message}`);
        }
    }

    async getFileUrl(fileName: string): Promise<{ url: string; key: string }> {
        const day = fileName.substr(3, 10);
        let folderPath = `/${this.main}/${this.email}/${day}`;


        const filePath = `${folderPath}/${fileName}`;
        
        try {
            // Create a temporary shared link
            const response = await this.dropboxClient.sharingCreateSharedLinkWithSettings({
                path: filePath,
                settings: {
                    requested_visibility: { '.tag': 'public' },
                    audience: { '.tag': 'public' },
                    access: { '.tag': 'viewer' }
                }
            });

            if (response.result && response.result.url) {
                // Convert Dropbox shared link to direct download link
                const directUrl = response.result.url.replace('?dl=0', '?dl=1');
                return {
                    url: directUrl,
                    key: filePath
                };
            } else {
                throw new Error('Failed to create shared link');
            }
        } catch (error) {
            throw new Error(`Failed to generate Dropbox URL: ${error.message}`);
        }
    }

    private async createFolderIfNotExists(folderPath: string): Promise<void> { 
        // Split the path into parts and create each level recursively
        const pathParts = folderPath.split('/').filter(part => part !== '');
        let currentPath = '';
        
        for (const part of pathParts) {
            currentPath += `/${part}`;

            try {
                // Check if this level exists
                await this.dropboxClient.filesGetMetadata({
                    path: currentPath
                });
            } catch (checkError) {

                // If it doesn't exist (404) or path not found (409), create it
                if (checkError.status === 404 || checkError.status === 409) {
                    try {
                        await this.dropboxClient.filesCreateFolderV2({
                            path: currentPath,
                            autorename: false
                        });
                    } catch (createError) {
                        // If creation fails with 409, folder already exists (race condition)
                        if (createError.status !== 409) {
                            throw createError;
                        } else {
                            console.log(`Folder already exists (409): ${currentPath}`);
                        }
                    }
                } else {
                    throw checkError;
                }
            }
        }
    }

    private async readFileAsBuffer(filepath: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            const stream = createReadStream(filepath);
            
            stream.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });
            
            stream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            
            stream.on('error', (error) => {
                reject(error);
            });
        });
    }

    async closeConnection(): Promise<void> {
        // Dropbox client doesn't require explicit connection closing
        // This method is optional and can be left empty
    }

    async checkIfOfficeAgentFolderExist(userData: any): Promise<void> {
        try {
            const folderPath = `/${this.main}/${userData.email}`;
            await this.dropboxClient.filesGetMetadata({
                path: folderPath
            });
        } catch (error) {
            if (error.status === 404) {
                throw new Error('Folder does not exist');
            }
            throw error;
        }
    }

    deleteCreds(organization_id: any): boolean {
        // Dropbox doesn't require credential deletion like SFTP
        // This method is optional and can be left empty
        return true;
    }
}
