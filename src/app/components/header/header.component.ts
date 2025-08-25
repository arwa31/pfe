import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone:true,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Output() openHelp = new EventEmitter<void>();

  openHelpModal() {
    this.openHelp.emit();
  }
}
