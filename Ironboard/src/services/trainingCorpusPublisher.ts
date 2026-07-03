import {
  getTrainerChapterSlugs,
  getWriterChapterSlugs,
  loadTrainingCorpusManifest,
  type TrainingChapterManifestEntry,
} from "../config/trainingCorpusLoader.js";
import { validateOutboundContent } from "../validation/contentFirewall.js";
import { screenTrainingAppDocumentationParity } from "../services/trainingCorpusCollaboration.js";
import type { IronframeDocumentationBrief } from "../types/ironframeDocumentationBrief.js";
import {
  AppDocumentGatewayError,
  pushAppDocumentToIronframe,
} from "../io/appDocsGateway.js";
import {
  buildDeterministicTrainingChapter,
  buildTrainingIndexMarkdown,
  generateTrainingChapterContent,
} from "./trainingChapterGenerator.js";

export type TrainingCorpusPublishResult = {
  upsertedSlugs: string[];
  totalWords: number;
  estimatedPages: number;
  errors: string[];
  chapterDrafts: Record<string, string>;
};

function countWords(markdown: string): number {
  return markdown.split(/\s+/).filter(Boolean).length;
}

async function publishChapter(
  chapter: TrainingChapterManifestEntry,
  content: string,
  brief?: IronframeDocumentationBrief,
): Promise<string> {
  const agentRole = chapter.authorAgent === "board-trainer" ? "TRAINER" : "WRITER";
  const validation = validateOutboundContent(content, { agentRole, requireSourceReferences: true });
  if (!validation.ok) {
    throw new Error(`[ContentFirewall] ${validation.violations.join(" | ")}`);
  }

  if (brief) {
    const parityViolations = screenTrainingAppDocumentationParity(content, chapter, brief);
    if (parityViolations.length > 0) {
      throw new Error(`[AppDocParity] ${parityViolations.join(" | ")}`);
    }
  }

  const result = await pushAppDocumentToIronframe({
    relativePath: chapter.slug,
    content,
    title: chapter.title,
    readingLevel: "TRAINING",
  });

  return result.targetSlug;
}

export async function publishTrainerCorpus(
  brief: IronframeDocumentationBrief,
): Promise<TrainingCorpusPublishResult> {
  const manifest = loadTrainingCorpusManifest();
  const upsertedSlugs: string[] = [];
  const errors: string[] = [];
  const chapterDrafts: Record<string, string> = {};
  let totalWords = 0;

  const trainerChapters = manifest.chapters.filter((c) => c.authorAgent === "board-trainer");

  for (const chapter of trainerChapters) {
    try {
      const content = await generateTrainingChapterContent(chapter, brief);
      chapterDrafts[chapter.slug] = content;
      totalWords += countWords(content);
      upsertedSlugs.push(await publishChapter(chapter, content, brief));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${chapter.slug}: ${message}`);
      try {
        const fallback = buildDeterministicTrainingChapter(chapter, brief);
        chapterDrafts[chapter.slug] = fallback;
        totalWords += countWords(fallback);
        upsertedSlugs.push(await publishChapter(chapter, fallback, brief));
      } catch (fallbackError) {
        errors.push(
          `${chapter.slug} fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }
    }
  }

  try {
    const indexContent = buildTrainingIndexMarkdown(
      "LEVEL_1",
      brief,
      getTrainerChapterSlugs(manifest),
    );
    totalWords += countWords(indexContent);
    upsertedSlugs.push(
      await publishChapter(
        {
          slug: "training/LEVEL1-STUDENT-INDEX",
          title: "Level 1 Training Index — Student Track",
          track: "LEVEL_1",
          authorAgent: "board-trainer",
          primaryRoute: "/docs",
          captureRoute: "/docs",
          screenshotFile: "level-1-09-docs-hub-handbook.png",
          featureIds: ["DOCS-001"],
          navigationPath: ["Open /docs"],
          sourceAnchors: ["config/training-corpus-manifest.json"],
        },
        indexContent,
        brief,
      ),
    );
  } catch (error) {
    errors.push(`index L1: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    upsertedSlugs,
    totalWords,
    estimatedPages: Math.ceil(totalWords / manifest.wordsPerPage),
    errors,
    chapterDrafts,
  };
}

export async function publishWriterCorpus(
  brief: IronframeDocumentationBrief,
  trainerChapterDrafts: Readonly<Record<string, string>> = {},
): Promise<TrainingCorpusPublishResult> {
  const manifest = loadTrainingCorpusManifest();
  const upsertedSlugs: string[] = [];
  const errors: string[] = [];
  const chapterDrafts: Record<string, string> = {};
  let totalWords = 0;

  const writerChapters = manifest.chapters.filter((c) => c.authorAgent === "board-writer");

  for (const chapter of writerChapters) {
    try {
      const content = await generateTrainingChapterContent(chapter, brief, {
        trainerChapterDrafts,
      });
      chapterDrafts[chapter.slug] = content;
      totalWords += countWords(content);
      upsertedSlugs.push(await publishChapter(chapter, content, brief));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${chapter.slug}: ${message}`);
      try {
        const fallback = buildDeterministicTrainingChapter(chapter, brief);
        chapterDrafts[chapter.slug] = fallback;
        totalWords += countWords(fallback);
        upsertedSlugs.push(await publishChapter(chapter, fallback, brief));
      } catch (fallbackError) {
        errors.push(
          `${chapter.slug} fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        );
      }
    }
  }

  try {
    const indexContent = buildTrainingIndexMarkdown(
      "LEVEL_2",
      brief,
      getWriterChapterSlugs(manifest),
    );
    totalWords += countWords(indexContent);
    upsertedSlugs.push(
      await publishChapter(
        {
          slug: "training/LEVEL2-PRACTITIONER-INDEX",
          title: "Level 2 Training Index — GRC Practitioner Track",
          track: "LEVEL_2",
          authorAgent: "board-writer",
          primaryRoute: "/docs",
          captureRoute: "/docs",
          screenshotFile: "level-2-12-practitioner-certification.png",
          featureIds: ["DOCS-001"],
          navigationPath: ["Open /docs"],
          sourceAnchors: ["config/training-corpus-manifest.json"],
        },
        indexContent,
        brief,
      ),
    );
  } catch (error) {
    errors.push(`index L2: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    upsertedSlugs,
    totalWords,
    estimatedPages: Math.ceil(totalWords / manifest.wordsPerPage),
    errors,
    chapterDrafts,
  };
}

export async function publishCompleteTrainingManual(
  brief: IronframeDocumentationBrief,
): Promise<TrainingCorpusPublishResult> {
  const trainer = await publishTrainerCorpus(brief);
  const writer = await publishWriterCorpus(brief, trainer.chapterDrafts);
  const manifest = loadTrainingCorpusManifest();
  const totalWords = trainer.totalWords + writer.totalWords;

  return {
    upsertedSlugs: [...new Set([...trainer.upsertedSlugs, ...writer.upsertedSlugs])],
    totalWords,
    estimatedPages: Math.ceil(totalWords / manifest.wordsPerPage),
    errors: [...trainer.errors, ...writer.errors],
    chapterDrafts: { ...trainer.chapterDrafts, ...writer.chapterDrafts },
  };
}

export { AppDocumentGatewayError };
