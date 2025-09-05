import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { RootComponent } from '@app/root.component';
import { appConfig } from '@app/app.config';

registerLocaleData(localePt);

bootstrapApplication(RootComponent, appConfig).catch(console.error);
