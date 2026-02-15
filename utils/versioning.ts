export type VersioningResult = {
  archivedPath: string;
  versionedFileName: string;
  versionNumber: number;
};

function stripExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  if (index === -1) {
    return { base: fileName, ext: "" };
  }

  return {
    base: fileName.slice(0, index),
    ext: fileName.slice(index),
  };
}

function readVersion(baseName: string) {
  const match = baseName.match(/_v(\d+)$/i);
  if (!match) {
    return { cleanBase: baseName, version: 1 };
  }

  return {
    cleanBase: baseName.slice(0, -match[0].length),
    version: Number(match[1]),
  };
}

export function archiveAndVersionDocument(currentPath: string, incomingFileName: string): VersioningResult {
  const currentSegments = currentPath.split("/").filter((segment) => segment.length > 0);
  const currentFileName = currentSegments[currentSegments.length - 1] || incomingFileName;
  const parentPath = currentSegments.slice(0, -1).join("/");

  const currentParts = stripExtension(currentFileName);
  const currentVersionInfo = readVersion(currentParts.base);
  const nextVersion = currentVersionInfo.version + 1;

  const incomingParts = stripExtension(incomingFileName);
  const incomingVersionInfo = readVersion(incomingParts.base);
  const baseName = incomingVersionInfo.cleanBase || currentVersionInfo.cleanBase;
  const ext = incomingParts.ext || currentParts.ext || ".pdf";
  const versionedFileName = `${baseName}_v${nextVersion}${ext}`;

  const archivedPath = `/${parentPath}/archive/${currentFileName}`.replace(/\/\/+/, "/");

  return {
    archivedPath,
    versionedFileName,
    versionNumber: nextVersion,
  };
}
