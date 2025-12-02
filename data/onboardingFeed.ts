
import { Feed } from '../types';

export const ONBOARDING_FEED: Feed = {
    url: 'local://guide',
    title: 'RSS Flow Guide',
    description: 'Welcome guide and feature overview',
    lastUpdated: Date.now(),
    // favicon: 'https://www.google.com/s2/favicons?domain=rssflow.app', // Fallback icon
    items: [
        {
            id: 'guide-1',
            title: 'Welcome to RSS Flow / 欢迎使用 RSS Flow',
            link: 'local://guide/1',
            pubDate: new Date().toISOString(),
            content: `
                <p><strong>English</strong></p>
                <p>Welcome to RSS Flow 2.0. We built this app to be an antidote to the algorithmic noise of modern social media. It is designed for focus, privacy, and local intelligence.</p>
                <h3>Core Principles</h3>
                <ul>
                    <li><strong>Chronological Order:</strong> See news as it happens, not as an algorithm decides.</li>
                    <li><strong>Local Intelligence:</strong> Use our built-in AI to summarize long articles and generate daily digests.</li>
                    <li><strong>Privacy First:</strong> Your data lives on your device. We don't track what you read.</li>
                </ul>
                <hr/>
                <p><strong>中文</strong></p>
                <p>欢迎使用 RSS Flow 2.0。我们构建此应用的初衷是为了对抗现代社交媒体的算法噪音。它专为专注、隐私和本地智能而设计。</p>
                <h3>核心原则</h3>
                <ul>
                    <li><strong>时间顺序：</strong> 按新闻发生的时间顺序查看，不受算法干扰。</li>
                    <li><strong>本地智能：</strong> 使用内置 AI 总结长篇文章并生成每日简报。</li>
                    <li><strong>隐私至上：：</strong> 您的数据存储在设备上。我们不会追踪您的阅读内容。</li>
                </ul>
            `,
            contentSnippet: 'Introduction to RSS Flow: Focus, Privacy, and AI. / RSS Flow 介绍：专注、隐私与 AI。',
            guid: 'guide-1',
            isRead: false,
            isFavorite: false,
            author: 'RSS Flow Team'
        },
        {
            id: 'guide-2',
            title: 'AI & Gestures / AI 与手势操作',
            link: 'local://guide/2',
            pubDate: new Date(Date.now() - 100000).toISOString(),
            content: `
                <p><strong>English</strong></p>
                <h3>AI Assistant</h3>
                <p>RSS Flow includes powerful local AI integration (Requires enabling in Settings and your own API Key):</p>
                <ul>
                    <li><strong>Summarize:</strong> Tap the sparkle icon ✨ in any article to get a concise summary.</li>
                    <li><strong>Daily Digest:</strong> Open the "Daily Digest" view to see a briefing of the last 24 hours.</li>
                </ul>
                <h3>Gestures</h3>
                <ul>
                    <li><strong>Swipe Right (List):</strong> Toggle "Read Later".</li>
                    <li><strong>Swipe Left (List):</strong> Mark as Read/Unread.</li>
                    <li><strong>Tap Zones (E-Ink):</strong> Tap left/right edges to turn pages.</li>
                </ul>
                <hr/>
                <p><strong>中文</strong></p>
                <h3>AI 助手</h3>
                <p>RSS Flow 集成了强大的本地 AI 功能（需要在设置中开启并填写您自己的 API Key）：</p>
                <ul>
                    <li><strong>智能摘要：</strong> 点击文章中的闪烁图标 ✨ 即可获取简明摘要。</li>
                    <li><strong>每日简报：</strong> 打开“每日简报”视图，查看过去 24 小时的重点新闻。</li>
                </ul>
                <h3>手势操作</h3>
                <ul>
                    <li><strong>右滑（列表）：</strong> 切换“稍后阅读”。</li>
                    <li><strong>左滑（列表）：</strong> 标记为已读/未读。</li>
                    <li><strong>点击区域（墨水屏）：：</strong> 点击屏幕左/右边缘进行翻页。</li>
                </ul>
            `,
            contentSnippet: 'Learn about AI summarization and swipe gestures. / 了解 AI 摘要和手势操作。',
            guid: 'guide-2',
            isRead: false,
            isFavorite: false,
            author: 'RSS Flow Team'
        },
        {
            id: 'guide-3',
            title: 'RSSHub Integration / RSSHub 集成',
            link: 'local://guide/3',
            pubDate: new Date(Date.now() - 200000).toISOString(),
            content: `
                <p><strong>English</strong></p>
                <h3>Everything is RSS</h3>
                <p>RSS Flow integrates directly with <strong>RSSHub</strong>, allowing you to subscribe to content that doesn't normally offer RSS feeds.</p>
                <ul>
                    <li><strong>Directory:</strong> Browse thousands of supported sites (social media, government, universities, etc.) in the "RSSHub Directory".</li>
                    <li><strong>One-Click Subscribe:</strong> Add feeds directly from the directory.</li>
                    <li><strong>Custom Instance:</strong> Configure your own self-hosted RSSHub instance in Settings for better stability.</li>
                </ul>
                <hr/>
                <p><strong>中文</strong></p>
                <h3>万物皆可 RSS</h3>
                <p>RSS Flow 直接集成了 <strong>RSSHub</strong>，让您可以订阅通常不提供 RSS 源的内容。</p>
                <ul>
                    <li><strong>目录浏览：：</strong> 在“RSSHub 目录”中浏览数千个支持的站点（社交媒体、政府公告、高校动态等）。</li>
                    <li><strong>一键订阅：：</strong> 直接从目录中添加订阅源。</li>
                    <li><strong>自定义实例：：</strong> 在设置中配置您自建的 RSSHub 实例以获得更好的稳定性。</li>
                </ul>
            `,
            contentSnippet: 'Discover content beyond traditional feeds with RSSHub. / 使用 RSSHub 发现传统订阅源之外的内容。',
            guid: 'guide-3',
            isRead: false,
            isFavorite: false,
            author: 'RSS Flow Team'
        },
        {
            id: 'guide-4',
            title: 'E-Ink & Android / 墨水屏与安卓优化',
            link: 'local://guide/4',
            pubDate: new Date(Date.now() - 300000).toISOString(),
            content: `
                <p><strong>English</strong></p>
                <h3>E-Ink Mode</h3>
                <p>Designed for e-readers (Onyx Boox, Bigme, etc.):</p>
                <ul>
                    <li><strong>Pagination:</strong> Click-to-turn pages prevents ghosting.</li>
                    <li><strong>High Contrast:</strong> Pure black and white text.</li>
                    <li><strong>No Animations:</strong> Disables transitions for snappy performance.</li>
                </ul>
                <h3>Android Features</h3>
                <ul>
                    <li><strong>Immersive Mode:</strong> Transparent status bar for more screen space.</li>
                    <li><strong>Back Button:</strong> Full hardware back button support.</li>
                    <li><strong>Offline:</strong> Caches articles and images for offline reading.</li>
                </ul>
                <hr/>
                <p><strong>中文</strong></p>
                <h3>墨水屏模式</h3>
                <p>专为电子阅读器（文石、Bigme 等）设计：</p>
                <ul>
                    <li><strong>分页阅读：：</strong> 点击翻页，防止残影。</li>
                    <li><strong>高对比度：：</strong> 纯黑白文本，清晰易读。</li>
                    <li><strong>无动画：：</strong> 禁用过渡动画，响应更迅速。</li>
                </ul>
                <h3>安卓特性</h3>
                <ul>
                    <li><strong>沉浸模式：：</strong> 透明状态栏，提供更多阅读空间。</li>
                    <li><strong>返回键：：</strong> 完美支持硬件返回键导航。</li>
                    <li><strong>离线阅读：：</strong> 自动缓存文章和图片，无网也能读。</li>
                </ul>
            `,
            contentSnippet: 'E-Ink optimizations and Android native features. / 墨水屏优化与安卓原生特性。',
            guid: 'guide-4',
            isRead: false,
            isFavorite: false,
            author: 'RSS Flow Team'
        }
    ]
};
