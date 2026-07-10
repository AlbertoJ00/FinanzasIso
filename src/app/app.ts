import { Component } from '@angular/core';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App {
  constructor(private loadingService: LoadingService) {}

  public get isLoading$() {
    return this.loadingService.loading$;
  }
}
