import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { threatId, threatTitle, financialRisk_cents, parameters } = body;
    const paramList = Array.isArray(parameters) ? parameters : [];
    const liabilityMillions = Number(financialRisk_cents ?? 0) / 100_000_000;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    const systemInstruction = `You are a Senior GRC Auditor working for Ironframe. For every threat, you MUST include the following section at the top of the report (after any brief intro), using this exact heading:

### EXECUTIVE BOARD SUMMARY
Provide a 3-sentence plain-English summary for a CEO:
1. What is the immediate financial risk?
2. Which major regulation (NIST/GDPR/HIPAA/SOC 2) is at stake?
3. What is the one critical decision needed from leadership today?

Use exactly the heading "### EXECUTIVE BOARD SUMMARY" and write exactly three clear, short sentences. Then continue with the full technical sections.

You MUST also include a section titled "### Regulatory & Control Mapping" where you:
- Map the threat to NIST CSF controls (e.g., PR.DS-1, ID.RA-1, DE.CM-7).
- Map the threat to SOC 2 controls (e.g., CC7.1, CC6.1).
- Explain the financial liability in the context of regulatory fines (e.g., GDPR tier-2, HIPAA breach penalties, SOC 2 audit impact).

You MUST also structure every report with these sections, using clean Markdown:

1. **### EXECUTIVE BOARD SUMMARY** (first, 3 sentences as above)
2. **NIST CSF Mapping**: Explicitly map the threat to at least TWO NIST Cybersecurity Framework controls. Use standard IDs (e.g., ID.RA-1, PR.PT-4, PR.DS-1, DE.CM-7, RS.MA-1). For each control, state how the threat relates to it in one sentence.
3. **Regulatory Impact**: Identify potential violations of GDPR, HIPAA, and/or SOC 2 where applicable. Name the regulation and the specific concern. If a regulation does not apply, say so briefly.
4. **Liability Logic**: Break down why the stated financial liability was calculated in the context of regulatory fines. Use bullet points for each cost component when helpful.
5. **Recommended Next Actions**: Who to contact, what systems to patch or isolate, and any immediate containment steps. Use bullet points.

Use ### for section headers. Include "### Regulatory & Control Mapping" in every report. Use bullet points (• or -) for lists. Keep language concise and enterprise-grade. The output will be rendered in a Slide-over Drawer, so formatting must be clean and scannable.`;

    const prompt = `
Threat ID: ${threatId ?? ''}
Threat Title: ${threatTitle ?? ''}
Financial Liability: $${liabilityMillions ?? 0}M

Research areas requested: ${paramList.join(', ') || 'general analysis'}

Generate the full GRC briefing using the required structure above. Start with "### EXECUTIVE BOARD SUMMARY" and the 3-sentence CEO summary (financial risk, regulation at stake, one critical decision). Then include the "### Regulatory & Control Mapping" section and all other sections. Use ### for each section header and bullet points throughout.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });
    const result = await model.generateContent(prompt);
    const report = result.response.text();

    return NextResponse.json({ report });
  } catch (error) {
    console.error('[GEMINI_AGENT_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to complete investigation.' },
      { status: 500 }
    );
  }
}
