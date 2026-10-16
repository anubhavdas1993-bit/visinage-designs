/* Shared placeholder content for all four concept mockups.
   Everything numerical here is DEMO / PLACEHOLDER DATA and is labelled as such in the UI. */
window.VISINAGE = {
  name: "Visinage",
  tagline: "Independent research, data and visual analysis",
  nav: ["Research", "Data", "Visuals", "Projects", "About"],
  author: "Anubhav Das",

  featured: {
    kicker: "Labour markets",
    title: "Where the middle-wage jobs went",
    deck: "Middle-paid work has lost share in every one of 14 advanced economies since 1995. Automation explains less of it than the standard story claims.",
    date: "6 October 2026",
    dateShort: "6 Oct 2026",
    readTime: "14 min read",
    tags: ["Labour", "Technology", "Inequality"],
    chartTitle: "The hollowing out, in one line",
    chartSubtitle: "Employment share by wage tier, average of 14 advanced economies, 1995 to 2024 (%)",
    source: "Source: Visinage analysis of national labour force surveys. DEMO / PLACEHOLDER DATA.",
    keyNumber: { value: "47.2%", label: "of jobs are middle-wage today, down from 56.0% in 1995" },
    deltaNumber: { value: "-8.8 pts", label: "fall in middle-wage share over 30 years" }
  },

  /* Three series, 30 annual points. DEMO DATA. */
  years: Array.from({ length: 30 }, (_, i) => 1995 + i),
  series: {
    middle: [56.0,55.8,55.5,55.4,55.0,54.7,54.5,54.1,53.9,53.6,53.2,52.9,52.7,52.4,51.3,50.8,50.6,50.2,49.9,49.7,49.5,49.4,49.0,48.8,48.6,48.1,47.9,47.6,47.4,47.2],
    high:   [24.5,24.6,24.8,24.8,25.1,25.3,25.4,25.6,25.7,25.9,26.2,26.4,26.5,26.7,27.2,27.4,27.5,27.7,27.9,28.0,28.2,28.3,28.6,28.8,28.9,29.4,29.6,29.9,30.2,30.4],
    low:    [19.5,19.6,19.7,19.8,19.9,20.0,20.1,20.3,20.4,20.5,20.6,20.7,20.8,20.9,21.5,21.8,21.9,22.1,22.2,22.3,22.3,22.3,22.4,22.4,22.5,22.5,22.5,22.5,22.4,22.4]
  },
  seriesLabels: { middle: "Middle-wage", high: "High-wage", low: "Low-wage" },
  annotations: [
    { year: 2009, text: "Financial crisis: the decline accelerates", series: "middle" },
    { year: 2016, text: "Middle-wage share falls below 50%", series: "middle" }
  ],

  /* Office vacancy, 2019 vs 2026. DEMO DATA. */
  vacancy: {
    title: "Office vacancy has not come back down",
    subtitle: "Central business district vacancy rate, 2019 Q4 vs 2026 Q2 (%)",
    source: "Source: Visinage Office Vacancy Tracker, compiled from brokerage reports. DEMO / PLACEHOLDER DATA.",
    rows: [
      { city: "San Francisco", a: 6.1,  b: 34.2 },
      { city: "Houston",       a: 18.4, b: 26.1 },
      { city: "Toronto",       a: 2.2,  b: 18.3 },
      { city: "Sydney",        a: 4.1,  b: 13.6 },
      { city: "London",        a: 5.4,  b: 10.9 },
      { city: "Frankfurt",     a: 7.0,  b: 9.8 },
      { city: "Paris",         a: 5.6,  b: 8.9 },
      { city: "Singapore",     a: 5.2,  b: 6.1 },
      { city: "Tokyo",         a: 1.6,  b: 4.3 }
    ]
  },

  /* Profit share of inflation. DEMO DATA. */
  profits: {
    title: "How much of the 2021 to 2023 price rise went to margins",
    subtitle: "Contribution of unit profits to GDP deflator growth, 2021 Q1 to 2023 Q2 (%)",
    source: "Source: Visinage analysis of national accounts. DEMO / PLACEHOLDER DATA.",
    rows: [
      { name: "Euro area", v: 45 }, { name: "Australia", v: 53 }, { name: "United States", v: 34 },
      { name: "Canada", v: 41 }, { name: "United Kingdom", v: 28 }, { name: "Japan", v: 19 }
    ]
  },

  /* Per-country middle-wage share, start and end, for small multiples. DEMO DATA. */
  countries: [
    { name: "United States", s: 55.1, e: 44.9 }, { name: "Germany", s: 60.2, e: 52.8 },
    { name: "United Kingdom", s: 54.3, e: 45.6 }, { name: "France", s: 58.9, e: 51.7 },
    { name: "Japan", s: 61.5, e: 55.2 }, { name: "Canada", s: 56.4, e: 48.1 },
    { name: "Australia", s: 55.0, e: 46.3 }, { name: "Netherlands", s: 57.6, e: 49.0 },
    { name: "Sweden", s: 59.8, e: 53.4 }, { name: "Spain", s: 52.1, e: 43.8 },
    { name: "Italy", s: 57.3, e: 50.6 }, { name: "South Korea", s: 53.2, e: 46.9 }
  ],

  latest: [
    { title: "Remote work and the office-vacancy wave: a city-by-city accounting", topic: "Cities", date: "2 Oct 2026", read: "9 min", type: "Research", deck: "Vacancy is a tax-base problem before it is a real-estate problem. We follow the money through nine city budgets." },
    { title: "The real cost of a cheap flight", topic: "Climate", date: "28 Sep 2026", read: "11 min", type: "Research", deck: "Fuel-tax exemptions, free allowances and airport subsidies add up. We price them per passenger." },
    { title: "How much of inflation was profit?", topic: "Macroeconomics", date: "22 Sep 2026", read: "12 min", type: "Research", deck: "Decomposing the 2021 to 2023 price surge across six economies, with the national accounts rather than the headlines." },
    { title: "Who wins when a stadium gets built", topic: "Public finance", date: "15 Sep 2026", read: "8 min", type: "Research", deck: "Thirty years of stadium deals, matched to local employment and land-value data." },
    { title: "A short history of the 40-hour week", topic: "Labour", date: "9 Sep 2026", read: "7 min", type: "Research", deck: "The standard working week was a political settlement, not an economic optimum. The data on hours since 1870 shows how unusual it is." }
  ],

  visualEssay: {
    title: "The same decline, twelve times over",
    deck: "The fall in middle-wage employment looks different in every country and identical in every country. A visual tour of 12 economies.",
    read: "6 min",
    date: "25 Sep 2026",
    type: "Visual essay"
  },

  notes: [
    { title: "The 2024 productivity revision changes the 2010s more than reported", date: "5 Oct 2026", read: "3 min", topic: "Methods" },
    { title: "A cleaner way to deflate regional wages", date: "30 Sep 2026", read: "4 min", topic: "Methods" },
    { title: "What the new vacancy data does and does not say", date: "24 Sep 2026", read: "2 min", topic: "Cities" },
    { title: "Four papers on job polarisation worth your time", date: "18 Sep 2026", read: "3 min", topic: "Labour" }
  ],

  topics: [
    { name: "Labour", n: 23 }, { name: "Housing", n: 12 }, { name: "Cities", n: 15 }, { name: "Climate", n: 9 },
    { name: "Technology", n: 18 }, { name: "Public finance", n: 11 }, { name: "Trade", n: 7 }, { name: "Sport", n: 6 }, { name: "Methods", n: 14 }
  ],

  dataset: {
    title: "Employment by wage tier, 14 economies, 1995 to 2024",
    desc: "Annual employment shares by wage tercile, harmonised across national labour force surveys.",
    rows: "420 rows", cols: "9 columns", size: "CSV, 118 KB", updated: "Updated 1 Oct 2026", licence: "CC BY 4.0", version: "v2.1",
    fields: ["country", "year", "share_low", "share_middle", "share_high", "source_survey"]
  },

  projects: [
    { title: "The World Cup money trail", deck: "Every public dollar spent on hosting since 1994, traced across nine tournaments and 68 stadiums.", status: "In progress, part 3 of 6 published", parts: 6, done: 3, topic: "Sport, Public finance" },
    { title: "Office Vacancy Tracker", deck: "A quarterly, city-level view of central business district vacancy, with a consistent definition across markets.", status: "Updated quarterly, 24 cities", parts: 0, done: 0, topic: "Cities", tool: true }
  ],

  newsletter: {
    title: "The Visinage letter",
    text: "One research piece and three charts, every other Thursday. No sponsors, no marketing.",
    placeholder: "you@example.org",
    button: "Subscribe"
  },

  footer: {
    about: "Visinage is an independent research and data publication. It is reader-funded; nothing is sponsored, and every chart links to its data.",
    cols: [
      { h: "Publication", links: ["Research", "Data", "Visuals", "Projects", "Research notes"] },
      { h: "About", links: ["About Visinage", "Methods", "Corrections", "Contact"] },
      { h: "Follow", links: ["Newsletter", "RSS", "Data licence (CC BY 4.0)"] }
    ],
    legal: "© 2026 Visinage. Text CC BY-NC 4.0; data CC BY 4.0 unless stated.",
    demo: "All figures on this page are DEMO / PLACEHOLDER DATA for design review."
  }
};
