import { defer, Observable, Subject, Subscription, timer } from 'rxjs';
import { delayWhen } from 'rxjs/operators';

export class RateLimitController {
  private count = 0;
  private reset$ = new Subject<void>();
  private resetSubscription: Subscription;

  private readonly rateIntervalSec = 60;

  constructor(private rateLimit: number) {}

  getLimited<T>(src$: Observable<T>): Observable<T> {
    return defer(() => {
      if (this.count === this.rateLimit - 1) {
        return src$.pipe(delayWhen(() => this.reset$));
      }
      this.count++;
      if (this.count === 1 || this.resetSubscription?.closed) {
        this.resetSubscription = timer(1000 * this.rateIntervalSec).subscribe(() => {
          this.count = 0;
          this.reset$.next();
        });
      }
      return src$;
    });
  }

  destroy(): void {
    this.resetSubscription?.unsubscribe();
    this.reset$.complete();
  }
}
