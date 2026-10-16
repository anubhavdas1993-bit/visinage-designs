/* Round two, Phase B: shared placeholder content added to window.VISINAGE (load after lib/content.js).
   Everything numerical here is DEMO / PLACEHOLDER DATA and must be labelled as such wherever it appears. */
(function () {
  const V = window.VISINAGE;

  /* The radar: eight trending topics for today. movement = change in a composite attention score over 24 h (demo).
     spark = 24 hourly values (demo). status: watching | picked | published. */
  V.radar = {
    date: "8 October 2026",
    lastRefresh: "09:40",
    refreshesToday: 3,
    nextRefresh: "13:00",
    sourcesPolled: 14,
    collectors: ["GDELT", "Wikipedia pageviews", "Reddit", "Hacker News", "RSS from 9 outlets"],
    items: [
      { rank: 1, topic: "AI and entry-level hiring", movement: 312, direction: "up", firstSeen: "6 Oct, 14:10", topicTag: "Labour",
        sources: ["GDELT", "Hacker News", "FT RSS", "Reddit r/cscareerquestions"], status: "picked",
        spark: [12,14,13,18,22,26,31,38,44,52,61,70,84,96,110,128,150,171,196,224,251,280,298,312],
        note: "Three graduate-hiring surveys published in 48 hours; the claim that junior roles are vanishing is outrunning the data." },
      { rank: 2, topic: "Stadium subsidies, new NFL deal", movement: 238, direction: "up", firstSeen: "7 Oct, 08:30", topicTag: "Public finance",
        sources: ["GDELT", "Reddit r/urbanplanning", "Guardian RSS"], status: "published",
        spark: [40,41,43,42,45,48,52,60,71,84,96,110,124,139,150,163,178,190,201,212,220,228,233,238],
        publishedAs: "Who wins when a stadium gets built", publishedDate: "15 Sep 2026", radarDate: "3 Sep" },
      { rank: 3, topic: "Office-to-housing conversions", movement: 171, direction: "up", firstSeen: "5 Oct, 19:45", topicTag: "Cities",
        sources: ["Wikipedia pageviews", "GDELT", "Bloomberg RSS"], status: "published",
        spark: [60,62,61,64,66,70,75,80,86,92,99,105,112,120,127,134,140,147,153,158,162,166,169,171],
        publishedAs: "Remote work and the office-vacancy wave", publishedDate: "2 Oct 2026", radarDate: "24 Sep" },
      { rank: 4, topic: "Four-day week trials", movement: 126, direction: "up", firstSeen: "8 Oct, 06:05", topicTag: "Labour",
        sources: ["Reddit r/antiwork", "Hacker News", "BBC RSS"], status: "watching",
        spark: [20,20,21,21,22,24,25,27,30,34,38,44,50,58,66,74,82,90,98,106,112,118,122,126] },
      { rank: 5, topic: "Grocery margins and greedflation", movement: 98, direction: "up", firstSeen: "4 Oct, 11:20", topicTag: "Macroeconomics",
        sources: ["GDELT", "Reddit r/economics", "NYT RSS"], status: "picked",
        spark: [50,52,55,54,58,60,63,66,70,72,75,78,80,83,85,87,89,91,93,95,96,97,98,98] },
      { rank: 6, topic: "Heat and labour productivity", movement: 64, direction: "up", firstSeen: "7 Oct, 16:50", topicTag: "Climate",
        sources: ["Wikipedia pageviews", "GDELT", "Nature RSS"], status: "watching",
        spark: [10,10,11,12,12,14,15,17,19,22,25,28,32,36,40,44,48,52,55,58,60,62,63,64] },
      { rank: 7, topic: "Airline fuel tax in the EU ETS", movement: 41, direction: "up", firstSeen: "6 Oct, 09:15", topicTag: "Climate",
        sources: ["GDELT", "Politico RSS"], status: "watching",
        spark: [30,31,31,32,33,33,34,35,36,37,38,39,40,41,41,42,42,41,41,41,41,41,41,41] },
      { rank: 8, topic: "Rent caps", movement: -37, direction: "down", firstSeen: "29 Sep, 10:00", topicTag: "Housing",
        sources: ["Reddit r/housing", "GDELT"], status: "watching",
        spark: [120,118,117,115,112,110,108,105,102,100,98,96,95,93,91,90,89,88,87,86,85,84,84,83] }
    ],
    rawHeadlines: [
      "Graduate job postings fall 18% year on year, survey says", "City council approves $850m stadium bond", "Former office tower to become 320 flats",
      "Four-day week pilot reports no loss of output", "Supermarket margins under scrutiny as prices stay high", "Heatwave cut construction hours by a fifth",
      "Brussels weighs kerosene levy", "Rent-cap bill stalls in committee", "Entry-level roles first to go in AI adoption, says report",
      "Stadium deal promises 4,000 jobs; economists doubt it", "Conversion costs run to $600 per square foot", "Thirty firms extend four-day trial"
    ],
    howItWorks: "Scheduled collectors pull from sources that allow it. An agent scores and deduplicates the results a few times a day. The radar is public; what happens next, on the desk, is not."
  };

  /* Video module: one explainer and three shorts. DEMO. */
  V.video = {
    lead: { title: "Why the middle got hollowed out, in four minutes", duration: "4:12", piece: "Where the middle-wage jobs went", date: "6 Oct 2026",
            chapters: ["The one line", "Fourteen countries, one shape", "What automation does and does not explain", "What to do with this"] },
    shorts: [
      { title: "San Francisco offices: 6.1% to 34.2%", duration: "0:38", piece: "Remote work and the office-vacancy wave" },
      { title: "A cheap flight's hidden subsidy, per seat", duration: "0:45", piece: "The real cost of a cheap flight" },
      { title: "Who paid for the stadium", duration: "0:52", piece: "Who wins when a stadium gets built" }
    ]
  };

  /* Three questions this week: one question, one chart, one answer. DEMO. */
  V.questions = [
    { q: "Did automation hollow out the middle?", a: "It explains less than half of the fall; trade and the shift to services account for most of the rest.", chart: "tiers", piece: "Where the middle-wage jobs went" },
    { q: "Has office vacancy peaked?", a: "Not in San Francisco, Houston or Toronto; London and Paris have been flat for four quarters.", chart: "vacancy", piece: "Remote work and the office-vacancy wave" },
    { q: "How much of 2021 to 2023 inflation went to profit?", a: "Between a fifth and a half, depending on the economy; most in Australia, least in Japan.", chart: "profits", piece: "How much of inflation was profit?" }
  ];

  /* The article opener for the lead piece: file block, two speeds, narrator steps, first paragraphs. DEMO. */
  V.article = {
    kicker: "Research / Labour markets",
    method: "Harmonised labour force surveys, 14 economies, employment shares by wage tercile",
    data: "Employment by wage tier, 14 economies, 1995 to 2024 (v2.1, CC BY 4.0)",
    radarLine: "Started on the radar, 3 October",
    twoSpeeds: {
      numbers: [
        { value: "47.2%", label: "of jobs are middle-wage today, down from 56.0% in 1995" },
        { value: "14 of 14", label: "advanced economies saw the middle lose share" },
        { value: "< 1/2", label: "of the fall is explained by automation measures" }
      ],
      viewpoint: "The standard story says machines ate the middle. The data says something messier: the middle shrank everywhere, at a similar pace, in economies that automated fast and in economies that barely automated at all. Whatever did this was not mainly robots."
    },
    steps: [
      { title: "The middle has lost share every year since 1995", text: "Across fourteen advanced economies, middle-wage work went from 56.0% of employment to 47.2%. The line never turns up. Not once in thirty years.", state: "highlight-middle", year: 1995 },
      { title: "The crisis sped it up", text: "The decline doubled in pace after 2008. Firms that cut middle-wage jobs in the recession did not hire them back in the recovery.", state: "annotate-2009", year: 2009 },
      { title: "Below half, and still falling", text: "In 2016 the middle-wage share fell under 50% for the first time. The high-wage share, not the low-wage share, took most of what it lost.", state: "annotate-2016", year: 2016 },
      { title: "The high end absorbed most of it", text: "High-wage work rose from 24.5% to 30.4%. Low-wage work rose by less than three points. The hollowing out is mostly an upgrade, not a collapse.", state: "highlight-high", year: 2024 }
    ],
    body: [
      "Every account of the labour market since the 1990s has a villain, and in most of them the villain is a machine. Routine jobs, the story goes, were the ones computers could do, and the computers did them. The middle of the wage distribution, where routine clerical and production work lived, emptied out. It is a tidy story. The problem is that the data behind it are far less tidy than the story.",
      "This piece uses harmonised labour force surveys for fourteen advanced economies to track the share of employment in low-, middle- and high-wage work from 1995 to 2024. The middle fell in every one of them. That part of the story holds. What does not hold is the explanation: the countries that automated fastest, by any of the three measures we test, did not lose middle-wage jobs any faster than the countries that automated slowly.",
      "Three things happened at once. Trade exposure grew, the service share of employment rose, and the wage premium for degrees widened. Each of these moves the middle on its own; together they explain more than twice what the automation measures explain. The sections that follow take them one at a time, with the same chart redrawn for each.",
      "A word on what this piece does not do. It does not estimate what would have happened without computers; nobody can. It asks a narrower question: given the thirty years we actually had, what moved with the middle-wage share and what did not."
    ],
    chartNotes: "Wage tiers are terciles of the national hourly wage distribution in 1995, held fixed and deflated. Shares are of total employment, not hours. Country weights are equal.",
    related: ["A short history of the 40-hour week", "How much of inflation was profit?", "The same decline, twelve times over"]
  };

  /* Topic hues: one hue per topic, shared by all directions; light-ground and dark-ground variants.
     To be validated for colour-vision deficiency at the design lock. */
  V.topicHues = {
    light: { "Labour": "#D9481F", "Housing": "#B58900", "Cities": "#0D7FA3", "Climate": "#1B8A5A", "Technology": "#7B4FB3", "Public finance": "#2742D6", "Trade": "#C2452D", "Sport": "#0F9BB8", "Methods": "#6B6B70", "Macroeconomics": "#8C5A14" },
    dark:  { "Labour": "#FF6B4A", "Housing": "#FFC14D", "Cities": "#4DB3E6", "Climate": "#3DD6A0", "Technology": "#B98CFF", "Public finance": "#6C86FF", "Trade": "#FF8A6B", "Sport": "#5BE0FF", "Methods": "#A9ACB3", "Macroeconomics": "#E0A24D" }
  };

  /* Photograph assignments (placeholders from assets/img; see assets/img/credits.json). Replace before production. */
  V.photos = {
    lead: "office-people.jpg", cities: "city-aerial.jpg", climate: "highway-aerial.jpg", macro: "industrial.jpg", publicFinance: "crowd-lights.jpg",
    labour: "desk-hands.jpg", housing: "london-night.jpg", technology: "times-square.jpg", manhattan: "manhattan.jpg", about: "stairs-figure.jpg", turbines: "turbines-road.jpg"
  };

  V.demoLabel = "DEMO DATA";
})();
