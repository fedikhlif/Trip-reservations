import { ButtonLink } from "../components/ui";

export default function NotFoundPage() {
  return <section className="page-section container empty-state"><p className="eyebrow">404</p><h1>This road ends here.</h1><p>Let's get you back to somewhere worth exploring.</p><ButtonLink to="/">Return home</ButtonLink></section>;
}
