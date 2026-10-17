import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

export interface TripFilterValue {
  query: string;
  category: string;
}

@Component({
  selector: 'app-trip-filters',
  imports: [ReactiveFormsModule],
  template: `
    <form class="filters" [formGroup]="form">
      <label><span>Rechercher</span><input formControlName="query" placeholder="Italie, montagne, mer..." /></label>
      <label><span>Style</span><select formControlName="category"><option>Tous</option><option>Mer</option><option>Montagne</option><option>Culture</option></select></label>
      <button class="button ghost" type="button" (click)="reset()">Réinitialiser</button>
    </form>
  `,
})
export class TripFiltersComponent implements OnInit {
  @Output() readonly filtersChange = new EventEmitter<TripFilterValue>();
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({ query: '', category: 'Tous' });

  ngOnInit(): void {
    this.form.valueChanges.pipe(debounceTime(150), distinctUntilChanged()).subscribe((value) => {
      this.filtersChange.emit({ query: value.query ?? '', category: value.category ?? 'Tous' });
    });
  }

  reset(): void {
    this.form.reset({ query: '', category: 'Tous' });
  }
}
