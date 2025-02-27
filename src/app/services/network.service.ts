import { Injectable } from '@angular/core';
import * as isCidr from 'is-cidr';
import { Observable } from 'rxjs';
import { Choices } from 'app/interfaces/choices.interface';
import { Option } from 'app/interfaces/option.interface';
import { WebSocketService } from './ws.service';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  ipv4Regex = /^((25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})$/;
  ipv4CidrRegex = /^((25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})(\/(3[0-2]|[1-2][0-9]|[0-9]))$/;
  ipv4CidrOptionalRegex = /^((25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})(\/(3[0-2]|[1-2][0-9]|[0-9]))?$/;

  ipv6Regex = /^([0-9a-f]|:){1,4}(:([0-9a-f]{0,4})*){1,7}(:((25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2}))?$/i;
  ipv6CidrRegex = /^([0-9a-f]|:){1,4}(:([0-9a-f]{0,4})*){1,7}(:((25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2}))?(\/(12[0-8]|1[0-1][0-9]|[1-9][0-9]|[0-9]))$/i;
  ipv6CidrOptionalRegex = /^([0-9a-f]|:){1,4}(:([0-9a-f]{0,4})*){1,7}(:((25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2}))?(\/(12[0-8]|1[0-1][0-9]|[1-9][0-9]|[0-9]))?$/i;

  ipv4OrIpv6 = new RegExp('(' + this.ipv6Regex.source + ')|(' + this.ipv4Regex.source + ')');
  ipv4OrIpv6Cidr = new RegExp('(' + this.ipv6CidrRegex.source + ')|(' + this.ipv4CidrRegex.source + ')');
  ipv4OrIpv6CidrOptional = new RegExp('(' + this.ipv6CidrOptionalRegex.source + ')|(' + this.ipv4CidrOptionalRegex.source + ')');
  ipv4OrIpv6CidrOrNone = new RegExp('(' + this.ipv4OrIpv6Cidr + ')?');

  hostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

  constructor(protected ws: WebSocketService) {}

  getVlanParentInterfaceChoices(): Observable<Choices> {
    return this.ws.call('interface.vlan_parent_interface_choices');
  }

  getLaggPortsChoices(id: string = null): Observable<Choices> {
    return this.ws.call('interface.lag_ports_choices', [id]);
  }

  getLaggProtocolChoices(): Observable<string[]> {
    return this.ws.call('interface.lag_supported_protocols');
  }

  getBridgeMembersChoices(id: string = null): Observable<Choices> {
    return this.ws.call('interface.bridge_members_choices', [id]);
  }

  getVmNicChoices(): Observable<Choices> {
    return this.ws.call('vm.device.nic_attach_choices');
  }

  getV4Netmasks(): Option[] {
    return Array(34).fill(0).map(
      (_, i) => {
        if (i === 0) {
          return { label: '---------', value: '' };
        }
        return { label: String(33 - i), value: String(33 - i) };
      },
    );
  }

  getV6PrefixLength(): Option[] {
    return Array(34).fill(0).map(
      (_, i) => {
        if (i === 0) {
          return { label: '---------', value: '' };
        }
        return { label: String((33 - i) * 4), value: String((33 - i) * 4) };
      },
    );
  }

  authNetworkValidator(str: string): boolean {
    if (isCidr.v4(str) || isCidr.v6(str)) {
      return true;
    }
    return false;
  }
}
