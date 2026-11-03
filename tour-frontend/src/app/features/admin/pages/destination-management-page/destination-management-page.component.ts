import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DestinationService } from '../../../../core/services/destination.service';
import { type Destination, type DestinationWrite } from '../../../../core/models/destination.model';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

@Component({
  selector: 'app-destination-management-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, RouterLink],
  template: `
    <main class="admin-page">
      <header>
        <p>Administrator</p>
        <h1>Manage destinations</h1>
        <span>Add, edit, and remove destinations from the catalogue.</span>
        <a routerLink="/admin/trips" class="sibling-link">&#8594; Manage trips</a>
      </header>

      <p *ngIf="error" class="api-error" role="alert">{{ error }}</p>
      <p *ngIf="success" class="api-success" role="status">{{ success }}</p>

      <!-- Form -->
      <section class="section-card">
        <h2>{{ editing ? 'Edit destination' : 'Add a destination' }}</h2>
        <form class="dest-form" (ngSubmit)="save()">
          <label>
            Name
            <input [(ngModel)]="form.name" name="name" maxlength="120" required placeholder="e.g. Paris" />
          </label>
          <label>
            Country
            <input [(ngModel)]="form.country" name="country" maxlength="120" required placeholder="e.g. France" />
          </label>
          <label class="full-width">
            Description
            <textarea [(ngModel)]="form.description" name="description" rows="3"
              placeholder="A short description of the destination."></textarea>
          </label>

          <!-- Image upload -->
          <div class="full-width image-upload-section">
            <label class="image-label">
              Destination photo
              <div class="image-upload-row">
                <label class="file-picker-btn" for="destImageInput">
                  &#128247; Choose image
                </label>
                <input id="destImageInput" type="file" accept="image/*"
                  (change)="onFileSelected($event)" style="display:none" />
                <span class="file-name">{{ selectedFile ? selectedFile.name : 'No file chosen' }}</span>
              </div>
            </label>
            <div *ngIf="imagePreview || (editing && editing.image_url)" class="image-preview-wrap">
              <img [src]="imagePreview || editing?.image_url" alt="Destination preview" class="image-preview" />
            </div>
          </div>

          <div class="form-actions full-width">
            <button type="submit" [disabled]="working">
              {{ working ? 'Saving...' : (editing ? 'Save changes' : 'Add destination') }}
            </button>
            <button *ngIf="editing" type="button" class="secondary" (click)="reset()">Cancel</button>
          </div>
        </form>
      </section>

      <!-- List -->
      <section class="section-card">
        <h2>Destination catalogue</h2>
        <p *ngIf="loading" role="status">Loading...</p>
        <p *ngIf="!loading && !destinations.length">No destinations yet. Add one above.</p>
        <div class="dest-row" *ngFor="let d of destinations">
          <div class="dest-info">
            <img *ngIf="d.image_url" [src]="d.image_url" [alt]="d.name" class="dest-thumb" />
            <div class="dest-thumb-placeholder" *ngIf="!d.image_url">&#127758;</div>
            <div>
              <strong>{{ d.name }}</strong>, {{ d.country }}
              <span *ngIf="d.description" class="dest-desc"> &ndash; {{ d.description }}</span>
            </div>
          </div>
          <div class="row-actions">
            <button type="button" class="secondary" (click)="edit(d)">Edit</button>
            <button type="button" class="danger" [disabled]="working" (click)="remove(d)">Delete</button>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .admin-page { width: min(900px, calc(100% - 40px)); margin: 56px auto 80px; }
    header { margin-bottom: 28px; }
    header p { color: #0780a0; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
    h1, h2, p { margin-top: 0; }
    .sibling-link { display: inline-block; margin-top: 10px; color: #0780a0; font-size: 14px; font-weight: 600; text-decoration: none; }
    .sibling-link:hover { text-decoration: underline; }

    .section-card { background: #f3f7f7; border-radius: 16px; padding: 24px; margin-bottom: 24px; }

    .dest-form { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .dest-form .full-width { grid-column: 1 / -1; }
    .dest-form label { display: grid; gap: 6px; color: #3a4445; font-size: 14px; font-weight: 600; }
    .dest-form input, .dest-form textarea { min-width: 0; padding: 10px 12px; border: 1px solid #c8d3d4; border-radius: 8px; background: #fff; font: inherit; resize: vertical; }

    .image-upload-section { display: grid; gap: 12px; }
    .image-label { color: #3a4445; font-size: 14px; font-weight: 600; display: grid; gap: 8px; }
    .image-upload-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .file-picker-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #0780a0; border-radius: 8px; background: #fff; color: #0780a0; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .file-picker-btn:hover { background: #e8f5f9; }
    .file-name { color: #596667; font-size: 13px; font-weight: 400; }
    .image-preview-wrap { margin-top: 8px; }
    .image-preview { max-width: 240px; max-height: 160px; border-radius: 10px; object-fit: cover; border: 1px solid #c8d3d4; }

    .dest-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid #dfe7e7; }
    .dest-row:last-child { border-bottom: none; }
    .dest-info { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .dest-thumb { width: 52px; height: 40px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    .dest-thumb-placeholder { width: 52px; height: 40px; display: flex; align-items: center; justify-content: center; background: #dfe7e7; border-radius: 6px; font-size: 20px; flex-shrink: 0; }
    .dest-desc { color: #596667; font-size: 13px; }

    .form-actions, .row-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    button { min-height: 40px; padding: 0 18px; border: 0; border-radius: 999px; background: #0780a0; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    button.secondary { border: 1px solid #0780a0; background: #fff; color: #0780a0; }
    button.danger { background: #b93838; }

    .api-error { color: #b93838; background: #fdf0f0; border: 1px solid #f5c6c6; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }
    .api-success { color: #1e6e3a; background: #f0fdf4; border: 1px solid #bbf0cc; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }

    @media (max-width: 600px) {
      .admin-page { margin-top: 32px; }
      .dest-form { grid-template-columns: 1fr; }
      .dest-row { flex-direction: column; align-items: flex-start; }
    }
  `],
})
export class DestinationManagementPageComponent implements OnInit {
  destinations: Destination[] = [];
  editing: Destination | null = null;
  loading = true;
  working = false;
  error = '';
  success = '';
  form: DestinationWrite = this.emptyForm();
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(private readonly destinationService: DestinationService) {}

  ngOnInit(): void { this.load(); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.imagePreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  save(): void {
    this.working = true;
    this.clear();
    // Capture before async — this.editing gets cleared by resetFull()
    const isEditing = !!this.editing;
    const capturedId = this.editing?.id;
    const req = isEditing
      ? this.destinationService.updateForAdmin(capturedId!, this.form)
      : this.destinationService.createForAdmin(this.form);
    req.subscribe({
      next: (saved: Destination) => {
        // For edit, use the known ID (not saved.id which may be absent in older server versions)
        const destinationId = isEditing ? capturedId! : saved.id;
        const fileToUpload = this.selectedFile;
        this.selectedFile = null; // prevent double-upload if component re-renders
        if (fileToUpload && destinationId) {
          this.destinationService.uploadImage(destinationId, fileToUpload).subscribe({
            next: () => {
              this.success = isEditing ? 'Destination updated with photo.' : 'Destination added with photo.';
              this.resetFull();
            },
            error: (err: unknown) => {
              const action = isEditing ? 'Destination details were updated' : 'Destination was added';
              this.error = `${action}, but the photo could not be uploaded. ${apiErrorMessage(err)}`;
              this.working = false;
              this.load();
            },
          });
        } else {
          this.success = isEditing ? 'Destination updated.' : 'Destination added.';
          this.resetFull();
        }
      },
      error: (err: unknown) => { this.error = apiErrorMessage(err); this.working = false; },
    });
  }

  edit(d: Destination): void {
    this.editing = d;
    this.clear();
    this.selectedFile = null;
    this.imagePreview = null;
    this.form = { name: d.name, country: d.country, description: d.description };
  }

  remove(d: Destination): void {
    if (!window.confirm(`Delete "${d.name}, ${d.country}"?\nTrips linked to it cannot be deleted first.`)) return;
    this.working = true;
    this.clear();
    this.destinationService.deleteForAdmin(d.id).subscribe({
      next: () => { this.success = 'Destination deleted.'; this.working = false; this.load(); },
      error: (err: unknown) => { this.error = apiErrorMessage(err); this.working = false; },
    });
  }

  reset(): void { this.editing = null; this.form = this.emptyForm(); this.selectedFile = null; this.imagePreview = null; }

  private resetFull(): void {
    this.reset();
    this.working = false;
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.destinationService.getAll().subscribe({
      next: (d) => { this.destinations = d; this.loading = false; },
      error: (err: unknown) => { this.error = apiErrorMessage(err); this.loading = false; },
    });
  }

  private clear(): void { this.error = ''; this.success = ''; }
  private emptyForm(): DestinationWrite { return { name: '', country: '', description: '' }; }
}
