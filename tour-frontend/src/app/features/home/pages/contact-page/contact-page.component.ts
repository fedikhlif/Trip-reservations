import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { PageHeaderComponent } from '../../../../shared/components/site-parts/site-parts.component';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [FormsModule, NgIf, PageHeaderComponent],
  template: `
    <app-page-header title="Contact" current="Contact" />
    <main class="contact-page">
      <div class="contact-layout">
        <div class="contact-info">
          <p>Let's talk about your trip</p>
          <h2>Our team is here to help</h2>
          <span>
            Need advice or a customised itinerary? Get in touch and
            we'll get back to you as soon as possible.
          </span>
          <div>
            <article>
              <small>Phone</small>
              <strong>+216 71 000 000</strong>
            </article>
            <article>
              <small>Email</small>
              <strong>bonjour&#64;tour.tn</strong>
            </article>
            <article>
              <small>Address</small>
              <strong>Les Berges du Lac, Tunis</strong>
            </article>
          </div>
        </div>

        <form class="contact-form-new" (ngSubmit)="onSubmit()">
          <label>
            Full name
            <input required [(ngModel)]="form.name" name="name" placeholder="Your name" />
          </label>
          <label>
            Email address
            <input type="email" required [(ngModel)]="form.email" name="email" placeholder="you@example.com" />
          </label>
          <label class="wide">
            Subject
            <input required [(ngModel)]="form.subject" name="subject" placeholder="How can we help?" />
          </label>
          <label class="wide">
            Message
            <textarea required [(ngModel)]="form.message" name="message" placeholder="Tell us about your travel plans…"></textarea>
          </label>
          <button type="submit">
            Send message
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 10h11M11 6l4 4-4 4"/></svg>
          </button>
          <p *ngIf="submissionNotice" class="api-error" role="alert">{{ submissionNotice }}</p>
        </form>
      </div>
    </main>
  `,
})
export class ContactPageComponent {
  submissionNotice = '';
  form = { name: '', email: '', subject: '', message: '' };

  onSubmit(): void {
    this.submissionNotice =
      'Your message was not sent: the backend does not yet provide a contact service.';
  }
}
