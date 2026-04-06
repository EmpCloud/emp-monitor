import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ResponseHelperService } from './response.helper.service';
import { HttpHelperService } from './http.helper.service';
import { RandomStringHelperService } from './random.helper.service';

const ProvidersAndExports = [ResponseHelperService, HttpHelperService, RandomStringHelperService];

@Module({
    imports: [HttpModule],
    providers: ProvidersAndExports,
    exports: ProvidersAndExports,
})
export class HelperModule { }
