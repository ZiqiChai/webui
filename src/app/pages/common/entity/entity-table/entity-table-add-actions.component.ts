import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { RestService } from '../../../../services/rest.service';

import { EntityTableComponent } from './entity-table.component';

@Component({
  selector: 'app-entity-table-add-actions',
  templateUrl: './entity-table-add-actions.component.html',
})
export class EntityTableAddActionsComponent implements OnInit {
  @Input('entity') entity: any;

  actions: any[];
  menuTriggerMessage = 'Click for options';

  spin = true;
  direction = 'left';
  animationMode = 'fling';
  get totalActions() {
    const addAction = this.entity.conf.route_add ? 1 : 0;
    return this.actions.length + addAction;
  }

  constructor(protected translate: TranslateService) { }

  ngOnInit() {
    this.actions = this.entity.getAddActions();
  }
}
