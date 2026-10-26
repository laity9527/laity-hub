import http from 'node:http';
import https from 'node:https';
import { XMLParser } from 'fast-xml-parser';

export type Track = { title: string; url: string; date: string };

export type FeedResponse = { status: number; body: string };

const FEED_TIMEOUT_MS = 6000;

// 刻意不用全局 fetch：undici 池化的 TLS 套接字在 astro build 退出时仍挂着，Windows 下会触发 libuv 断言导致非零退出
function getFeed(url: string, redirectsLeft = 3): Promise<FeedResponse> {
	return new Promise((resolve, reject) => {
		const target = new URL(url);
		const client = target.protocol === 'http:' ? http : https;
		const req = client.get(
			target,
			{ timeout: FEED_TIMEOUT_MS, agent: new client.Agent({ keepAlive: false }) },
			(res) => {
				const status = res.statusCode ?? 0;
				const location = res.headers.location;
				if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
					res.resume();
					getFeed(new URL(location, target).href, redirectsLeft - 1).then(resolve, reject);
					return;
				}
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () =>
					resolve({
						status,
						body: Buffer.concat(chunks).toString('utf8'),
					})
				);
				res.on('error', reject);
			}
		);
		req.on('timeout', () => req.destroy(new Error('feed timeout')));
		req.on('error', reject);
	});
}

// collapseArray:false：单条 <category> 也要保持数组形态，避免取用时形态在 object/array 之间漂移
// htmlEntities:true：默认只解 &amp; &lt; &quot; 等预定义实体，&#39;/&#x4E2D; 这类会原样留在标题里
const parser = new XMLParser({ ignoreAttributes: true, collapseArray: false, htmlEntities: true });

type RssItem = { title?: string; link?: string; pubDate?: string };

interface RssDocument {
	rss?: { channel?: { item?: RssItem | RssItem[] } };
}

// 与前后志站的展示口径一致：按 Asia/Shanghai 取日。UTC 截取会把带 +08:00 的时间戳串到前一天
const feedDate = (date: Date) =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);

// 只有一条日志时 channel.item 是对象而不是数组，两种形态都要吃
export function parseTracks(body: string, limit: number): Track[] {
	const doc = parser.parse(body) as RssDocument;
	const raw = doc?.rss?.channel?.item;
	const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
	return list
		.map((item) => {
			const link = typeof item.link === 'string' ? item.link.trim() : '';
			const pubDate = new Date(typeof item.pubDate === 'string' ? item.pubDate : NaN);
			return {
				title: typeof item.title === 'string' ? item.title.trim() : '',
				url: /^https?:\/\//i.test(link) ? link : '',
				date: Number.isNaN(pubDate.getTime()) ? '' : feedDate(pubDate),
			};
		})
		.filter((track) => track.title && track.url)
		.slice(0, limit);
}

// 拉取失败/超时/拿回的不是 RSS（比如站点的 catch-all HTML 壳）时返回空数组，由页面降级成占位文案
export async function fetchLatestTracks(feedUrl: string, limit: number): Promise<Track[]> {
	try {
		const res = await getFeed(feedUrl);
		if (res.status !== 200) return [];
		return parseTracks(res.body, limit);
	} catch {
		return [];
	}
}
