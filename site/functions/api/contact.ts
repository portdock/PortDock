// Cloudflare Pages Function — POST /api/contact
// Turnstile 로 사람인지 확인한 뒤, Email Routing 으로 검증된 내 주소(CONTACT_TO)에 보낸다(무료).
// 필요한 설정(Cloudflare 대시보드 → Pages → 설정):
//   변수: TURNSTILE_SECRET(비밀), CONTACT_TO(받을 주소, Email Routing 에서 검증), CONTACT_FROM(예: contact@portdock.dev)
//   바인딩: send_email 이름 EMAIL (allowed_destination_addresses 에 CONTACT_TO)

interface SendEmail {
  send(m: { to: string; from: string; subject: string; text: string; }): Promise<unknown>;
}
interface Env {
  TURNSTILE_SECRET: string;
  CONTACT_TO: string;
  CONTACT_FROM: string;
  EMAIL: SendEmail;
}
interface Ctx {
  request: Request;
  env: Env;
}

const clip = (v: FormDataEntryValue | null, n: number) => String(v ?? "").trim().slice(0, n);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function onRequestPost({ request, env }: Ctx) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "bad form" });
  }
  // 숨은 칸에 값이 있으면 로봇 — 성공처럼 답하고 버린다
  if (clip(form.get("website"), 200)) return json(200, { ok: true });

  const name = clip(form.get("name"), 80);
  const email = clip(form.get("email"), 120);
  const kind = clip(form.get("kind"), 60);
  const message = clip(form.get("message"), 5000);
  const lang = clip(form.get("lang"), 2);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: "missing fields" });

  const token = clip(form.get("cf-turnstile-response"), 4096);
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: request.headers.get("CF-Connecting-IP") ?? undefined }),
  });
  const v = (await verify.json().catch(() => ({ success: false }))) as { success: boolean };
  if (!v.success) return json(403, { error: "verification failed" });

  const text = [`이름/Name: ${name}`, `메일/Email: ${email}`, `종류/Topic: ${kind}`, `언어/Lang: ${lang}`, "", message].join("\n");
  try {
    await env.EMAIL.send({ to: env.CONTACT_TO, from: env.CONTACT_FROM, subject: `[PortDock 문의] ${kind} — ${name}`, text });
  } catch {
    return json(502, { error: "mail failed" });
  }
  return json(200, { ok: true });
}
