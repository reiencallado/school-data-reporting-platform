import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

export interface JobUpdate {
  id: string;
  status: 'DONE' | 'PROCESSING' | 'FAILED' | 'PENDING';
  totalCount: number;
  fileUrl?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportStreamService {
  private eventSource!: EventSource;
  public jobUpdates$ = new Subject<JobUpdate>();
  public toastUpdates$ = new Subject<JobUpdate>();

  constructor(private zone: NgZone) {
    this.connect();
  }

  private connect(): void {
    this.eventSource = new EventSource('http://localhost:8080/api/report-jobs/stream');

    this.eventSource.addEventListener('job-update', (event: MessageEvent) => {
      this.zone.run(() => {
        const data = JSON.parse(event.data);
        const update: JobUpdate = {
          id: data.id,
          status: data.status,
          totalCount: data.totalCount,
          fileUrl: data.fileUrl,
          message: data.status === 'DONE' ? 'Batch generated successfully!' : 'Batch generation failed.'
        };
        
        this.jobUpdates$.next(update);
        
        // In-app notification
        if (update.status === 'DONE' || update.status === 'FAILED') {
          this.toastUpdates$.next(update);
        }
      });
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE Connection Error, retrying...', error);
      this.eventSource.close();
      setTimeout(() => this.connect(), 5000); // Reconnect after 5 seconds
    };
  }
}