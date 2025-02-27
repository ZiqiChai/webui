import { Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { JobState } from 'app/enums/job-state.enum';
import { PeriodicSnapshotTask, PeriodicSnapshotTaskUi } from 'app/interfaces/periodic-snapshot-task.interface';
import { EntityTableComponent } from 'app/modules/entity/entity-table/entity-table.component';
import { EntityTableConfig } from 'app/modules/entity/entity-table/entity-table.interface';
import { EntityUtils } from 'app/modules/entity/utils';
import { SnapshotTaskComponent } from 'app/pages/data-protection/snapshot/snapshot-task/snapshot-task.component';
import { DialogService, StorageService, WebSocketService } from 'app/services';
import { IxSlideInService } from 'app/services/ix-slide-in.service';
import { TaskService } from 'app/services/task.service';

@UntilDestroy()
@Component({
  selector: 'app-snapshot-task-list',
  template: '<entity-table [title]="title" [conf]="this"></entity-table>',
  providers: [TaskService, StorageService],
})
export class SnapshotListComponent implements EntityTableConfig<PeriodicSnapshotTaskUi> {
  title = this.translate.instant('Periodic Snapshot Tasks');
  queryCall = 'pool.snapshottask.query' as const;
  updateCall = 'pool.snapshottask.update' as const;
  wsDelete = 'pool.snapshottask.delete' as const;
  routeAdd: string[] = ['tasks', 'snapshot', 'add'];
  routeAddTooltip = this.translate.instant('Add Periodic Snapshot Task');
  routeEdit: string[] = ['tasks', 'snapshot', 'edit'];
  entityList: EntityTableComponent;
  asyncView = true;

  columns = [
    { name: this.translate.instant('Pool/Dataset'), prop: 'dataset', always_display: true },
    { name: this.translate.instant('Recursive'), prop: 'recursive' },
    { name: this.translate.instant('Naming Schema'), prop: 'naming_schema' },
    { name: this.translate.instant('When'), prop: 'when' },
    { name: this.translate.instant('Frequency'), prop: 'frequency', enableMatTooltip: true },
    { name: this.translate.instant('Next Run'), prop: 'next_run', hidden: true },
    { name: this.translate.instant('Keep snapshot for'), prop: 'keepfor', hidden: true },
    { name: this.translate.instant('Legacy'), prop: 'legacy', hidden: true },
    { name: this.translate.instant('VMware Sync'), prop: 'vmware_sync', hidden: true },
    { name: this.translate.instant('Enabled'), prop: 'enabled', selectable: true },
    {
      name: this.translate.instant('State'), prop: 'state', state: 'state', button: true,
    },
  ];
  rowIdentifier = 'id';
  config = {
    paging: true,
    sorting: { columns: this.columns },
    deleteMsg: {
      title: this.translate.instant('Periodic Snapshot Task'),
      key_props: ['dataset', 'naming_schema', 'keepfor'],
    },
  };

  constructor(
    private dialogService: DialogService,
    private ws: WebSocketService,
    private taskService: TaskService,
    private translate: TranslateService,
    private slideInService: IxSlideInService,
  ) {}

  afterInit(entityList: EntityTableComponent): void {
    this.entityList = entityList;
    this.slideInService.onClose$.pipe(untilDestroyed(this)).subscribe(() => {
      this.entityList.getData();
    });
  }

  resourceTransformIncomingRestData(data: PeriodicSnapshotTask[]): PeriodicSnapshotTaskUi[] {
    return data.map((task) => {
      const transformedTask = {
        ...task,
        keepfor: `${task.lifetime_value} ${task.lifetime_unit}(S)`,
        when: this.translate.instant('From {task_begin} to {task_end}', { task_begin: task.schedule.begin, task_end: task.schedule.end }),
        cron_schedule: `${task.schedule.minute} ${task.schedule.hour} ${task.schedule.dom} ${task.schedule.month} ${task.schedule.dow}`,
      } as PeriodicSnapshotTaskUi;

      return {
        ...transformedTask,
        next_run: this.taskService.getTaskNextRun(transformedTask.cron_schedule),
        frequency: this.taskService.getTaskCronDescription(transformedTask.cron_schedule),
      };
    });
  }

  onButtonClick(row: PeriodicSnapshotTaskUi): void {
    this.stateButton(row);
  }

  stateButton(row: PeriodicSnapshotTaskUi): void {
    if (row.state.state === JobState.Error) {
      this.dialogService.errorReport(row.state.state, row.state.error);
    }
  }

  onCheckboxChange(row: PeriodicSnapshotTaskUi): void {
    row.enabled = !row.enabled;
    this.ws.call(this.updateCall, [row.id, { enabled: row.enabled }]).pipe(untilDestroyed(this)).subscribe(
      (res) => {
        if (!res) {
          row.enabled = !row.enabled;
        }
      },
      (err) => {
        row.enabled = !row.enabled;
        new EntityUtils().handleWsError(this, err, this.dialogService);
      },
    );
  }

  doAdd(): void {
    this.slideInService.open(SnapshotTaskComponent, { wide: true });
  }

  doEdit(id: number): void {
    const row = this.entityList.rows.find((row) => row.id === id);
    const form = this.slideInService.open(SnapshotTaskComponent, { wide: true });
    form.setTaskForEdit(row);
  }
}
