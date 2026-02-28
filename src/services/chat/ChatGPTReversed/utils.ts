import { sha3_512 } from 'js-sha3';

// All crypto operations use Web Crypto API (available in Chrome Extension service workers)

export const randomIP = async (): Promise<string> =>
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");

export const _randomUUID = (): string => self.crypto.randomUUID();

const simulated = {
    agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
    platform: "Windows",
    mobile: "?0",
    ua: 'Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132',
};

export async function simulateBypassHeaders({
    accept,
    spoofAddress = false,
    preOaiUUID,
}: {
    accept: string;
    spoofAddress?: boolean;
    preOaiUUID?: string;
}): Promise<Record<string, string>> {
    const ip = await randomIP();
    const uuid = _randomUUID();

    return {
        accept: accept,
        "Content-Type": "application/json",
        "cache-control": "no-cache",
        Referer: "https://chatgpt.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "oai-device-id": preOaiUUID || uuid,
        "oai-language": "en",
        "User-Agent": simulated.agent,
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": `"${simulated.ua}"`,
        "sec-ch-ua-mobile": simulated.mobile,
        "sec-ch-ua-platform": `"${simulated.platform}"`,
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        ...(spoofAddress
            ? {
                "X-Forwarded-For": ip,
                "X-Originating-IP": ip,
                "X-Remote-IP": ip,
                "X-Remote-Addr": ip,
                "X-Host": ip,
                "X-Forwarded-Host": ip,
                Forwarded: `for=${ip}`,
                "True-Client-IP": ip,
                "X-Real-IP": ip,
            }
            : {}),
    };
}

/**
 * Solve the sentinel challenge using SHA3-512 (js-sha3 library).
 * ChatGPT's Sentinel PoW specifically requires SHA3-512.
 */
export async function solveSentinelChallenge(seed: string, difficulty: string): Promise<string> {
    const cores = [8, 12, 16, 24];
    const screens = [3000, 4000, 6000];

    const core = cores[Math.floor(Math.random() * cores.length)];
    const screen = screens[Math.floor(Math.random() * screens.length)];

    const now = new Date(Date.now() - 8 * 3600 * 1000);
    const parseTime = now.toUTCString().replace("GMT", "GMT+0100 (Central European Time)");

    const config: any[] = [core + screen, parseTime, 4294705152, 0, simulated.agent];

    const diffLen = difficulty.length / 2;

    for (let i = 0; i < 100000; i++) {
        config[3] = i;
        const jsonData = JSON.stringify(config);
        // Encode to base64 using btoa (browser-compatible)
        const base = btoa(unescape(encodeURIComponent(jsonData)));
        // Hash using SHA3-512 (exact algorithm ChatGPT requires)
        const hashHex = sha3_512(seed + base);

        if (hashHex.substring(0, diffLen) <= difficulty) {
            return "gAAAAAB" + base;
        }
    }

    const fallbackBase = btoa(unescape(encodeURIComponent(`"${seed}"`)));
    return "gAAAAABwQ8Lk5FbGpA2NcR9dShT6gYjU7VxZ4D" + fallbackBase;
}

export async function generateFakeSentinelToken() {
    const prefix = "gAAAAAC";

    const config = [
        Math.floor(Math.random() * (6000 - 3000) + 3000),
        new Date().toUTCString().replace("GMT", "GMT+0100 (Central European Time)"),
        4294705152,
        0,
        simulated.agent,
        "de",
        "de",
        401,
        "mediaSession",
        "location",
        "scrollX",
        randomFloat(1000, 5000),
        self.crypto.randomUUID(),
        "",
        12,
        Date.now(),
    ];

    const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(config))));

    return prefix + base64;
}

function randomFloat(min: number, max: number) {
    return (Math.random() * (max - min) + min).toFixed(4);
}
