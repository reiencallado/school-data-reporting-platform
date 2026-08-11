import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.css',
})
export class ComingSoon {
  // One shared component for every "not built yet" route (Settings, Logs,
  // ...). Reads title/message straight off route `data` via
  // ActivatedRoute rather than @Input, so it works regardless of whether
  // withComponentInputBinding() is enabled in main.ts.
  title = 'Coming Soon';
  message = "This page hasn't been built yet.";

  constructor(route: ActivatedRoute) {
    const data = route.snapshot.data;
    this.title = data['title'] ?? this.title;
    this.message = data['message'] ?? this.message;
  }
}