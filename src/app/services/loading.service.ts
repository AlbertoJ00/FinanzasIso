import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  public show(): void {
    // Small timeout to avoid ExpressionChangedAfterItHasBeenCheckedError in Angular
    setTimeout(() => this.loadingSubject.next(true), 0);
  }

  public hide(): void {
    setTimeout(() => this.loadingSubject.next(false), 0);
  }
}
