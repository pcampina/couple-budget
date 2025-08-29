import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { AppComponent } from '@app/app.component';

registerLocaleData(localePt);

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'pt-PT' }
  ]
}).catch(console.error);
