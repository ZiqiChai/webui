import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild, ChangeDetectionStrategy,
  ViewChildren, QueryList,
  AfterViewInit,
  TemplateRef,
} from '@angular/core';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { select, Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import {
  combineLatest, Observable, of, Subject,
} from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CoreEvent } from 'app/interfaces/events';
import { GlobalActionConfig } from 'app/interfaces/global-action.interface';
import { User } from 'app/interfaces/user.interface';
import { EmptyConfig, EmptyType } from 'app/modules/entity/entity-empty/entity-empty.component';
import { EntityToolbarComponent } from 'app/modules/entity/entity-toolbar/entity-toolbar.component';
import { ControlConfig, ToolbarConfig } from 'app/modules/entity/entity-toolbar/models/control-config.interface';
import { IxDetailRowDirective } from 'app/modules/ix-tables/directives/ix-detail-row.directive';
import { userPageEntered } from 'app/pages/account/users/store/user.actions';
import { selectUsers, selectUserState, selectUsersTotal } from 'app/pages/account/users/store/user.selectors';
import { CoreService } from 'app/services/core-service/core.service';
import { LayoutService } from 'app/services/layout.service';
import { AppState } from 'app/store';
import { builtinUsersToggled } from 'app/store/preferences/preferences.actions';
import { waitForPreferences } from 'app/store/preferences/preferences.selectors';
import { IxSlideInService } from '../../../../services/ix-slide-in.service';
import { UserFormComponent } from '../user-form/user-form.component';

@UntilDestroy()
@Component({
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild('pageHeader') pageHeader: TemplateRef<unknown>;
  toolbarActionsConfig: GlobalActionConfig = null;

  displayedColumns: string[] = ['username', 'uid', 'builtin', 'full_name', 'actions'];
  settingsEvent$: Subject<CoreEvent> = new Subject();
  filterString = '';
  dataSource: MatTableDataSource<User> = new MatTableDataSource([]);
  defaultSort: Sort = { active: 'uid', direction: 'asc' };
  emptyConfig: EmptyConfig = {
    type: EmptyType.NoPageData,
    title: this.translate.instant('No Users'),
    large: true,
  };
  loadingConfig: EmptyConfig = {
    type: EmptyType.Loading,
    large: false,
    title: this.translate.instant('Loading...'),
  };
  errorConfig: EmptyConfig = {
    type: EmptyType.Errors,
    large: true,
    title: this.translate.instant('Can not retrieve response'),
  };
  filterValue = '';
  expandedRow: User;
  @ViewChildren(IxDetailRowDirective) private detailRows: QueryList<IxDetailRowDirective>;
  error$ = this.store$.select(selectUserState).pipe(map((state) => state.error));
  isLoading$ = this.store$.select(selectUserState).pipe(map((state) => state.isLoading));
  isEmpty$ = this.store$.select(selectUsersTotal).pipe(map((total) => total === 0));
  emptyOrErrorConfig$: Observable<EmptyConfig> = combineLatest([this.isEmpty$, this.error$]).pipe(
    switchMap(([_, isError]) => {
      if (isError) {
        return of(this.errorConfig);
      }

      return of(this.emptyConfig);
    }),
  );
  hideBuiltinUsers = true;

  constructor(
    private translate: TranslateService,
    private slideIn: IxSlideInService,
    private cdr: ChangeDetectorRef,
    private core: CoreService,
    private store$: Store<AppState>,
    private layoutService: LayoutService,
  ) { }

  ngOnInit(): void {
    this.store$.dispatch(userPageEntered());
    this.getPreferences();
    this.getUsers();
  }

  ngAfterViewInit(): void {
    this.layoutService.pageHeaderUpdater$.next(this.pageHeader);
    this.setupToolbar();
  }

  shouldShowResetInput(): boolean {
    return this.filterValue && !!this.filterValue.length;
  }

  input(filterInput: HTMLInputElement): void {
    this.filterValue = filterInput.value;
  }

  getPreferences(): void {
    this.store$.pipe(
      waitForPreferences,
      untilDestroyed(this),
    ).subscribe((preferences) => {
      this.hideBuiltinUsers = preferences.hideBuiltinUsers;
      this.setupToolbar();
      this.cdr.markForCheck();
    });
  }

  resetInput(input: HTMLInputElement): void {
    this.filterValue = '';
    input.value = '';
  }

  getUsers(): void {
    this.store$.pipe(
      select(selectUsers),
      untilDestroyed(this),
    ).subscribe((users) => {
      this.createDataSource(users);
      this.cdr.markForCheck();
    }, () => {
      this.createDataSource();
      this.cdr.markForCheck();
    });
  }

  createDataSource(users: User[] = []): void {
    this.dataSource = new MatTableDataSource(users);
    setTimeout(() => {
      // TODO: Figure out how to avoid setTimeout to make it work on first loading
      if (this.filterString) {
        this.dataSource.filter = this.filterString;
      }
      this.dataSource.sort = this.sort;
      this.cdr.markForCheck();
    }, 0);
  }

  toggleBuiltins(): void {
    this.store$.dispatch(builtinUsersToggled());
  }

  doAdd(): void {
    const modal = this.slideIn.open(UserFormComponent, { wide: true });
    modal.setupForm();
  }

  onToggle(row: User): void {
    this.expandedRow = this.expandedRow === row ? null : row;
    this.toggleDetailRows();
    this.cdr.markForCheck();
  }

  toggleDetailRows(): void {
    this.detailRows.forEach((row) => {
      if (row.expanded && row.ixDetailRow !== this.expandedRow) {
        row.close();
      } else if (!row.expanded && row.ixDetailRow === this.expandedRow) {
        row.open();
      }
    });
  }

  setupToolbar(): void {
    this.settingsEvent$ = new Subject();
    this.settingsEvent$.pipe(
      untilDestroyed(this),
    ).subscribe((event: CoreEvent) => {
      switch (event.data.event_control) {
        case 'filter':
          this.filterString = event.data.filter;
          this.dataSource.filter = event.data.filter;
          break;
        case 'add':
          this.doAdd();
          break;
        case 'config':
          this.toggleBuiltins();
          break;
        default:
          break;
      }
    });

    const controls: ControlConfig[] = [
      {
        name: 'filter',
        type: 'input',
        value: this.filterString,
        placeholder: this.translate.instant('Search'),
      },
      {
        name: 'config',
        type: 'slide-toggle',
        value: !this.hideBuiltinUsers,
        label: this.translate.instant('Show Built-In Users'),
      },
      {
        name: 'add',
        type: 'button',
        label: this.translate.instant('Add'),
        color: 'primary',
        ixAutoIdentifier: 'Users_ADD',
      },
    ];

    const toolbarConfig: ToolbarConfig = {
      target: this.settingsEvent$,
      controls,
    };
    this.toolbarActionsConfig = {
      actionType: EntityToolbarComponent,
      actionConfig: toolbarConfig,
    };

    this.cdr.markForCheck();
  }
}
