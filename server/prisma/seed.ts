import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedTemplate = {
  id: string;
  language: string;
  level: string;
  scenario: string;
  summary: string;
  starterTurns: Array<{ role: "user" | "ai"; text: string }>;
  vocabulary: Array<{ phrase: string; translation: string }>;
};

const templates: SeedTemplate[] = [
  {
    id: "jp-beginner-casual-1",
    language: "japanese",
    level: "beginner",
    scenario: "casual-conversation",
    summary: "Meet a friend for coffee and talk about daily routines.",
    starterTurns: [
      { role: "ai", text: "今日はどうだった？仕事は忙しかった？" },
      { role: "user", text: "うん、少し忙しかったけど大丈夫。" },
    ],
    vocabulary: [
      { phrase: "忙しい (いそがしい)", translation: "busy" },
      { phrase: "大丈夫 (だいじょうぶ)", translation: "all good" },
    ],
  },
  {
    id: "jp-beginner-business-1",
    language: "japanese",
    level: "beginner",
    scenario: "business-intro",
    summary: "Introduce yourself to a new colleague and discuss roles.",
    starterTurns: [
      { role: "ai", text: "初めまして。私は佐藤です。担当は営業です。" },
      { role: "user", text: "初めまして。マイケルです。プロダクトを担当しています。" },
    ],
    vocabulary: [
      { phrase: "担当 (たんとう)", translation: "be in charge of" },
      { phrase: "営業 (えいぎょう)", translation: "sales" },
    ],
  },
  {
    id: "jp-beginner-travel-1",
    language: "japanese",
    level: "beginner",
    scenario: "travel-checkin",
    summary: "Check into a hotel and ask about breakfast time.",
    starterTurns: [
      { role: "ai", text: "いらっしゃいませ。ご予約の名前を教えてください。" },
      { role: "user", text: "ガロウェイです。2泊の予約があります。" },
    ],
    vocabulary: [
      { phrase: "予約 (よやく)", translation: "reservation" },
      { phrase: "朝食 (ちょうしょく)", translation: "breakfast" },
    ],
  },
  {
    id: "jp-intermediate-negotiation-1",
    language: "japanese",
    level: "intermediate",
    scenario: "business-negotiation",
    summary: "Negotiate delivery terms and pricing with a supplier.",
    starterTurns: [
      { role: "ai", text: "納期についてですが、御社の希望はいつまででしょうか？" },
      { role: "user", text: "できれば来月末までにお願いしたいです。" },
    ],
    vocabulary: [
      { phrase: "納期 (のうき)", translation: "delivery date" },
      { phrase: "見積もり (みつもり)", translation: "estimate" },
    ],
  },
  {
    id: "jp-intermediate-storytelling-1",
    language: "japanese",
    level: "intermediate",
    scenario: "casual-storytelling",
    summary: "Tell a story about a recent challenge and how you solved it.",
    starterTurns: [
      { role: "ai", text: "最近あった出来事で、印象に残っていることはありますか？" },
      { role: "user", text: "先週、仕事で少し困ったことがありました。" },
    ],
    vocabulary: [
      { phrase: "出来事 (できごと)", translation: "event" },
      { phrase: "解決 (かいけつ)", translation: "solution" },
    ],
  },
  {
    id: "jp-advanced-negotiation-1",
    language: "japanese",
    level: "advanced",
    scenario: "high-stakes-negotiation",
    summary: "Negotiate a multi-year contract with concessions and trade-offs.",
    starterTurns: [
      {
        role: "ai",
        text: "長期契約の条件について、両社にとって妥当な落とし所を探りたいと思います。",
      },
      { role: "user", text: "はい、まず価格の前提条件から確認させてください。" },
    ],
    vocabulary: [
      { phrase: "妥当 (だとう)", translation: "reasonable" },
      { phrase: "譲歩 (じょうほ)", translation: "concession" },
    ],
  },
  {
    id: "jp-advanced-presentation-1",
    language: "japanese",
    level: "advanced",
    scenario: "conference-presentation",
    summary: "Present product roadmap to an expert audience and handle Q&A.",
    starterTurns: [
      { role: "ai", text: "本日の発表では、次期ロードマップの要点を三点に絞ってご説明します。" },
      { role: "user", text: "まず市場環境の変化からお話しします。" },
    ],
    vocabulary: [
      { phrase: "要点 (ようてん)", translation: "key point" },
      { phrase: "質疑応答 (しつぎおうとう)", translation: "Q&A" },
    ],
  },
];

async function main() {
  for (const t of templates) {
    await prisma.template.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        language: t.language,
        level: t.level,
        scenario: t.scenario,
        summary: t.summary,
        data: {
          starterTurns: t.starterTurns,
          vocabulary: t.vocabulary,
        },
      },
      update: {
        language: t.language,
        level: t.level,
        scenario: t.scenario,
        summary: t.summary,
        data: {
          starterTurns: t.starterTurns,
          vocabulary: t.vocabulary,
        },
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
