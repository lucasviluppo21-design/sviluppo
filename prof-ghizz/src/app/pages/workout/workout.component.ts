import { Component, OnInit, inject } from '@angular/core';

@Component({
  selector: 'app-workout',
  standalone: false,
  templateUrl: './workout.component.html',
  styleUrl: './workout.component.css',
})
export class WorkoutComponent implements OnInit{

   ngOnInit(): void { this.initStandard(); }

   async initStandard() {}

}
