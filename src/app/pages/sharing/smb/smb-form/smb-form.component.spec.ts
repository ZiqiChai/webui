import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonHarness } from '@angular/material/button/testing';
import { createComponentFactory, mockProvider, Spectator } from '@ngneat/spectator/jest';
import { of } from 'rxjs';
import { MockWebsocketService } from 'app/core/testing/classes/mock-websocket.service';
import { mockCall, mockWebsocket } from 'app/core/testing/utils/mock-websocket.utils';
import { ServiceName } from 'app/enums/service-name.enum';
import { helptextSharingSmb, shared } from 'app/helptext/sharing';
import { Service } from 'app/interfaces/service.interface';
import { SmbPresets, SmbPresetType, SmbShare } from 'app/interfaces/smb-share.interface';
import { IxCheckboxHarness } from 'app/modules/ix-forms/components/ix-checkbox/ix-checkbox.harness';
import { IxExplorerHarness } from 'app/modules/ix-forms/components/ix-explorer/ix-explorer.harness';
import { IxInputHarness } from 'app/modules/ix-forms/components/ix-input/ix-input.harness';
import { IxSelectHarness } from 'app/modules/ix-forms/components/ix-select/ix-select.harness';
import { IxFormsModule } from 'app/modules/ix-forms/ix-forms.module';
import { IxFormHarness } from 'app/modules/ix-forms/testing/ix-form.harness';
import { AppLoaderService, DialogService, WebSocketService } from 'app/services';
import { FilesystemService } from 'app/services/filesystem.service';
import { IxSlideInService } from 'app/services/ix-slide-in.service';
import { SmbFormComponent } from './smb-form.component';

describe('SmbFormComponent', () => {
  const existingShare: SmbShare = {
    id: 1,
    purpose: SmbPresetType.MultiUserTimeMachine,
    path: '/mnt/pool123/ds222',
    path_suffix: '%U',
    home: false,
    name: 'ds222',
    comment: '',
    ro: false,
    browsable: true,
    recyclebin: true,
    guestok: true,
    hostsallow: ['host1'],
    hostsdeny: ['host2'],
    auxsmbconf: '',
    aapl_name_mangling: false,
    abe: true,
    acl: true,
    durablehandle: true,
    streams: true,
    timemachine: true,
    vuid: 'a7bcb6cb-b2f3-4144-a5bb-e79dc7e282c4',
    shadowcopy: true,
    fsrvp: false,
    enabled: true,
    cluster_volname: '',
    locked: false,
  };

  const formLabels: { [key: string]: string } = {
    path: 'Path',
    name: 'Name',
    purpose: 'Purpose',
    comment: 'Description',
    enabled: 'Enabled',
    acl: 'Enable ACL',
    ro: 'Export Read Only',
    browsable: 'Browsable to Network Clients',
    guestok: 'Allow Guest Access',
    abe: 'Access Based Share Enumeration',
    hostsallow: 'Hosts Allow',
    hostsdeny: 'Hosts Deny',
    home: 'Use as Home Share',
    timemachine: 'Time Machine',
    afp: 'Legacy AFP Compatibility',
    shadowcopy: 'Enable Shadow Copies',
    recyclebin: 'Export Recycle Bin',
    aapl_name_mangling: 'Use Apple-style Character Encoding',
    streams: 'Enable Alternate Data Streams',
    durablehandle: 'Enable SMB2/3 Durable Handles',
    fsrvp: 'Enable FSRVP',
    path_suffix: 'Path Suffix',
    auxsmbconf: 'Auxiliary Parameters',
  };

  const presets: SmbPresets = {
    NO_PRESET: {
      verbose_name: 'No presets',
      params: {
        auxsmbconf: '',
      },
    },
    DEFAULT_SHARE: {
      verbose_name: 'Default share parameters',
      params: {
        path_suffix: '',
        home: false,
        ro: false,
        browsable: true,
        timemachine: false,
        recyclebin: false,
        abe: false,
        hostsallow: [],
        hostsdeny: [],
        aapl_name_mangling: false,
        acl: true,
        durablehandle: true,
        shadowcopy: true,
        streams: true,
        fsrvp: false,
        auxsmbconf: '',
      },
    },
    ENHANCED_TIMEMACHINE: {
      verbose_name: 'Multi-user time machine',
      params: {
        path_suffix: '%U',
        timemachine: true,
        auxsmbconf: 'zfs_core:zfs_auto_create=true\nzfs_core:base_user_quota=1T',
      },
    },
    MULTI_PROTOCOL_NFS: {
      verbose_name: 'Multi-protocol (NFSv3/SMB) shares',
      params: {
        acl: false,
        streams: false,
        durablehandle: false,
        auxsmbconf: 'oplocks = no\nlevel2 oplocks = no\nstrict locking = yes',
      },
    },
    PRIVATE_DATASETS: {
      verbose_name: 'Private SMB Datasets and Shares',
      params: {
        path_suffix: '%U',
        auxsmbconf: 'zfs_core:zfs_auto_create=true',
      },
    },
    WORM_DROPBOX: {
      verbose_name: 'SMB WORM. Files become readonly via SMB after 5 minutes',
      params: {
        path_suffix: '',
        auxsmbconf: 'worm:grace_period = 300',
      },
    },
  };

  let spectator: Spectator<SmbFormComponent>;
  let loader: HarnessLoader;
  let form: IxFormHarness;
  let websocket: WebSocketService;

  const createComponent = createComponentFactory({
    component: SmbFormComponent,
    imports: [
      ReactiveFormsModule,
      IxFormsModule,
    ],
    providers: [
      mockWebsocket([
        mockCall('sharing.smb.create'),
        mockCall('sharing.smb.update'),
        mockCall('sharing.smb.query', [
          { ...existingShare },
        ]),
        mockCall('service.query', [{
          service: ServiceName.Cifs,
          id: 4,
          enable: false,
        } as Service]),
        mockCall('service.update'),
        mockCall('service.start'),
        mockCall('service.restart'),
        mockCall('sharing.smb.presets', { ...presets }),
        mockCall('filesystem.acl_is_trivial', false),
        mockCall('pool.dataset.path_in_locked_datasets', false),
      ]),
      mockProvider(IxSlideInService),
      mockProvider(AppLoaderService),
      mockProvider(FilesystemService),
      mockProvider(DialogService, {
        confirm: jest.fn(() => of(true)),
        info: jest.fn(() => of(true)),
      }),
    ],
  });

  beforeEach(async () => {
    spectator = createComponent();
    loader = TestbedHarnessEnvironment.loader(spectator.fixture);
    form = await loader.getHarness(IxFormHarness);
    websocket = spectator.inject(WebSocketService);
  });

  it('shows all the fields when Advanced Options button is pressed', async () => {
    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();

    const fields = Object.keys(await form.getControlHarnessesDict());
    for (const param in formLabels) {
      expect(fields).toContain(formLabels[param]);
    }
  });

  it('sets the correct options array for purpose field', async () => {
    const purposeSelect = await loader.getHarness(IxSelectHarness.with({ label: 'Purpose' }));
    const optionLabels = await purposeSelect.getOptionLabels();
    expect(optionLabels).toEqual([
      '--',
      'No presets',
      'Default share parameters',
      'Multi-user time machine',
      'Multi-protocol (NFSv3/SMB) shares',
      'Private SMB Datasets and Shares',
      'SMB WORM. Files become readonly via SMB after 5 minutes',
    ]);
  });

  it('should have error for duplicate share name', async () => {
    const nameControl = await loader.getHarness(IxInputHarness.with({ label: 'Name' }));
    await nameControl.setValue('ds222');
    expect(await nameControl.getErrorText()).toEqual('The name "ds222" is already in use.');
  });

  it('when a preset is selected, the relevent fields should be impacted', async () => {
    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();

    const purposeSelect = await loader.getHarness(IxSelectHarness.with({ label: formLabels.purpose }));

    const labels = await purposeSelect.getOptionLabels(); /** 1 so to Skip '--' */
    labels.splice(0, 1);
    const presetKeys = Object.keys(presets);
    const form = await loader.getHarness(IxFormHarness);
    const fields = await form.getControlHarnessesDict();

    for (let i = 0; i < labels.length; i++) {
      await purposeSelect.setValue(labels[i]);
      for (const param in presets[presetKeys[i]].params) {
        if (param === 'auxsmbconf') {
          continue;
        }
        const expectedValue = presets[presetKeys[i]].params[param as keyof SmbShare];
        const value = await fields[formLabels[param]].getValue();
        expect(value).toStrictEqual(expectedValue);
        expect(await fields[formLabels[param]].isDisabled()).toBeTruthy();
      }
    }
    expect(true).toBeTruthy();
  });

  it('should show confirmation warning when afp is checked', async () => {
    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();
    const afpCheckbox = await loader.getHarness(IxCheckboxHarness.with({ label: formLabels.afp }));
    await afpCheckbox.setValue(true);
    expect(spectator.inject(DialogService).confirm).toHaveBeenNthCalledWith(1, {
      title: helptextSharingSmb.afpDialog_title,
      message: helptextSharingSmb.afpDialog_message,
      hideCheckBox: false,
      buttonMsg: helptextSharingSmb.afpDialog_button,
      hideCancel: false,
    });
  });

  it('shows values of existing share when editing', async () => {
    spectator.component.setSmbShareForEdit(existingShare);

    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();

    const values = await form.getValues();

    const existingShareWithLabels: { [key: string]: any } = {};
    for (const key in existingShare) {
      if (!formLabels[key]) {
        continue;
      }
      existingShareWithLabels[formLabels[key]] = existingShare[key as keyof SmbShare];
    }

    existingShareWithLabels[formLabels.purpose] = presets[existingShareWithLabels[formLabels.purpose]].verbose_name;
    expect(values).toMatchObject(existingShareWithLabels);
  });

  it('should show warning if aaple_name_mangling value changes when editing', async () => {
    spectator.component.setSmbShareForEdit(existingShare);

    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();

    const aaplNameManglingCheckbox = await loader.getHarness(
      IxCheckboxHarness.with({ label: formLabels.aapl_name_mangling }),
    );

    if (existingShare.aapl_name_mangling) {
      await (await aaplNameManglingCheckbox.getMatCheckboxHarness()).uncheck();
    } else {
      await (await aaplNameManglingCheckbox.getMatCheckboxHarness()).check();
    }
    expect(spectator.inject(DialogService).confirm).toHaveBeenNthCalledWith(2, {
      title: helptextSharingSmb.manglingDialog.title,
      message: helptextSharingSmb.manglingDialog.message,
      hideCheckBox: true,
      buttonMsg: helptextSharingSmb.manglingDialog.action,
      hideCancel: true,
    });
  });

  it('should autofill name from path if name is empty', async () => {
    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();

    const nameControl = await loader.getHarness(IxInputHarness.with({ label: formLabels.name }));
    await nameControl.setValue('');
    const pathControl = await loader.getHarness(IxExplorerHarness.with({ label: formLabels.path }));
    await pathControl.setValue('/mnt/pool2/ds22');

    expect(await nameControl.getValue()).toEqual('ds22');
  });

  it('should show strip acl warning if acl is trivial when path changes', async () => {
    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();

    const pathControl = await loader.getHarness(IxExplorerHarness.with({ label: formLabels.path }));
    await pathControl.setValue('/mnt/pool2/ds22');

    const purposeSelect = await loader.getHarness(IxSelectHarness.with({ label: 'Purpose' }));
    await purposeSelect.setValue(presets.NO_PRESET.verbose_name);
    const aclCheckbox = await loader.getHarness(IxCheckboxHarness.with({ label: formLabels.acl }));
    await (await aclCheckbox.getMatCheckboxHarness()).uncheck();

    expect(spectator.inject(DialogService).confirm).toHaveBeenNthCalledWith(3, {
      title: helptextSharingSmb.stripACLDialog.title,
      message: helptextSharingSmb.stripACLDialog.message,
      hideCheckBox: true,
      buttonMsg: helptextSharingSmb.stripACLDialog.button,
      hideCancel: true,
    });
  });

  it('should show acl warning if acl is unchcekd and dataset is non-trivial', async () => {
    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();

    const purposeSelect = await loader.getHarness(IxSelectHarness.with({ label: 'Purpose' }));
    await purposeSelect.setValue(presets.PRIVATE_DATASETS.verbose_name);

    const pathControl = await loader.getHarness(IxExplorerHarness.with({ label: formLabels.path }));
    await pathControl.setValue('/mnt/pool2/ds22');

    const aclCheckbox = await loader.getHarness(IxCheckboxHarness.with({ label: formLabels.acl }));
    await (await aclCheckbox.getMatCheckboxHarness()).uncheck();

    expect(spectator.inject(DialogService).confirm).toHaveBeenNthCalledWith(4, {
      title: helptextSharingSmb.stripACLDialog.title,
      message: helptextSharingSmb.stripACLDialog.message,
      hideCheckBox: true,
      buttonMsg: helptextSharingSmb.stripACLDialog.button,
      hideCancel: true,
    });
  });

  it('should submit the form with the correct value', async () => {
    const advancedButton = await loader.getHarness(MatButtonHarness.with({ text: 'Advanced Options' }));
    await advancedButton.click();

    const attrs: { [key: string]: unknown } = {};
    for (const key in existingShare) {
      if (formLabels[key]) {
        attrs[formLabels[key]] = existingShare[key as keyof SmbShare];
      }
    }

    attrs[formLabels.purpose] = presets[attrs[formLabels.purpose] as string].verbose_name;
    attrs[formLabels.name] = 'ds223';
    attrs[formLabels.hostsallow] = ['host11'];
    attrs[formLabels.hostsdeny] = ['host22'];
    await form.fillForm({
      ...attrs,
    });

    const saveButton = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
    await saveButton.click();

    expect(websocket.call).toHaveBeenCalledWith('sharing.smb.create', [{
      path: '/mnt/pool123/ds222',
      name: 'ds223',
      purpose: 'ENHANCED_TIMEMACHINE',
      comment: '',
      enabled: true,
      acl: true,
      ro: false,
      browsable: true,
      guestok: true,
      abe: true,
      hostsallow: ['host11'],
      hostsdeny: ['host22'],
      home: false,
      afp: false,
      shadowcopy: true,
      recyclebin: true,
      aapl_name_mangling: false,
      streams: true,
      durablehandle: true,
      fsrvp: false,
      auxsmbconf: '',
    }]);

    expect(spectator.inject(DialogService).confirm).toHaveBeenNthCalledWith(5, {
      title: helptextSharingSmb.restart_smb_dialog.title,
      message: helptextSharingSmb.restart_smb_dialog.message_time_machine,
      hideCheckBox: true,
      buttonMsg: helptextSharingSmb.restart_smb_dialog.title,
      cancelMsg: helptextSharingSmb.restart_smb_dialog.cancel_btn,
    });

    expect(websocket.call).toHaveBeenCalledWith('service.restart', [ServiceName.Cifs]);

    expect(spectator.inject(DialogService).info).toHaveBeenCalledWith(
      helptextSharingSmb.restarted_smb_dialog.title,
      helptextSharingSmb.restarted_smb_dialog.message,
      '250px',
    );

    const pathValue = await (await loader.getHarness(
      IxExplorerHarness.with({ label: formLabels.path }),
    )).getValue();
    expect(
      websocket.call,
    ).toHaveBeenCalledWith(
      'pool.dataset.path_in_locked_datasets',
      [pathValue],
    );

    expect(websocket.call).toHaveBeenCalledWith('service.query', []);

    expect(spectator.inject(DialogService).confirm).toHaveBeenNthCalledWith(6, {
      title: shared.dialog_title,
      message: shared.dialog_message,
      hideCheckBox: true,
      buttonMsg: shared.dialog_button,
    });

    expect(spectator.inject(MockWebsocketService).call).toHaveBeenCalledWith('service.update', [4, { enable: true }]);
    expect(spectator.inject(MockWebsocketService).call).toHaveBeenCalledWith('service.start', [ServiceName.Cifs]);
    expect(spectator.inject(DialogService).info).toHaveBeenNthCalledWith(
      2,
      'SMB Service',
      'The SMB service has been enabled.',
      '250px',
      'info',
    );
  });
});
