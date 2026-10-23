import { encryptSecret, readState, signState } from "../crypto";
import { prisma } from "../db";

const PLATFORMS = ["youtube", "tiktok", "instagram"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return PLATFORMS.includes(value as Platform);
}

function originOf(req: Request) {
  return (process.env.PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/$/, "");
}

export function oauthStart(platform: Platform, req: Request) {
  const origin = originOf(req);
  const redirectUri = `${origin}/api/auth/${platform}/callback`;
  const state = signState({ platform, redirectUri });
  if (platform === "youtube") {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return { error: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET before connecting YouTube." };
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.upload");
    url.searchParams.set("state", state);
    return { url: url.toString() };
  }
  if (platform === "tiktok") {
    if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
      return { error: "Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET before connecting TikTok." };
    }
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "user.info.basic,video.publish");
    url.searchParams.set("state", state);
    return { url: url.toString() };
  }
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return { error: "Add META_APP_ID and META_APP_SECRET before connecting Instagram." };
  }
  if (!process.env.PUBLIC_BASE_URL) {
    return { error: "Instagram needs PUBLIC_BASE_URL. Meta cannot call back to a private localhost unless you tunnel it." };
  }
  const url = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  url.searchParams.set("client_id", process.env.META_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement");
  url.searchParams.set("state", state);
  return { url: url.toString() };
}

export async function oauthCallback(platform: Platform, req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state") || "";
  if (!code) throw new Error(url.searchParams.get("error_description") || "The provider did not return a code.");
  const state = readState(stateToken);
  if (state.platform !== platform) throw new Error("OAuth platform mismatch.");
  const redirectUri = state.redirectUri || `${originOf(req)}/api/auth/${platform}/callback`;

  if (platform === "youtube") {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) throw new Error("Google token exchange failed. Add this app's redirect URL in the Google Cloud console.");
    const token = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
    const channelRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const channel = (await channelRes.json()) as { items?: { id: string; snippet?: { title?: string } }[] };
    const item = channel.items?.[0];
    await prisma.socialAccount.create({
      data: {
        platform,
        displayName: item?.snippet?.title || "YouTube channel",
        externalUserId: item?.id,
        accessToken: encryptSecret(token.access_token),
        refreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null,
        expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000),
      },
    });
    return;
  }

  if (platform === "tiktok") {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || "",
        client_secret: process.env.TIKTOK_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) throw new Error("TikTok token exchange failed. Localhost redirects work in sandbox; public posts need an audit.");
    const token = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; open_id?: string };
    if (!token.access_token) throw new Error("TikTok did not return an access token.");
    const infoRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const info = (await infoRes.json()) as { data?: { user?: { display_name?: string; open_id?: string } } };
    await prisma.socialAccount.create({
      data: {
        platform,
        displayName: info.data?.user?.display_name || "TikTok account",
        externalUserId: info.data?.user?.open_id || token.open_id,
        accessToken: encryptSecret(token.access_token),
        refreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null,
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        meta: JSON.stringify({ privacy: "SELF_ONLY" }),
      },
    });
    return;
  }

  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
      client_id: process.env.META_APP_ID || "",
      client_secret: process.env.META_APP_SECRET || "",
      redirect_uri: redirectUri,
      code,
    })}`,
  );
  if (!tokenRes.ok) throw new Error("Meta token exchange failed.");
  const token = (await tokenRes.json()) as { access_token: string; expires_in?: number };
  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(token.access_token)}`);
  const pages = (await pagesRes.json()) as { data?: { id: string; name: string; access_token: string }[] };
  const page = pages.data?.[0];
  if (!page) throw new Error("No Facebook Page was found. Instagram publishing needs a Page linked to a professional account.");
  const igRes = await fetch(
    `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account,name&access_token=${encodeURIComponent(page.access_token)}`,
  );
  const ig = (await igRes.json()) as { instagram_business_account?: { id: string }; name?: string };
  if (!ig.instagram_business_account?.id) {
    throw new Error("That Facebook Page has no linked Instagram professional account.");
  }
  await prisma.socialAccount.create({
    data: {
      platform,
      displayName: ig.name || page.name || "Instagram",
      externalUserId: ig.instagram_business_account.id,
      accessToken: encryptSecret(page.access_token),
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
      meta: JSON.stringify({ pageId: ig.instagram_business_account.id, facebookPageId: page.id }),
    },
  });
}
