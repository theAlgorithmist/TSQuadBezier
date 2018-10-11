import { BrowserModule } from '@angular/platform-browser';
import { NgModule      } from '@angular/core';

import { AppComponent        } from './app.component';
import { QuadBezierDirective } from './directives/quad-bezier.directive';

@NgModule({
  declarations: [
    AppComponent, QuadBezierDirective
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
