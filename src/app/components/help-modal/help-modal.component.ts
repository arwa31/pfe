import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-help-modal',
  standalone:true,
  templateUrl: './help-modal.component.html',
  styleUrls: ['./help-modal.component.css']
})
export class HelpModalComponent {
  @Input() isOpen = false;
  activeTab = 'quick-guide';

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  closeModal(): void {
    this.isOpen = false;
  }
}