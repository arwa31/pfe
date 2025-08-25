import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import LayerGroup from 'ol/layer/Group';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj';
import { defaults as defaultControls, ZoomToExtent } from 'ol/control';
import { Style, Icon, Stroke, Fill } from 'ol/style';
import { MapService } from '../../services/map.service';
import { CommonModule } from '@angular/common';
import Overlay from 'ol/Overlay';
import { Extent } from 'ol/extent';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import VectorSource from 'ol/source/Vector';
import { PesticideService } from '../../services/pesticide.service';
import { StudySiteService } from '../../services/study-site.service';
import { SampleService } from '../../services/sample.service';
import { PesticideConcentrationService } from '../../services/pesticide-concentration.service';
import { PesticideConcentration } from '../../model/pesticideConcentration';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { HttpClient } from '@angular/common/http';
import { isEmpty } from 'ol/extent';
import { RiverflowService } from '../../services/riverflow.service';
import { RainfallService } from '../../services/rainfall.service';
import { Rainfall } from '../../model/rainfall';
import { forkJoin } from 'rxjs';
import { RiverFlow } from '../../model/riverflow';


Chart.register(...registerables);

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  imports: [CommonModule]
})
export class MapComponent implements OnInit {
  @ViewChild('lineChart', { static: false }) lineChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barChart', { static: false }) barchartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('popup', { static: true }) popupElement!: ElementRef;
  @ViewChild('landUseChart') landUseChartRef!: ElementRef<HTMLCanvasElement>;

  selectedSite: string = '';

  private styleCache: { [key: string]: Style } = {};
  showWWTP = false;
  selectedBaseLayer = 'osm';
  showStudy = false;
  showGauge = false;
  showLand = false;

  showRiver = false;
  totalPD = 0;
  totalSamples = 0;
  totalSite = 0;
  loadingLandUse = false;
  map!: Map;
  baseLayerGroup!: LayerGroup;
  vectorLayerGroup!: LayerGroup;
  wwtpLayer!: VectorLayer;
  wwtpIconSrc = 'assets/images/wwtp1.png';
  popup!: Overlay;
  lineChart!: Chart;
  barChart!: Chart;
  showLineChart = false;
  showBarChart = false;
  selectedSiteForChart = '';
  pieChart!: Chart;
colors: { [key: string]: string } = {
  cereals: '#F4D03F',                  // Jaune -> céréales, champs de blé/orge
  grapes: '#8E44AD',                   // Violet -> raisins
  'pome fruit': '#C0392B',             // Rouge -> pommes, poires
  'stone fruit': '#E67E22',            // Vert -> pêches, abricots (feuillage/arbres)
  'citrus fruits': '#F39C12',          // Orange -> oranges, mandarines
  'other fruit': '#3498DB',            // Bleu -> fruits divers
  'other agricultural land use': '#16A085', // Brun -> sols cultivés / autres terres agricoles
  other: '#95A5A6'                     // Gris neutre -> reste
};





  isSmallScreen = false;
  initialZoom = 8.5;
  initialCenter = fromLonLat([20.0, -33.6]);

  constructor(
    private mapService: MapService,
    private pesticideService: PesticideService,
    private http: HttpClient,
    private studysiteService: StudySiteService,
    private sampleService: SampleService,
    private riverflowService: RiverflowService,
    private rainfallService: RainfallService,
    private pesticideConcentrationService: PesticideConcentrationService

  ) {
    this.checkWindowSize();
  }
  // === Responsive check ===
  checkWindowSize() {
    this.isSmallScreen = window.innerWidth < 1000;
  }

  // === Switch base map (OSM, Google, or none) ===
  switchBaseLayer(layerId: string): void {
    this.selectedBaseLayer = layerId;
    this.baseLayerGroup.getLayers().forEach(layer => {
      layer.setVisible(layer.get('title') === layerId);
    });
    this.updateWwtpIcon(layerId);
  }
  // === Create a style for land use features ===
  getLandUseStyle(feature: any): Style {
    const cat = (feature.get('CR_CATEG') || '').trim().toLowerCase();
    if (!this.styleCache[cat]) {
      this.styleCache[cat] = new Style({
        fill: new Fill({ color: this.colors[cat] || '#ccc' }),
        stroke: new Stroke({ color: '#333', width: 0.5 })
      });
    }
    return this.styleCache[cat];
  }
  // === Update land use pie chart ===
  updatePieChart(data: { [key: string]: number }) {
    const labels = Object.keys(data);
    const values = Object.values(data);
    if (this.pieChart) {
      this.pieChart.destroy();
    }
    this.pieChart = new Chart(this.landUseChartRef.nativeElement, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map(label => {
            const key = label.trim().toLowerCase();
            return this.colors[key] || this.colors['other'];
          })
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 0.6,
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const dataArr = context.dataset.data as number[];
                const total = dataArr.reduce((sum, val) => sum + val, 0);
                const value = context.raw as number;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${percentage}% (${value})`;
              }
            }
          },
          legend: { display: false },
          title: { display: false }
        }
      }
    });
  }

  // === Get land use layer ID by site ===
  getLandUseLayerId(site: string): string {
    switch (site.toLowerCase()) {
      case 'grabouw': return 'landUseG';
      case 'piketberg': return 'landUseP';
      case 'hex river valley': return 'landUseH';
      default: return '';
    }
  }


  // === Toggle land use layers visibility and update chart ===
  toggleLandUseLayers(site: string, visible: boolean): void {

    const layers = this.vectorLayerGroup.getLayers().getArray() as VectorLayer<VectorSource>[];
    const landUseIds = ['landUseG', 'landUseP', 'landUseH'];
    this.loadingLandUse = visible;

    if (!visible) {
      landUseIds.forEach(id => layers.find(l => l.get('id') === id)?.setVisible(false));
      this.clean()
      return;
    }

    if (site.toLowerCase() === 'combined') {
      this.selectedSite = site;
      this.showLand = false;
      this.zoomToLayer(landUseIds);
      this.loadingLandUse = false;
      return;
    }


    this.selectedSite = site.toUpperCase();
    landUseIds.forEach(id => layers.find(l => l.get('id') === id)?.setVisible(false));

    const layerId = this.getLandUseLayerId(site);
    const targetLayer = layers.find(l => l.get('id') === layerId);
    if (!targetLayer) {
      this.pieChart?.destroy();
      this.loadingLandUse = false;
      return;
    }

    targetLayer.setVisible(true);
    this.zoomToLayer(layerId);

    const source = (targetLayer as VectorLayer<VectorSource>).getSource();
    if (!source) return;

    const handleChart = () => {
      this.loadingLandUse = false;
      const counts = this.countFeaturesByType(source);
      this.updatePieChart(counts);
    };

    if (source.getFeatures().length > 0) {
      setTimeout(handleChart, 0);
    } else {
      source.once('featuresloadend', handleChart);
    }

  }
  // === Get catchment layer ID by site ===
  getCatchLayerId(site: string): string {
    switch (site.toLowerCase()) {
      case 'grabouw': return 'catchG';
      case 'piketberg': return 'catchP';
      case 'hex river valley': return 'catchH';
      default: return '';
    }
  }

  // === Update WWTP icon depending on base layer ===

  updateWwtpIcon(baseLayerName: string): void {
    this.wwtpIconSrc = baseLayerName === 'google'
      ? 'assets/images/wwtp.png'
      : 'assets/images/wwtp1.png';
    this.wwtpLayer.setStyle(new Style({
      image: new Icon({
        src: this.wwtpIconSrc,
        scale: 0.05,
        anchor: [0.5, 1]
      })
    }));
  }
  // === Count features by type for land use charts ===
  countFeaturesByType(source: VectorSource): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    source.getFeatures().forEach(feature => {
      const type = feature.get('CR_CATEG');
      if (type) counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }
  // === Zoom map to one or multiple layers ===
  private zoomToLayer(layerIds: string | string[]): void {
    const layers = this.vectorLayerGroup.getLayers().getArray() as VectorLayer<VectorSource>[];
    let ids = Array.isArray(layerIds) ? layerIds : [layerIds];

    let combinedExtent: number[] | null = null;
    let loadedCount = 0;

    ids.forEach(id => {
      const targetLayer = layers.find(l => l.get('id') === id);
      if (!targetLayer) return;
      targetLayer.setVisible(true);

      const source = (targetLayer as VectorLayer<VectorSource>).getSource();
      if (!source) return;

      const updateExtent = () => {
        const extent = source.getExtent();
        combinedExtent = combinedExtent
          ? [
            Math.min(combinedExtent[0], extent[0]),
            Math.min(combinedExtent[1], extent[1]),
            Math.max(combinedExtent[2], extent[2]),
            Math.max(combinedExtent[3], extent[3]),
          ]
          : extent;
      };

      if (source.getFeatures().length > 0) {
        updateExtent();
        loadedCount++;
        if (loadedCount === ids.length && combinedExtent) {
          this.map.getView().fit(combinedExtent, { padding: [60, 60, 60, 60], duration: 1000 });
        }
      } else {
        source.once('featuresloadend', () => {
          updateExtent();
          loadedCount++;
          if (loadedCount === ids.length && combinedExtent) {
            this.map.getView().fit(combinedExtent, { padding: [60, 60, 60, 60], duration: 1000 });
          }
        });
      }
    });
  }
  // === Create chart for pesticide classes ===
  createClassConcentrationChart(data: any[], siteName: string, time: string) {

    const layers = this.vectorLayerGroup.getLayers().getArray() as VectorLayer<VectorSource>[];
    const catchUseIds = ['catchG', 'catchP', 'catchH'];

    if (siteName.toLowerCase() === 'combined') {
      this.zoomToLayer(catchUseIds);
    } else {
      catchUseIds.forEach(id => {
        const layer = layers.find(l => l.get('id') === id);
        if (layer) layer.setVisible(false);
      });

      const layerId = this.getCatchLayerId(siteName);
      this.zoomToLayer(layerId);
    }


    const { filtered, dates } = this.filterData(data, siteName, time);
    if (!filtered.length) return;


    const datasets = this.createDatasets(filtered, dates, 'class');
    this.selectedSiteForChart = siteName;
    setTimeout(() => this.renderChart(dates, datasets, siteName, 'class'), 0);
 this.clean()
  }

  private filterData(data: any[], siteName: string, time: string) {
    let filtered = siteName.toLowerCase() !== 'combined'
      ? data.filter(d => d.site_name.toLowerCase() === siteName.toLowerCase())
      : [...data];

    if (!filtered.length) return { filtered, dates: [] };

    const dates = time.toLowerCase() !== 'combined'
      ? [...new Set(filtered
        .filter(d => {
          const year = new Date(d.date_deployment).getFullYear();
          if (time === "2023") return year === 2022 || year === 2023;
          if (time === "2019") return year === 2019;
          if (time === "2018") return year === 2017 || year === 2018;
          return false;
        })
        .map(d => d.date_deployment)
      )].sort()
      : [...new Set(filtered.map(d => d.date_deployment))].sort();

    return { filtered, dates };
  }

  private createDatasets(filteredData: any[], dates: string[], type: 'class' | 'pesticide', pesticideName?: string) {
    if (type === 'class') {
      const classes = [...new Set(filteredData.map(d => d.pesticide_class))];
      return classes.map(cls => ({
        label: cls,
        data: dates.map(date => {
          return filteredData
            .filter(d => d.date_deployment === date && d.pesticide_class === cls)
            .reduce((sum, item) => sum + item.totalConcentrationNgL, 0);
        }),
        backgroundColor: this.getColorForClass(cls)
      }));
    } else if (type === 'pesticide' && pesticideName) {
      const pesticideDataset = {
        label: pesticideName,
        data: dates.map(date => {
          return filteredData
            .filter(d => d.date_deployment === date)
            .reduce((sum, d) => sum + d.totalConcentrationNgL, 0);
        }),
        borderColor: '#6fbdfdff',
        backgroundColor: '#6fbdfdff',
        borderWidth: 2,
        fill: false,
        tension: 0.1
      };
      const eqsLevel = filteredData.length > 0 ? filteredData[0].eqs_level : 0;
      const eqsDataset = {
        label: 'EQS Level',
        data: dates.map(() => eqsLevel),
        borderColor: '#E53935',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        tension: 0
      };
      return [pesticideDataset, eqsDataset];
    }
    return [];
  }
  private renderChart(dates: string[], datasets: any[], siteName: string, type: 'class' | 'pesticide', pesticideName?: string) {
    if (!this.lineChartRef?.nativeElement) return;

    if (this.lineChart) this.lineChart.destroy();

    const chartType = type === 'class' ? 'bar' : 'line';
    const title = type === 'class'
      ? `Concentration of pesticides by class - ${siteName.toUpperCase()}`
      : `Pesticide concentration of ${pesticideName?.toUpperCase()} at ${siteName.toUpperCase()}`;

    this.lineChart = new Chart(this.lineChartRef.nativeElement, {
      type: chartType,
      data: { labels: dates, datasets },
      options: {
        responsive: true,
        scales: {
          x: { stacked: type === 'class', title: { display: true, text: 'Period' } },
          y: { stacked: type === 'class', beginAtZero: true, title: { display: true, text: 'Concentration (ng/L)' } }
        },
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.parsed.y} ng/L`;
              }
            }
          },
          title: { display: true, text: title }
        }
      }
    });
  }

  getColorForClass(cls: string): string {
    switch (cls) {
      case 'Herbicides': return '#F39C12';
      case 'Insecticide': return '#3498DB';
      case 'Fungicides': return' #27AE60';
      default: return 'rgba(201, 203, 207, 0.6)';
    }
  }

  ngOnInit(): void {
    this.pesticideService.getUniquePesticidesDetected().subscribe(d => this.totalPD = d);
    this.sampleService.getTotalsamples().subscribe(d => this.totalSamples = d);
    this.studysiteService.getTotalsamples().subscribe(d => this.totalSite = d);

    this.checkWindowSize();
    window.addEventListener('resize', this.checkWindowSize.bind(this));
    this.initializeBaseLayers();
    this.initializeVectorLayers();
    this.initializeMap();
    this.initializePopup();

    this.mapService.siteAndVisibility$.subscribe(({ site, visible }) => {
      this.showLand=visible
      this.toggleLandUseLayers(site, visible);
    });
    this.mapService.layerToggle$.subscribe(({ name, visible }) => {
      this.toggleVectorLayer(name, visible);
    });
    this.mapService.riverandRainSubject$.subscribe(({ site, time, check }) => {
      if (check == true) {
        this.showBarChart = true;
        forkJoin({
          rainfallList: this.rainfallService.getRainfall(),
          riverflowList: this.riverflowService.getRiverFlow()
        }).subscribe(({ rainfallList, riverflowList }) => {
          this.createRainfallChart(rainfallList, riverflowList, site, time);
        });
      } else {
        this.showBarChart = false;
        this.barChart?.destroy();
        this.clean()
      }

    });

    this.mapService.time$.subscribe(({ site, mode, time, pesticideName }) => {
      if (mode === "class") {
        this.showLineChart=true
        this.clean()
        this.pesticideConcentrationService.findTotalConcentrations()
          .subscribe(data => {
            this.createClassConcentrationChart(data, site, time);
          });

      } else if (mode === "pesticide") {
        this.showLineChart=true
         this.clean()
        this.pesticideConcentrationService.findPesticideConcentrations(pesticideName)
          .subscribe(data => {
            this.createPestConcentrationChart(data, site, time, pesticideName);
          });

      } else if (mode === "none") {

        this.lineChart?.destroy();
      
        this.showLineChart = false;
         this.clean()
      }
    });

  }
  private filterRainfallData(list: Rainfall[], siteName: string, time: string) {
    let filteredRainfall = siteName.toLowerCase() !== 'combined'
      ? list.filter(d => d.studySite.site_name.toLowerCase() === siteName.toLowerCase())
      : [...list];

    if (!filteredRainfall.length) return { filteredRainfall, dates: [] };

    const dates = time.toLowerCase() !== 'combined'
      ? [...new Set(filteredRainfall
        .filter(d => {
          const year = new Date(d.measurementDate).getFullYear();
          if (time === "2023") return year === 2022 || year === 2023;
          if (time === "2019") return year === 2019;
          if (time === "2018") return year === 2017 || year === 2018;
          return false;
        })
        .map(d => d.measurementDate)
      )].sort()
      : [...new Set(filteredRainfall.map(d => d.measurementDate))].sort();

    return { filteredRainfall, dates };
  }

  private filterRiverflowData(list: RiverFlow[], siteName: string, time: string) {
    let filteredRiverflow = siteName.toLowerCase() !== 'combined'
      ? list.filter(d => d.studySite.site_name.toLowerCase() === siteName.toLowerCase())
      : [...list];

    if (!filteredRiverflow.length) return { filteredRiverflow, dates: [] };

    const dates = time.toLowerCase() !== 'combined'
      ? [...new Set(filteredRiverflow
        .filter(d => {
          const year = new Date(d.measurementDate).getFullYear();
          if (time === "2023") return year === 2022 || year === 2023;
          if (time === "2019") return year === 2019;
          if (time === "2018") return year === 2017 || year === 2018;
          return false;
        })
        .map(d => d.measurementDate)
      )].sort()
      : [...new Set(filteredRiverflow.map(d => d.measurementDate))].sort();

    return { filteredRiverflow, dates };
  }

  createRainfallChart(rainfallList: Rainfall[], riverflowList: RiverFlow[], siteName: string, time: string
  ) {

    const layers = this.vectorLayerGroup.getLayers().getArray() as VectorLayer<VectorSource>[];
    const catchUseIds = ['catchG', 'catchP', 'catchH'];

    if (siteName.toLowerCase() === 'combined') {
      this.zoomToLayer(catchUseIds);
    } else {
      catchUseIds.forEach(id => {
        const layer = layers.find(l => l.get('id') === id);
        if (layer) layer.setVisible(false);
      });
      const layerId = this.getCatchLayerId(siteName);
      this.zoomToLayer(layerId);
    }

    const { filteredRainfall, dates: rainfallDates } = this.filterRainfallData(rainfallList, siteName, time);
    if (!filteredRainfall.length) return;

    const { filteredRiverflow, dates: riverflowDates } = this.filterRiverflowData(riverflowList, siteName, time);
    if (!filteredRiverflow.length) return;

    if (!this.barchartRef?.nativeElement) return;

    if (this.barChart) this.barChart.destroy();

    this.barChart = new Chart(this.barchartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: rainfallDates,
        datasets: [
          {
            label: 'Rainfall (mm/day)',
            data: filteredRainfall.map((r: Rainfall) => r.rainfallMm),
            backgroundColor: '#42A5F5',
            yAxisID: 'y',
          },
          {
            label: 'River Flow (m³/s)',
            data: filteredRiverflow.map((r: RiverFlow) => r.flowValue),
            type: 'line',
            borderColor: '#E53935',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Rainfall & River Flow at ${siteName.toUpperCase()}`,
          },
        },
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { position: 'left', title: { display: true, text: 'Rainfall (mm/day)' } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'River Flow (m³/s)' } },
        },
      },
    });
 this.clean()
  }


  // === Create chart for individual pesticide ===
  createPestConcentrationChart(
    data: any[],
    siteName: string,
    time: string,
    pesticideName: string
  ) {

    const layers = this.vectorLayerGroup.getLayers().getArray() as VectorLayer<VectorSource>[];
    const catchUseIds = ['catchG', 'catchP', 'catchH'];


    if (siteName.toLowerCase() === 'combined') {
      this.zoomToLayer(catchUseIds);
    } else {

      catchUseIds.forEach(id => {
        const layer = layers.find(l => l.get('id') === id);
        if (layer) layer.setVisible(false);
      });

      const layerId = this.getCatchLayerId(siteName);
      this.zoomToLayer(layerId);
    }


    const { filtered, dates } = this.filterData(data, siteName, time);
    if (!filtered.length) return;

    const datasets = this.createDatasets(filtered, dates, 'pesticide', pesticideName);
    this.selectedSiteForChart = siteName;
   
    
    setTimeout(() =>
      this.renderChart(dates, datasets, siteName, 'pesticide', pesticideName),
      0
    );
  this.clean()
  }
clean() {
  if (this.showLand || this.showLineChart || this.showBarChart) {
    return; // nothing to clean
  }
if(this.showLineChart ==false && this.showBarChart==false){
        const layers = this.vectorLayerGroup.getLayers().getArray() as VectorLayer<VectorSource>[];
        const catchUseIds = ['catchG', 'catchP', 'catchH'];
        catchUseIds.forEach(id => {
          const layer = layers.find(l => l.get('id') === id);
          if (layer) layer.setVisible(false);
        });
}


 if (this.showLand ==false && this.showLineChart ==false && this.showBarChart==false) {
   this.map.getView().animate({
    center: this.initialCenter,
    zoom: this.initialZoom,
    duration: 500
  });
  }
  
}

  // === Toggle other vector layers (study site, gauge, WWTP, river) ===
  toggleVectorLayer(layerId: string, visible: boolean): void {
    const layers = this.vectorLayerGroup.getLayers().getArray();

    layers.forEach(layer => {
      if (layer.get('id') === layerId) {
        layer.setVisible(visible);
        switch (layerId) {
          case 'studySite':
            this.showStudy = visible;
            break;
          case 'gauge':
            this.showGauge = visible;
            break;
          case 'wwtp':
            this.showWWTP = visible;
            break;
          case 'river':
            this.showRiver = visible;
            break;
        }
      }
    });
  }

  private initializePopup(): void {
    this.popup = new Overlay({
      element: this.popupElement.nativeElement,
      autoPan: true,
    });
    this.map.addOverlay(this.popup);
  }

  private initializeBaseLayers(): void {
    const osmLayer = new TileLayer({ source: new OSM({ attributions: [] }), visible: true });
    osmLayer.set('title', 'osm');

    const googleSatelliteLayer = new TileLayer({
      source: new XYZ({ url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' }),
      visible: false
    });
    googleSatelliteLayer.set('title', 'google');

    const noBackgroundLayer = new TileLayer({ visible: false });
    noBackgroundLayer.set('title', 'none');

    this.baseLayerGroup = new LayerGroup({
      layers: [osmLayer, googleSatelliteLayer, noBackgroundLayer]
    });
  }

  private initializeVectorLayers(): void {
    const riverLayer = new VectorLayer({
      source: this.mapService.getRiverSource(),
      style: new Style({ stroke: new Stroke({ color: '#43b9f0ff', width: 0.9 }) }),
      visible: false,
      properties: { id: 'river' }
    });

    const studySiteLayer = new VectorLayer({
      source: this.mapService.getStudySiteSource(),
      visible: false,
      style: new Style({
        image: new Icon({ src: 'assets/images/study.png', scale: 0.4, anchor: [0.5, 1] })
      }),
      properties: { id: 'studySite' }
    });

    const gaugeLayer = new VectorLayer({
      source: this.mapService.getGaugeSource(),
      visible: false,
      style: feature => {
        let icon = 'assets/images/gps.png';
        if (feature.get('Name') === 'Discharge gauge') icon = 'assets/images/discharge.png';
        else if (feature.get('Name') === 'Rainfall gauge') icon = 'assets/images/rain.png';
        return new Style({ image: new Icon({ src: icon, scale: 0.4, anchor: [0.5, 1] }) });
      },
      properties: { id: 'gauge' }
    });

    this.wwtpLayer = new VectorLayer({
      source: this.mapService.getWwtpSource(),
      visible: false,
      style: new Style({
        image: new Icon({ src: this.wwtpIconSrc, scale: 0.05, anchor: [0.5, 1] })
      }),
      properties: { id: 'wwtp' }
    });

    const grablanduseLayer = new VectorLayer({
      source: this.mapService.getGrabLandUseSource(),
      visible: false,
      style: this.getLandUseStyle.bind(this)
      ,
      properties: { id: 'landUseG' }
    });

    const piketberglanduseLayer = new VectorLayer({
      source: this.mapService.getPiketbergLandUseSource(),
      visible: false,
      style: this.getLandUseStyle.bind(this),

      properties: { id: 'landUseP' }
    });

    const hexlanduseLayer = new VectorLayer({
      source: this.mapService.getHexLandUseSource(),
      visible: false,
      style: this.getLandUseStyle.bind(this)
      ,
      properties: { id: 'landUseH' }
    });
    const hexcatchmentLayer = new VectorLayer({
      source: this.mapService.getHexCatchmentSource(),
      visible: false,
      style: new Style({
        stroke: new Stroke({
          color: '#ff0000',
          width: 1
        }),

      }),
      properties: { id: 'catchH' }
    });

    const piketbergcatchmentLayer = new VectorLayer({
      source: this.mapService.getPiketbergCatchmentSource(),
      visible: false,
      style: new Style({
        stroke: new Stroke({
          color: '#ff0000',
          width: 1
        }),

      }),
      properties: { id: 'catchP' }

    });

    const grabcatchmentLayer = new VectorLayer({
      source: this.mapService.getGrabCatchmentSource(),
      visible: false,
      style: new Style({
        stroke: new Stroke({
          color: '#ff0000',
          width: 1
        }),

      }),
      properties: { id: 'catchG' }
    });


    this.vectorLayerGroup = new LayerGroup({
      layers: [
        studySiteLayer,
        riverLayer,
        gaugeLayer,
        this.wwtpLayer,
        grablanduseLayer,
        piketberglanduseLayer,
        hexlanduseLayer,
        hexcatchmentLayer,
        piketbergcatchmentLayer,
        grabcatchmentLayer,

      ]
    });
  }

  private initializeMap(): void {
    const southAfricaExtent = transformExtent(
      [18.98, -34.6, 19.7, -32.7],
      'EPSG:4326',
      'EPSG:3857'
    );

    const zoomToExtentControl = new ZoomToExtent({
      extent: southAfricaExtent,
      label: '',
      tipLabel: 'Zoom to South Africa'
    });

    this.map = new Map({
      target: 'map',
      layers: [this.baseLayerGroup, this.vectorLayerGroup],
      view: new View({
        center: this.initialCenter,
        zoom: this.initialZoom
      }),
      controls: defaultControls({ zoom: true, rotate: false, attribution: false }).extend([zoomToExtentControl])
    });

    this.map.on('click', (event) => {
      let foundFeature = false;
      let matched = false;

      this.map.forEachFeatureAtPixel(event.pixel, (feature) => {
        foundFeature = true;
        const isStudy = feature.get('district_municipality') !== undefined;
        const isRainGauge = feature.get('Name') === 'Rainfall gauge';
        const isDischargeGauge = feature.get('Name') === 'Discharge gauge';
        const isWWTP = feature.get('wwtp_name') !== undefined;

        const coord = event.coordinate;
        const [lon, lat] = toLonLat(coord);

        let content = '';
        if (isStudy) {
          content = `<strong>Site:</strong> ${feature.get('site_name')}<br><strong>Coordinates:</strong> ${lon.toFixed(4)}, ${lat.toFixed(4)}<br><strong>Catchment size (km²):</strong> ${feature.get('catchment_size')}<br><strong>District:</strong> ${feature.get('district_municipality')}<br><strong>River:</strong> ${feature.get('river')}`;
        } else if (isDischargeGauge || isRainGauge) {
          content = `<strong>${feature.get('Name')}</strong><br><strong>Coordinates:</strong> ${lon.toFixed(4)}, ${lat.toFixed(4)}<br><strong>Catchment:</strong> ${feature.get('Catchment')}`;
        } else if (isWWTP) {
          content = `<strong>Station:</strong> ${feature.get('wwtp_name')}<br><strong>Coordinates:</strong> ${lon.toFixed(4)}, ${lat.toFixed(4)}`;
        }

        if (content) {
          this.popupElement.nativeElement.innerHTML = content;
          this.popup.setPosition(coord);
          matched = true;
        }
      });

      if (!matched && foundFeature) {
        this.popup.setPosition(undefined);
        this.popupElement.nativeElement.innerHTML = '';
      }

      if (!foundFeature) {
        this.popup.setPosition(undefined);
        this.popupElement.nativeElement.innerHTML = '';
      }
    });
  }
}
