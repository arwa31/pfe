import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { HelpModalComponent } from './components/help-modal/help-modal.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { MapComponent } from './components/map/map.component';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeaderComponent, HelpModalComponent, SidebarComponent, MapComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
 sidebarVisible = true;

  constructor() {
    this.checkWindowSize();
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  // Ce hook vérifie la taille de la fenêtre dès le chargement
  ngOnInit() {
    window.addEventListener('resize', this.checkWindowSize.bind(this));
  }

  // On masque la sidebar sur mobile au départ
  checkWindowSize() {
    if (window.innerWidth <= 900) {
      this.sidebarVisible = false;
    } else {
      this.sidebarVisible = true;
    }
  }


}
