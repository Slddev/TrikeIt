import Link from "next/link";
import { Logo, Wordmark } from "@/components/logo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const FAQ = [
  {
    q: "How much does a TrikeIt! delivery cost?",
    a: "At launch, fares will follow each local TODA's official fare matrix. For this demo, Regular deliveries are ₱12 for the first kilometer and ₱12 for each kilometer after, by road distance, and Express deliveries use the whole trike and cost 4× the regular fare.",
  },
  {
    q: "What's the difference between Regular and Express?",
    a: "Regular deliveries share a tricycle with up to three others going your way, and go out once the trike is full. Express gets a trike to yourself and goes to riders right away.",
  },
  {
    q: "Can I order from stores?",
    a: "Yes. Open the Merchants tab in the app, pick a store near you, and add items to your basket. A rider buys your order at the store and you pay for everything in cash when it arrives.",
  },
  {
    q: "Who delivers my parcel?",
    a: "Local TODA tricycle riders approved by our team. Once a rider accepts, you'll see their name, plate and body number, and they confirm each pick-up and drop-off on the spot.",
  },
  {
    q: "Can someone else receive or pay for the parcel?",
    a: "Yes. Add the recipient's name and number when you set the drop-off. Either the sender or the recipient can pay; the recipient pays cash on delivery.",
  },
  {
    q: "How do I become a TrikeIt! rider or merchant?",
    a: "Sign in to the app with your phone number, then contact us to be approved as a rider or to list your store.",
  },
];

// Structured data so search engines can show the business details and FAQ answers.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL.href}#organization`,
      name: SITE_NAME,
      url: SITE_URL.href,
      logo: new URL("/icon.png", SITE_URL).href,
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Country", name: "Philippines" },
    },
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL.href,
      inLanguage: "en-PH",
      publisher: { "@id": `${SITE_URL.href}#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
      />
      <header className="sticky top-0 z-10 border-b border-brand-navy/5 bg-brand-yellow/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="TrikeIt! home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1 sm:gap-6">
            <a
              href="#how"
              className="hidden text-sm font-medium hover:underline sm:inline"
            >
              How it works
            </a>
            <a
              href="#stores"
              className="hidden text-sm font-medium hover:underline sm:inline"
            >
              Stores
            </a>
            <a
              href="#riders"
              className="hidden text-sm font-medium hover:underline sm:inline"
            >
              For riders
            </a>
            <Link
              href="/login"
              className="rounded-xl bg-brand-navy px-4 py-2 text-sm font-semibold text-brand-yellow hover:opacity-90"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="bg-linear-to-b from-brand-yellow via-brand-cream to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-24">
            <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                Tricycle delivery in the Philippines
              </span>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Deliveries by your local trike.
              </h1>
              <p className="max-w-md text-lg text-brand-navy/70">
                Pin the pick-up and drop-off, and a local TODA tricycle rider
                delivers your parcel, or orders from stores near you. Batch it
                with up to three others for less, or send it Express right away.
              </p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <a
                  href="#download"
                  className="rounded-2xl bg-brand-navy px-6 py-4 text-center font-semibold text-brand-yellow hover:opacity-90"
                >
                  Get the app
                </a>
                <Link
                  href="/login"
                  className="rounded-2xl border-2 border-brand-navy bg-brand-cream px-6 py-4 text-center font-semibold hover:bg-white"
                >
                  Sign in
                </Link>
              </div>
            </div>
            <PhoneMockup />
          </div>
        </section>

        <section
          id="how"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24"
        >
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Step n={1} title="Pin your stops">
              Drag the map to the exact pick-up and drop-off, or search for a
              place, and add who receives it. Fares follow the road distance.
            </Step>
            <Step n={2} title="Batch it or send it Express">
              Regular deliveries go out once four parcels heading your way fill
              the trike. Watch the batch fill up, or pay for the empty slots to
              send it sooner.
            </Step>
            <Step n={3} title="Delivered by a TODA rider">
              An approved local rider picks it up and confirms the hand-off at
              the drop-off. You&apos;ll see their name, plate and body number.
            </Step>
          </div>
        </section>

        <section className="bg-brand-cream">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
            <div className="md:col-span-2">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simple fares
              </h2>
              <p className="mt-2 text-brand-navy/70">
                Pay cash on drop-off or online.
              </p>
              <p className="mt-3 inline-block rounded-xl bg-white/80 px-3 py-2 text-sm text-brand-navy/70">
                <b className="text-brand-navy">Demo fares.</b> At launch, fares
                will follow each TODA&apos;s official fare matrix.
              </p>
            </div>
            <Fare
              name="Regular"
              price="₱12"
              unit="first km, then ₱12 per km"
              points={[
                "Batched with up to 3 other parcels",
                "Goes out when the trike is full",
                "Pay for empty slots to send sooner",
              ]}
            />
            <Fare
              name="Express"
              price="4×"
              unit="the regular fare"
              highlight
              points={[
                "The whole trike carries your delivery",
                "Goes to riders right away",
                "No waiting for a batch",
              ]}
            />
          </div>
        </section>

        <section id="stores" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-16 sm:px-6 md:pt-24">
          <div className="grid gap-8 rounded-3xl bg-brand-yellow p-8 sm:p-12 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Order from stores near you
              </h2>
              <p className="text-brand-navy/70">
                Bakeries, carinderias and sari-sari stores in your area, in the
                Merchants tab. Add to your basket, leave a note for the store,
                and a rider brings it over.
              </p>
            </div>
            <ul className="flex flex-col justify-center gap-3 text-sm">
              {[
                "Pay for your order and delivery in cash when it arrives",
                "Express for a trike to yourself, or Regular to share and save",
                "Track your order from “Waiting for a trike” to your door",
              ].map((point) => (
                <li key={point} className="flex gap-2 rounded-2xl bg-white/70 p-4">
                  <span aria-hidden>✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="riders"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24"
        >
          <div className="grid items-center gap-10 rounded-3xl bg-brand-navy p-8 text-brand-yellow sm:p-12 md:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-4">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Deliver with TrikeIt!
              </h2>
              <p className="max-w-xl text-white/80">
                TODA riders are approved by our team before they can take
                deliveries. Only full trips near you show up, so every run is
                worth it. Accept or pass, then navigate with the in-app map,
                Waze or Google Maps.
              </p>
              <p className="text-sm text-white/60">
                Sign in to the app with your phone number, then ask your TODA to
                have you approved.
              </p>
            </div>
            <Logo className="hidden size-40 text-brand-yellow md:block" />
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-16 sm:px-6 md:pb-24">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Questions
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group rounded-2xl bg-brand-cream p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  <h3>{q}</h3>
                  <span aria-hidden className="text-xl transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-brand-navy/70">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="download" className="scroll-mt-20 bg-brand-yellow">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
            <Logo className="size-20" />
            <h2 className="text-3xl font-bold tracking-tight">
              The app is coming soon
            </h2>
            <p className="max-w-md text-brand-navy/70">
              TrikeIt! is in testing on Android. Store links will be posted here
              when it launches.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-brand-navy/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-brand-navy/60 sm:flex-row sm:px-6">
          <Wordmark className="scale-90" />
          <p>© TrikeIt!</p>
        </div>
      </footer>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-brand-cream p-6">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-navy font-bold text-brand-yellow">
        {n}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-brand-navy/70">{children}</p>
    </div>
  );
}

function Fare({
  name,
  price,
  unit,
  points,
  highlight,
}: {
  name: string;
  price: string;
  unit: string;
  points: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-3xl border-2 p-6 sm:p-8 ${
        highlight
          ? "border-brand-navy bg-brand-gold"
          : "border-transparent bg-white"
      }`}
    >
      <h3 className="text-lg font-semibold">{name}</h3>
      <p>
        <span className="text-4xl font-bold">{price}</span>{" "}
        <span className="text-brand-navy/70">{unit}</span>
      </p>
      <ul className="flex flex-col gap-2 text-sm">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden>✓</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A static rendering of the app's home screen. */
function PhoneMockup() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[19rem]">
      <div className="rounded-[2.5rem] border-[10px] border-brand-navy bg-linear-to-b from-[#F3D873] via-[#FFF3C4] to-white p-4 shadow-2xl shadow-brand-navy/20">
        <div className="flex items-center justify-between">
          <Wordmark className="scale-75 origin-left" />
          <span className="size-8 rounded-full bg-white" />
        </div>
        <div className="mt-4 flex gap-2">
          <span className="flex-1 rounded-xl bg-brand-navy py-2 text-center text-xs font-semibold text-brand-yellow">
            Delivery
          </span>
          <span className="flex-1 rounded-xl bg-brand-cream py-2 text-center text-xs font-semibold">
            Merchants
          </span>
        </div>
        <div className="mt-3 rounded-2xl bg-brand-navy p-3">
          <div className="rounded-xl bg-white px-3 py-1 text-xs">
            <p className="flex items-center gap-2 py-2">
              <span className="size-3 rounded-full border-[3px] border-brand-gold" />{" "}
              Aling Nena&apos;s Store
            </p>
            <p className="flex items-center gap-2 border-t border-brand-navy/10 py-2">
              <span className="size-3 rounded-full bg-brand-navy" /> Barangay Hall
            </p>
          </div>
          <p className="mt-2 text-right text-[10px] font-medium text-brand-yellow">
            3.2 km · 9 min
          </p>
        </div>
        <div className="mt-3 flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between rounded-xl border-2 border-brand-navy bg-brand-gold p-3">
            <span>
              <b className="block">Regular</b>Batched · fills to 4
            </span>
            <b>₱48</b>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-brand-cream p-3">
            <span>
              <b className="block">Express</b>Sent right away
            </span>
            <b>₱192</b>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-white p-3 text-xs">
          <p className="font-semibold">Batching your parcel</p>
          <div className="mt-2 flex gap-1.5">
            {[true, true, false, false].map((filled, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${filled ? "bg-brand-navy" : "bg-brand-navy/15"}`}
              />
            ))}
          </div>
          <p className="mt-1 text-brand-navy/60">2 of 4 slots</p>
        </div>
      </div>
    </div>
  );
}
