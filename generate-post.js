import "dotenv/config";
import OpenAI from "openai";
import { execSync } from "child_process";
import axios from "axios";
import readline from "readline";
import fs from "fs";

/**
 * =========================
 * Carregar Prompt Config
 * =========================
 */
function loadPromptConfig() {
  try {
    return JSON.parse(fs.readFileSync("./prompt.config.json", "utf-8"));
  } catch {
    console.error("❌ Erro ao carregar prompt.config.json");
    process.exit(1);
  }
}

const config = loadPromptConfig();

/**
 * =========================
 * Configuração Groq
 * =========================
 */
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * =========================
 * Configuração LinkedIn
 * =========================
 */
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;

if (!LINKEDIN_ACCESS_TOKEN && !config.dryRun) {
  console.error("❌ LINKEDIN_ACCESS_TOKEN não configurado.");
  process.exit(1);
}

/**
 * =========================
 * Prompt Builders
 * =========================
 */
function buildSystemPrompt(cfg) {
  return `
Você é um desenvolvedor experiente que escreve posts técnicos para o LinkedIn.

Idioma: ${cfg.language}
Público-alvo: ${cfg.audience}
Tom: ${cfg.tone}
Nível técnico: ${cfg.technicalDepth}

Regras obrigatórias:
- NÃO use buzzwords ou marketing vazio
- NÃO aborde estes temas: ${cfg.avoidTopics.join(", ")}
- NÃO invente tecnologias que não apareçam no código
- Emojis: ${cfg.useEmojis ? `permitidos (densidade ${cfg.emojiDensity})` : "não usar"}
- Bullet points: ${cfg.useBulletPoints ? `máx ${cfg.maxBulletPoints}` : "não usar"}
- Hashtags: ${
    cfg.useHashtags
      ? `modo ${cfg.hashtags.mode}, máx ${cfg.hashtags.max}`
      : "não usar"
  }

Estrutura obrigatória:
${cfg.useTitle ? "- Título curto\n" : ""}- Abertura objetiva
- Resumo técnico
${cfg.useBulletPoints ? "- Lista de mudanças\n" : ""}
${cfg.includeNextSteps ? "- Próximos passos\n" : ""}
${cfg.includeCallToAction ? "- Call to action\n" : ""}
- Hashtags no final
`;
}

function buildUserPrompt(cfg, diff) {
  return `
Objetivo do post:
Explicar alterações técnicas focadas em ${cfg.focusAreas.join(", ")}.

Detalhamento:
- Nível de detalhe: ${cfg.detailLevel}
- Tamanho do post: ${cfg.postLength}

${
  cfg.includeCallToAction
    ? `Call to action desejado: "${cfg.callToActionText}"`
    : ""
}

Diff do código:
${diff.substring(0, 2000)}
`;
}

/**
 * =========================
 * LinkedIn helpers
 * =========================
 */
async function getPersonUrn() {
  const { data } = await axios.get("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}` },
  });

  return `urn:li:person:${data.sub}`;
}

async function postToLinkedIn(authorUrn, text) {
  return axios.post(
    "https://api.linkedin.com/v2/ugcPosts",
    {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * =========================
 * Execução principal
 * =========================
 */
async function run() {
  const diff = execSync("git diff --cached").toString();

  if (!diff.trim()) {
    console.log("⚠️ Nada no stage! Use git add.");
    return;
  }

  const systemPrompt = buildSystemPrompt(config);
  const userPrompt = buildUserPrompt(config, diff);

  console.log("🤖 Gerando post com IA...");

  const chat = await groq.chat.completions.create({
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const post = chat.choices[0].message.content;

  console.log("\n--- 📝 POST GERADO ---\n");
  console.log(post);
  console.log("\n---------------------");

  if (config.dryRun) {
    console.log("🧪 Dry-run ativo. Nada será publicado.");
    return;
  }

  if (!config.autoPublish && config.requireConfirmation) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("\n🚀 Publicar no LinkedIn? (s/n): ", async (ans) => {
      if (ans.toLowerCase() === "s") {
        const urn = await getPersonUrn();
        await postToLinkedIn(urn, post);
        console.log("✅ Post publicado!");
      } else {
        console.log("❌ Publicação cancelada.");
      }
      rl.close();
    });
  } else {
    const urn = await getPersonUrn();
    await postToLinkedIn(urn, post);
    console.log("✅ Post publicado automaticamente!");
  }
}

run();
