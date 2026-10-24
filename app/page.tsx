import { BentoGrid } from "@/components/design/lm-bento";
import { LmHero } from "@/components/design/lm-hero";
import { COPY } from "@/components/design/lm-copy";
import {
  Faq,
  GuruSection,
  HowHeader,
  Languages,
  LmFinalCta,
  LmFooter,
  LmHeader,
  PageSection,
  Problem,
  SectionHeading,
  TrustStrip,
} from "@/components/design/lm-sections";
import { DropFromHeader } from "@/components/design/drop-from-header";
import { ScrollShowcase } from "@/components/design/scroll-showcase";
import { createClient } from "@/lib/supabase/server";

/** Set to false to turn off the How it works drop-in and render it plainly. */
const HOW_DROPS_FROM_HEADER = true;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);
  const start = signedIn ? "/dashboard" : "/signin";

  return (
    <div className="lm-theme min-h-screen">
      <LmHeader signedIn={signedIn} />

      <main>
        <LmHero
          primaryHref={start}
          primaryLabel={signedIn ? "Go to dashboard" : "Try it with a sample chapter"}
        />
        <TrustStrip />
        <Problem />

        <PageSection id="features" labelledBy="features-title" className="lm-aura lm-aura--beam">
          <SectionHeading
            eyebrow={COPY.features.eyebrow}
            title={COPY.features.title}
            id="features-title"
            className="mb-8"
          />
          <BentoGrid />
        </PageSection>

        <section
          id="how-it-works"
          aria-labelledby="how-title"
          className="lm-section lm-aura lm-aura--slate px-4 pt-14 sm:px-6 lg:pt-[84px]"
        >
          <div className="mx-auto max-w-[1200px]">
            <DropFromHeader enabled={HOW_DROPS_FROM_HEADER} amount="some">
              <ScrollShowcase href={start} header={<HowHeader />} />
            </DropFromHeader>
          </div>
        </section>

        <GuruSection />
        <Languages />
        <Faq />
        <LmFinalCta
          href={start}
          label={signedIn ? "Go to dashboard" : "Upload your first chapter"}
        />
      </main>

      <LmFooter signedIn={signedIn} />
    </div>
  );
}
