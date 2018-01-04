import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DialogService, WebSocketService } from '../../../../services';
import { AppLoaderService } from '../../../../services/app-loader/app-loader.service';
import { Subscription } from 'rxjs';
import { EntityUtils } from '../../../common/entity/utils';

@Component({
  selector : 'app-storage-list',
  template : `<entity-table [title]="title" [conf]="this"></entity-table>`
})
export class StorageListComponent {

  public title = "Mount points";
  protected queryCall = 'jail.fstab';
  protected queryCallOption = [];
  protected queryRes: any = [];
  protected route_add: string[] = [ 'jails', 'storage' ];
  protected route_add_tooltip: string = "Add Mount Point";
  protected route_delete: string[] = [ 'jails', 'storage'];
  protected route_edit: string[] = [ 'jails', 'storage'];

  protected jailId: string;
  public busy: Subscription;

  constructor(protected router: Router, protected aroute: ActivatedRoute, protected dialog: DialogService, protected loader: AppLoaderService, protected ws: WebSocketService) {
    this.aroute.params.subscribe(params => {
      this.jailId = params['jail'];
      this.queryCallOption.push(params['jail']);
      this.queryCallOption.push({"action":"LIST","source":"","destination":"","fstype":"","fsoptions":"","dump":"","pass":""});
      this.route_add.push(params['jail'], 'add');
      this.route_delete.push(params['jail'], 'delete');
      this.route_edit.push(params['jail'], 'edit');
    });
  }

  public columns: Array<any> = [
    {name : 'Source', prop : 'source'},
    {name : 'Destination', prop : 'destination'},
    {name : 'FStype', prop : 'fstype'},
  ];
  public config: any = {
    paging : true,
    sorting : {columns : this.columns},
  };

  dataHandler(entityList: any) {
    entityList.rows = [];
    if (this.queryRes[0]) {
      for(let i = 0; i < Object.keys(this.queryRes[0]).length - 1; i++) {
        let row = [];
        row['source'] = this.queryRes[0][i][0];
        row['destination'] = this.queryRes[0][i][1];
        row['fstype'] = this.queryRes[0][i][2];
        row['fsoptions'] = this.queryRes[0][i][3];
        row['dump'] = this.queryRes[0][i][4];
        row['_pass'] = this.queryRes[0][i][5];
        entityList.rows.push(row);
      }
    }
  }

  
}
