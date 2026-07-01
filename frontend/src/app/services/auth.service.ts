// TODO: Add auth

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root' 
})

export class AuthService { 
  constructor() {}

  

  logout() {
    console.log('User logged out');
  }
}