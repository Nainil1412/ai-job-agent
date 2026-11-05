import type {Job, WorkMode} from '@ai-job-agent/shared';

export interface JobSourceConnector {
  readonly source: string;
  fetchJobs(config: Record<string, unknown>): Promise<Job[]>;
}

const safeUrl = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Only HTTPS application URLs are accepted');
  return url.toString();
};

const workModeFor = (location: string | undefined, description: string): WorkMode => {
  const value = `${location ?? ''} ${description}`.toLowerCase();
  if (value.includes('remote')) return 'remote';
  if (value.includes('hybrid')) return 'hybrid';
  if (value.includes('on-site') || value.includes('onsite') || value.includes('on site')) return 'onsite';
  return 'unknown';
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, {signal: AbortSignal.timeout(15_000), headers: {'user-agent': 'ai-job-agent/1.0'}});
  if (!response.ok) throw new Error(`Job source returned ${response.status}`);
  return response.json();
};

export class GreenhouseConnector implements JobSourceConnector {
  readonly source = 'greenhouse';

  async fetchJobs(config: Record<string, unknown>): Promise<Job[]> {
    const board = String(config.board ?? '');
    if (!/^[a-z0-9-]+$/i.test(board)) throw new Error('Invalid Greenhouse board token');
    const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`) as {jobs?: Array<Record<string, any>>};
    return (data.jobs ?? []).map((item) => {
      const description = String(item.content ?? '');
      const location = item.location?.name ? String(item.location.name) : undefined;
      const applyUrl = safeUrl(String(item.absolute_url));
      return {
        id: `greenhouse:${item.id}`,
        source: this.source,
        externalId: String(item.id),
        companyName: String(config.companyName ?? board),
        title: String(item.title ?? 'Untitled role'),
        description,
        requiredSkills: [],
        location,
        workMode: workModeFor(location, description),
        applyUrl,
        canonicalUrl: applyUrl,
        postedAt: item.updated_at ? String(item.updated_at) : undefined,
        lastSeenAt: new Date().toISOString(),
        verification: 'high_confidence' as const,
      } satisfies Job;
    });
  }
}

export class LeverConnector implements JobSourceConnector {
  readonly source = 'lever';

  async fetchJobs(config: Record<string, unknown>): Promise<Job[]> {
    const site = String(config.site ?? '');
    if (!/^[a-z0-9-]+$/i.test(site)) throw new Error('Invalid Lever site token');
    const data = await fetchJson(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`) as Array<Record<string, any>>;
    return data.map((item) => {
      const description = String(item.descriptionPlain ?? item.description ?? '');
      const location = item.categories?.location ? String(item.categories.location) : undefined;
      const applyUrl = safeUrl(String(item.hostedUrl));
      return {
        id: `lever:${item.id}`,
        source: this.source,
        externalId: String(item.id),
        companyName: String(config.companyName ?? site),
        title: String(item.text ?? 'Untitled role'),
        description,
        requiredSkills: [],
        location,
        workMode: workModeFor(location, description),
        applyUrl,
        canonicalUrl: applyUrl,
        postedAt: item.createdAt ? new Date(Number(item.createdAt)).toISOString() : undefined,
        lastSeenAt: new Date().toISOString(),
        verification: 'high_confidence' as const,
      } satisfies Job;
    });
  }
}
