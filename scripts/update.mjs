import fs from "fs";

const sources = [
  ["Reuters", 'site:reuters.com/business/healthcare-pharmaceuticals pharma biotech FDA'],
  ["STAT", 'site:statnews.com biotech pharma FDA'],
  ["Fierce Biotech", 'site:fiercebiotech.com biotech clinical trial FDA'],
  ["Endpoints News", 'site:endpts.com biotech pharma FDA'],
  ["Nature Medicine", 'site:nature.com/nm "Nature Medicine" medicine research']
];

const fallbackVocab = [
  ["clinical trial","临床试验","drug development 高频词"],
  ["regulatory","监管的","regulatory review / approval 常见"],
  ["readout","数据公布","trial readout"],
  ["pipeline","研发管线","R&D pipeline"],
  ["efficacy","疗效","efficacy and safety"],
  ["licensing","授权合作","business development 高频"],
  ["biomarker","生物标志物","translational medicine 常见"]
];

function decode(s = "") {
  return s.replaceAll("&amp;","&").replaceAll("&quot;",'"').replaceAll("&#39;","'").replaceAll("&lt;","<").replaceAll("&gt;",">");
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? decode(m[1].replace(/^<!\\[CDATA\\[|\\]\\]>$/g, "")) : "";
}

function stripSource(title) {
  return title.replace(/\s+-\s+[^-]{2,80}$/, "").trim();
}

function categoryFor(title) {
  const t = title.toLowerCase();
  if (/fda|approval|regulat/.test(t)) return "Regulatory / Approval";
  if (/deal|license|partnership|acqui/.test(t)) return "Business / Licensing";
  if (/trial|phase|study|data|readout/.test(t)) return "Clinical / Data";
  return "Research Frontier";
}

function buildContent(title) {
  const t = title.toLowerCase();
  let focus = "核心是这条新闻反映的一项医药行业动态。";
  let why = "它的重要性在于，这类变化通常会影响研发、监管或商业节奏。";
  let view = "同行不会只看 headline，而会继续追问数据、流程和竞争格局。";
  let sub = "弦外之音往往是：表面的事件背后，折射出更深的行业变化。";
  let career = "对准备进入医药行业的人来说，它能帮助你建立判断框架和英文表达。";
  let qs = [
    "这件事会影响谁？",
    "下一步最值得观察什么？",
    "如果你在公司内部，你还会追问什么？"
  ];

  if (/trial|phase|study|data|readout/.test(t)) {
    focus = "核心是临床试验推进、设计或数据变化。";
    why = "临床效率和数据质量会直接影响项目价值、合作前景和时间线。";
    view = "同行会看终点、患者人群、时间线、统计学显著性和后续 readout。";
    sub = "真正重要的不只是结果本身，而是结果能否被稳定解释。";
    career = "适合临床、医学、咨询和投资方向的学习者建立专业判断。";
    qs = ["主要终点是否有说服力？","后续 readout 会解决哪些不确定性？","时间线变化会如何影响竞争格局？"];
  } else if (/fda|approval|regulat/.test(t)) {
    focus = "核心是监管审批、政策动作或审评流程变化。";
    why = "监管变化会重新定义项目推进速度和商业机会。";
    view = "同行会看这项动作会影响哪些公司、流程与竞争位置。";
    sub = "监管消息往往是产业竞争和资源流向变化的前奏。";
    career = "有助于建立注册、临床运营与行业格局之间的连接。";
    qs = ["这会影响哪些公司或赛道？","是一次性动作还是长期趋势？","企业需要如何调整策略？"];
  } else if (/deal|license|partnership|acqui/.test(t)) {
    focus = "核心是授权交易、合作或资本动作。";
    why = "交易活动能反映市场情绪、资产偏好和资源配置方式。";
    view = "同行会重点看交易结构、首付款、里程碑设计和战略契合度。";
    sub = "headline 里的金额往往不是重点，真正的信息常藏在结构设计里。";
    career = "适合训练 BD、战略、咨询和投资语言。";
    qs = ["买方真正看中了什么？","交易结构是否反映议价能力变化？","这笔交易会如何影响后续竞争？"];
  } else {
    focus = "核心是基础或转化研究领域的新发现。";
    why = "今天的科研前沿，可能成为明天的靶点、biomarker 和创新方向。";
    view = "同行会把研究放进机制—靶点—转化—临床潜力的链条里理解。";
    sub = "研究价值通常不会立刻兑现，而会在几年内通过产业化路径慢慢显现。";
    career = "适合建立你对早研、转化医学和创新方向的敏感度。";
    qs = ["这个发现能否转化为靶点？","有没有 biomarker 价值？","距离真正临床应用还有多远？"];
  }

  return { focus, why, view, sub, career, qs };
}

function vocabFor(title) {
  const t = title.toLowerCase();
  const out = [];
  for (const [word, zh, note] of fallbackVocab) {
    if (out.length >= 5) break;
    if (t.includes(word.toLowerCase()) || out.length < 5) {
      out.push({ word, zh, note });
    }
  }
  return out.slice(0, 5);
}

async function fetchOne(source, query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 BioLinguaDaily/1.0" } });
  const xml = await r.text();
  const item = (xml.match(/<item>[\s\S]*?<\/item>/i) || [""])[0];
  const title = stripSource(tag(item, "title"));
  const link = tag(item, "link");
  const c = buildContent(title);
  return {
    source,
    category: categoryFor(title),
    title,
    url: link,
    zh_summary: `${c.focus} 精读时先找主语和核心动词，再问：What happened? Why does it matter? What could happen next?`,
    news_focus: c.focus,
    why_it_matters: c.why,
    industry_view: c.view,
    subtext: c.sub,
    peer_questions: c.qs,
    career_value: c.career,
    risk_watch: /trial|phase|study|data|readout/i.test(title) ? "继续关注终点、样本量、亚组与后续验证，避免只看 headline 下结论。" : "继续关注执行进度、外部环境与后续验证，避免把单一事件当作最终结论。",
    business_lens: /deal|license|partnership|acqui/i.test(title) ? "关注交易结构、资产质量和战略契合度，而不是只看 headline 金额。" : "观察这件事是否会改变资产价值、合作意愿、研发时间线或资源配置。",
    role_tags: categoryFor(title).includes("Business") ? ["BD","Strategy","Consulting"] : categoryFor(title).includes("Regulatory") ? ["Regulatory","Clinical Ops","Strategy"] : categoryFor(title).includes("Clinical") ? ["Clinical","Medical Affairs","Strategy"] : ["Discovery","Translational Medicine","MSL"],
    retell_en: /fda|approval|regulat/i.test(title) ? "This regulatory development matters because it could reshape execution timelines and competitive positioning." : /deal|license|partnership|acqui/i.test(title) ? "This deal matters because it reveals how companies are valuing assets and allocating capital in the current market." : /trial|phase|study|data|readout/i.test(title) ? "This clinical update matters because the quality and interpretation of the data may influence the program’s next strategic decision." : "This research matters because mechanistic insight may eventually shape target discovery and translational strategy.",
    vocab: vocabFor(title).map(v => ({...v, extension: `Try using “${v.word}” in a one-sentence summary of today’s article.`}))
  };
}

function inferTags(items) {
  const tags = new Set();
  items.forEach(x => {
    const t = `${x.category} ${x.title}`.toLowerCase();
    if (/regulat|approval|fda/.test(t)) tags.add("Regulatory");
    if (/trial|phase|data|readout/.test(t)) tags.add("Clinical Trials");
    if (/deal|license|partnership|acqui/.test(t)) tags.add("BD & Licensing");
    if (/oncology|cancer/.test(t)) tags.add("Oncology");
    if (/research|nature|mechanism|biomarker/.test(t)) tags.add("Translational Research");
  });
  return Array.from(tags).slice(0, 6);
}

(async () => {
  const date = new Date().toISOString().slice(0,10);
  const items = [];
  for (const [source, q] of sources) {
    try { items.push(await fetchOne(source, q)); }
    catch (e) { console.error(source, e); }
  }
  if (!items.length) process.exit(1);

  const temperatureScore = Math.min(80, 50 + items.length * 4);
  const data = {
    date,
    daily_brief: "今日导读：用事实—意义—同行视角—风险—职业价值五层结构阅读医药前沿。",
    daily_signals: [
      "先识别今天最重要的监管或临床信号。",
      "再观察交易与资产价值如何变化。",
      "最后把科研发现放进转化和职业视角里理解。"
    ],
    sector_tags: inferTags(items),
    industry_temperature: {
      score: temperatureScore,
      label: temperatureScore >= 65 ? "偏活跃" : "中性偏活跃",
      note: "今日内容由 5 个来源自动抓取生成，重点覆盖监管、临床、交易与研究前沿。"
    },
    items
  };

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(`data/${date}.json`, JSON.stringify(data, null, 2));

  let manifest = { dates: [] };
  try { manifest = JSON.parse(fs.readFileSync("data/manifest.json", "utf8")); } catch {}
  if (!manifest.dates.includes(date)) manifest.dates.push(date);
  manifest.dates = manifest.dates.sort().slice(-3650);
  fs.writeFileSync("data/manifest.json", JSON.stringify(manifest, null, 2));

  console.log("saved", date, items.length);
})();
