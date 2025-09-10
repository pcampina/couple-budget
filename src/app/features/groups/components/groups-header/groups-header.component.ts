import { Component, ViewEncapsulation, inject } from '@angular/core';
import { GroupService } from '@app/infrastructure/group.service';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-groups-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './groups-header.component.html',
  styleUrls: ['./groups-header.component.scss']
})
export class GroupsHeaderComponent {
  readonly groupService = inject(GroupService);

  onSelectGroup(id: string | null) {
    this.groupService.selectGroup(id);
  }

  createGroup() {
    this.groupService.createGroup();
  }

  deleteGroup() {
    this.groupService.deleteGroup();
  }

  openGroupSettings(id: string) {
    this.groupService.navigateToGroupSettings(id);
  }

  canEditSelectedGroup() {
    return this.groupService.isOwner();
  }
}
