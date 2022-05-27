import { InjectionToken } from '@angular/core';
import { PersistState } from '@datorama/akita';

export const AKITA_PERSIST_STORAGE = new InjectionToken<PersistState>('AKITA_PERSIST_STORAGE');
