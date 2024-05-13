import { concat, defer, Observable, of, Subject, Subscription, timer } from 'rxjs';
import { delayWhen, tap } from 'rxjs/operators';

export class RateLimitWaitEvent {}

export class RateLimitController {
  private count = 0;
  private reset$ = new Subject<void>();
  private resetSubscription: Subscription;

  private readonly rateIntervalSec = 61;

  constructor(private rateLimit: number) {}

  getLimited<T>(src$: Observable<T>): Observable<T | RateLimitWaitEvent> {
    return defer(() => {
      this.count++;
      if (this.count === this.rateLimit) {
        return concat(src$, of(new RateLimitWaitEvent()).pipe(delayWhen(() => this.reset$)));
      }
      if (this.count > this.rateLimit) {
        return concat(
          of(new RateLimitWaitEvent()).pipe(delayWhen(() => this.reset$)),
          src$.pipe(
            tap(() => {
              this.count++;
            }),
          ),
        );
      }
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
