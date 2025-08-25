import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MapService } from '../../services/map.service';
import { Pesticide } from '../../model/pesticide';
import { PesticideService } from '../../services/pesticide.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [CommonModule, FormsModule, HttpClientModule]
})
export class SidebarComponent {
  selectedSite = '';
  selectedPeriod = '';
  mode: string = '';
  landuseVisible = false;
  studySiteVisible = false;
  wWTPVisible = false;
  gaugeVisible = false;
  riverVisible = false;
  pesticides: Pesticide[] = [];
  activeTab: string = 'depth';
  concentrationMode: string = '';
  selectedPesticideName: string = '';
  time: string = "2018";
  riverRain: boolean = false;
  ngOnInit(): void {
    this.selectedSite = 'grabouw';


    this.pesticideService.getPesticides().subscribe((data) => {
      this.pesticides = data;
    });
  }

  

  constructor(private mapService: MapService, private pesticideService: PesticideService) { }


onPesticideChange(){
  this.mode = this.concentrationMode;
   this.mapService.emitTimeToggle({
      time: this.time,
      mode:this.concentrationMode ,
      site: this.selectedSite,
      pesticideName:this.selectedPesticideName
    })
}
onCheck(){
     this.mapService.emitRainRiverToggle({
      time: this.time,
      site: this.selectedSite,
      check:this.riverRain
    })
}

  showTab(tabName: string): void {
    this.activeTab = tabName;
  }

  toggleLayer(name: string, visible: boolean): void {

    this.mapService.emitSiteAndVisibility({
      site: this.selectedSite,
      visible: this.landuseVisible
    });

    this.mapService.emitLayerToggle({ name, visible });
    this.mapService.emitLegendToggle({ name, visible });
  }


  onSiteChange(site: string): void {
    this.selectedSite = site;
    if (this.mode != '') {
      this.onPesticideChange()
    }
    if(this.riverRain==true){
      this.onCheck()
    }
    this.mapService.emitSiteAndVisibility({
      site: this.selectedSite,
      visible: this.landuseVisible
    });
  }

  onTimeChange(time: string): void {
    if (this.mode != '') {
      this.onPesticideChange()
    }
      if(this.riverRain==true){
      this.onCheck()
    }
    this.time = time;

  }



}
