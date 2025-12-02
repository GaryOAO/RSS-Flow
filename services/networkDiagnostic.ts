
export interface DiagnosticResult {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export const runNetworkDiagnostic = async (
  targetUrl: string, 
  onUpdate: (result: DiagnosticResult) => void
) => {
  const report = (step: string, status: 'pending' | 'success' | 'error' | 'warning', message: string, details?: string) => {
    onUpdate({ step, status, message, details });
  };

  // 1. Connectivity Check
  report('Internet Connectivity', 'pending', 'Pinging httpbin.org...');
  try {
    const start = Date.now();
    await fetch('https://httpbin.org/get');
    report('Internet Connectivity', 'success', `Connected (${Date.now() - start}ms)`);
  } catch (e) {
    report('Internet Connectivity', 'error', 'Failed to reach public internet.', String(e));
    return; // Stop if offline
  }

  // 2. Direct CORS Check
  report('Direct Access (CORS)', 'pending', `Checking ${targetUrl}...`);
  try {
    const response = await fetch(targetUrl, { method: 'HEAD' });
    if (response.ok) {
      report('Direct Access (CORS)', 'success', 'Target allows direct access (CORS enabled).');
    } else {
      report('Direct Access (CORS)', 'warning', `Target reachable but returned status ${response.status}.`);
    }
  } catch (e) {
    report('Direct Access (CORS)', 'error', 'Blocked by browser (CORS) or network error.', 'This is normal for most RSS feeds. Proxies are required.');
  }

  // 3. Proxy Checks
  const proxies = [
    { name: 'Strategy: RSS2JSON (Best for Parse)', url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(targetUrl)}` },
    { name: 'Strategy: CorsProxy', url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` },
    { name: 'Strategy: AllOrigins', url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}` },
    { name: 'Strategy: CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}` },
    { name: 'Strategy: ThingProxy', url: `https://thingproxy.freeboard.io/fetch/${targetUrl}` }
  ];

  for (const proxy of proxies) {
    report(proxy.name, 'pending', 'Testing...');
    try {
      const start = Date.now();
      const res = await fetch(proxy.url);
      const time = Date.now() - start;
      
      if (res.ok) {
        const text = await res.text();
        const size = text.length;
        if (size > 50) { // RSS2JSON error messages can be short
           // Try parsing JSON if it's RSS2JSON
           if (proxy.name.includes('RSS2JSON')) {
                try {
                    const json = JSON.parse(text);
                    if (json.status === 'ok') {
                        report(proxy.name, 'success', `Working (${time}ms)`, `Found ${json.items?.length || 0} items`);
                    } else {
                        report(proxy.name, 'error', `API Error: ${json.message}`);
                    }
                } catch(e) {
                    report(proxy.name, 'warning', `Returned 200 OK but invalid JSON`, text.substring(0, 100));
                }
           } else {
               report(proxy.name, 'success', `Working (${time}ms)`, `Payload: ${size} chars`);
           }
        } else {
           report(proxy.name, 'warning', `Returned 200 OK but empty/short body (${size} chars).`, text.substring(0, 50));
        }
      } else {
        report(proxy.name, 'error', `HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      report(proxy.name, 'error', 'Request Failed', String(e));
    }
  }
};
