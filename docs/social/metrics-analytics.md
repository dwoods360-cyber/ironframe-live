# Social Media Metrics & Analytics — Ironframe

## Goals

| Goal | Metric |
|------|--------|
| Awareness | Impressions, follower growth |
| Engagement | CTR, comments, saves |
| Pipeline | Demo form submits, inbound DMs qualified |
| Technical credibility | Docs hub clicks, GitHub stars (if public) |

## Platform KPIs

### LinkedIn
- Impressions per post
- Engagement rate (engagements / impressions)
- Follower net change / week
- Demo link clicks (UTM: `utm_source=linkedin`)

### X
- Profile visits
- Link clicks to docs/blog
- Thread completion (proxy: replies + bookmarks)

## UTM convention

```
?utm_source={linkedin|x|email}
&utm_medium=social
&utm_campaign={ga-launch|agent-spotlight|webinar-june}
&utm_content={post-slug}
```

## Tooling

| Tool | Use |
|------|-----|
| LinkedIn Analytics | Native page stats |
| X Analytics | Native post stats |
| Vercel Analytics | Landing page traffic from social |
| PostHog (if enabled) | Funnel: social → signup → tenant scope |

## Reporting cadence

- **Weekly:** Top 3 posts, CTR, inbound leads
- **Monthly:** Theme performance, follower growth, content backlog burn-down
- **Quarterly:** Pipeline influenced by social (CRM attribution)

## Benchmarks (initial — revise after 90 days)

| Metric | Target |
|--------|--------|
| LinkedIn engagement rate | > 2% |
| Demo CTA click rate | > 0.5% of impressions |
| Social-sourced SQLs | 2+ / month (early stage) |

## Related documents

- [Content Calendar](./content-calendar.md)
- [Marketing Plan](../marketing/marketing-plan.md)
