import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import VectorSource from 'ol/source/Vector';
import { GeoJSON } from 'ol/format';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  
  private layerToggleSubject = new Subject<{ name: string; visible: boolean }>();
  layerToggle$ = this.layerToggleSubject.asObservable();

  private siteAndVisibilitySubject = new Subject<{ site: string, visible: boolean }>();
  siteAndVisibility$ = this.siteAndVisibilitySubject.asObservable();

  private riverandRainSubject = new Subject<{ site: string, time: string,check:boolean }>();
  riverandRainSubject$ = this.riverandRainSubject.asObservable();

  private timeSubject = new Subject<{ time: string  ,mode:string ,site: string,pesticideName:string  }>();
  time$ = this.timeSubject.asObservable();

  emitTimeToggle(event: { time: string ,mode:string , site: string,pesticideName:string }) {
    this.timeSubject.next(event);
  }

  emitLayerToggle(event: { name: string; visible: boolean }) {
    this.layerToggleSubject.next(event);
  }


  emitSiteAndVisibility(payload: { site: string, visible: boolean }) {
    this.siteAndVisibilitySubject.next(payload);
  }

  emitLegendToggle(event: { name: string; visible: boolean }) {
    this.layerToggleSubject.next(event);
  }
  emitRainRiverToggle(event: { site: string; time: string ,check:boolean}) {
    this.riverandRainSubject.next(event);
  }



  private geoserverUrl = 'http://localhost:8080/geoserver/pfe/ows';

  getStudySiteSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:studysite&outputFormat=application/json`
    });
  }

  getGaugeSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:Gauge_spots&outputFormat=application/json`
    });
  }

  getRiverSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:riverCourses&outputFormat=application/json`
    });
  }

  getWwtpSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:wwtp&outputFormat=application/json`
    });
  }

  getGrabLandUseSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:Grab_landuse_clip&outputFormat=application/json`
    });
  }
   getGrabCatchmentSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:Grabouw_catchment&outputFormat=application/json`
    });
  }
   getHexLandUseSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:Hex_landuse_Clip&outputFormat=application/json`
    });
  }
     getHexCatchmentSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:Hex_catchment&outputFormat=application/json`
    });
  }
    getPiketbergLandUseSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:Piketberg_land_use_Clip&outputFormat=application/json`
    });
  }
     getPiketbergCatchmentSource(): VectorSource {
    return new VectorSource({
      format: new GeoJSON({
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      }),
      url: `${this.geoserverUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=pfe:Piketberg_catchment&outputFormat=application/json`
    });
  }
}
