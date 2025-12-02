import { CapacitorHttp } from '@capacitor/core';
import { AppSettings } from '../types';

const RADAR_RULES_URL = 'https://rsshub.app/api/radar/rules';
const CACHE_KEY = 'rsshub_radar_rules';
const CACHE_TIME_KEY = 'rsshub_radar_rules_time';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface RadarRule {
    title: string;
    docs: string;
    source: string[];
    target: string | ((params: any, url: string) => string);
}

interface RadarDomainRules {
    _name: string;
    [key: string]: RadarRule[] | string;
}

export const RadarService = {
    async getRules(customInstance?: string): Promise<Record<string, RadarDomainRules>> {
        const now = Date.now();
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

        if (cached && cachedTime && (now - parseInt(cachedTime) < CACHE_DURATION)) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.warn('Failed to parse cached Radar rules', e);
            }
        }

        let targetUrl = customInstance
            ? `${customInstance.replace(/\/$/, '')}/api/radar/rules`
            : RADAR_RULES_URL;

        const doFetch = async (url: string) => {
            console.log(`[Radar] Fetching rules from ${url}...`);
            // Use CapacitorHttp which handles CORS on native, but uses fetch on web
            const response = await CapacitorHttp.get({ url });

            if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
            return response.data;
        };

        try {
            let rules;
            try {
                rules = await doFetch(targetUrl);
            } catch (e) {
                // If direct fetch fails (likely CORS on web), try a proxy
                console.warn('[Radar] Direct fetch failed, trying CORS proxy...', e);
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
                rules = await doFetch(proxyUrl);
            }

            console.log(`[Radar] Fetched ${Object.keys(rules).length} domain rules.`);

            // Cache rules
            localStorage.setItem(CACHE_KEY, JSON.stringify(rules));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());

            return rules;
        } catch (e) {
            console.error('[Radar] Failed to fetch Radar rules', e);
            // Return cached if available even if expired, otherwise empty
            if (cached) {
                console.log('[Radar] Using expired cache.');
                return JSON.parse(cached);
            }
            return {};
        }
    },

    async detect(url: string, settings: AppSettings): Promise<{ title: string; url: string; isRssHub: boolean; docs?: string }[]> {
        if (!settings.enableRadar) return [];

        // Normalize URL to get domain
        let domain = url;
        try {
            if (url.startsWith('http')) {
                domain = new URL(url).hostname;
            }
            // Strip www.
            domain = domain.replace(/^www\./, '');
        } catch (e) {
            // If invalid URL, assume it's a domain input directly
        }

        let rules;
        try {
            rules = await this.getRules(settings.rssHubInstance);
        } catch (e) {
            return [];
        }

        // Find matching domain rules
        const domainKey = Object.keys(rules).find(k => domain.endsWith(k) || k.endsWith(domain));

        if (!domainKey) return [];

        const domainRules = rules[domainKey] as RadarDomainRules;
        const results: { title: string; url: string; isRssHub: boolean; docs?: string }[] = [];
        const hubBase = settings.rssHubInstance.replace(/\/$/, '');

        // Iterate over rules for this domain
        for (const key in domainRules) {
            if (key === '_name') continue;

            const ruleList = Array.isArray(domainRules[key]) ? domainRules[key] : [domainRules[key]];

            (ruleList as RadarRule[]).forEach(rule => {
                // If we have a full URL input, try to match specific path
                if (url.startsWith('http')) {
                    if (!Array.isArray(rule.source)) return;
                    const path = new URL(url).pathname + new URL(url).search;

                    rule.source.forEach(sourcePattern => {
                        try {
                            let regexStr = sourcePattern
                                .replace(/\//g, '\\/')
                                .replace(/:[\w]+/g, '([^/]+)')
                                .replace(/\*/g, '.*');

                            if (!regexStr.includes('\\?')) {
                                regexStr += '([?#].*)?$';
                            }

                            const regex = new RegExp(`^${regexStr}`);
                            const match = path.match(regex);

                            if (match) {
                                let targetPath = rule.target;
                                if (typeof targetPath === 'string') {
                                    const paramMatches = sourcePattern.match(/:[\w]+/g);
                                    if (paramMatches && match.length > 1) {
                                        paramMatches.forEach((p, index) => {
                                            if (match[index + 1]) {
                                                targetPath = (targetPath as string).replace(p, match[index + 1]);
                                            }
                                        });
                                    }
                                    results.push({
                                        title: `[Match] ${rule.title}`,
                                        url: `${hubBase}${targetPath}`,
                                        isRssHub: true,
                                        docs: rule.docs
                                    });
                                }
                            }
                        } catch (e) { }
                    });
                } else {
                    // Just listing available rules for the domain
                    let targetPath = rule.target;
                    if (typeof targetPath === 'string') {
                        results.push({
                            title: rule.title,
                            url: `${hubBase}${targetPath}`,
                            isRssHub: true,
                            docs: rule.docs
                        });
                    }
                }
            });
        }

        return results;
    },

    async getDirectory(settings: AppSettings): Promise<{ category: string; sites: { domain: string; name: string; rules: RadarRule[] }[] }[]> {
        let rules;
        try {
            rules = await this.getRules(settings.rssHubInstance);
        } catch (e) {
            return [];
        }

        const sites: { domain: string; name: string; rules: RadarRule[]; category: string }[] = [];

        for (const domain in rules) {
            const domainRules = rules[domain] as RadarDomainRules;
            const name = domainRules._name || domain;
            const siteRules: RadarRule[] = [];

            for (const key in domainRules) {
                if (key === '_name') continue;
                const ruleList = Array.isArray(domainRules[key]) ? domainRules[key] : [domainRules[key]];
                (ruleList as RadarRule[]).forEach(r => siteRules.push(r));
            }

            if (siteRules.length > 0) {
                // Extract category from docs URL (e.g. https://docs.rsshub.app/routes/social-media)
                let category = 'other';
                const firstRule = siteRules[0];
                if (firstRule && firstRule.docs) {
                    try {
                        const match = firstRule.docs.match(/\/routes\/([^/]+)/);
                        if (match && match[1]) {
                            category = match[1];
                        }
                    } catch (e) { }
                }

                sites.push({
                    domain,
                    name,
                    rules: siteRules,
                    category
                });
            }
        }

        // Group by category
        const groups: Record<string, typeof sites> = {};
        sites.forEach(site => {
            if (!groups[site.category]) groups[site.category] = [];
            groups[site.category].push(site);
        });

        return Object.entries(groups).map(([cat, sites]) => ({
            category: cat,
            sites: sites.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        })).sort((a, b) => {
            // Put 'other' last
            if (a.category === 'other') return 1;
            if (b.category === 'other') return -1;
            return a.category.localeCompare(b.category);
        });
    }
};
