// @ts-nocheck
import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { map } from 'rxjs/operators';

@Injectable()
export class HttpHelperService {
    constructor(private readonly httpService: HttpService) { }

    async httpGet(url: string, headers: any): Promise<any> {

        let response = null;
        if (headers) {
            response = await this.httpService
                .get(url, { headers })
                .pipe(map(res => res.data))
                .toPromise();
        } else {
            response = await this.httpService
                .get(url)
                .pipe(map(res => res.data))
                .toPromise();
        }

        if (response.error) {
            throw new BadRequestException(response.error.message);
        }

        return response;
    }

    async httpPost(url: string, data: any): Promise<any> {
        const response = await this.httpService
            .post(url, data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
            .pipe(map(res => res.data))
            .toPromise();

        if (response.error) {
            throw new BadRequestException(response.error_description || response.error.message);
        }

        return response;
    }
}
