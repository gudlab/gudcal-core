import { promises as fs } from "fs";
import path from "path";
import minimist from "minimist";

const args = minimist(process.argv.slice(2));
const mode = args["blog"] ? "blog" : args["docs"] ? "docs" : "all";

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Function to delete or update specific lines from a file
const manageLinesInFile = async (
  action,
  filePath,
  startLine,
  endLine,
  updatedContent = "",
) => {
  if (!(await fileExists(filePath))) {
    console.log(`File ${filePath} does not exist.`);
    return;
  }

  try {
    const data = await fs.readFile(filePath, "utf8");
    const lines = data.split("\n");

    if (endLine === null || endLine === undefined) {
      endLine = startLine;
    }

    if (action === "update") {
      lines.splice(startLine - 1, endLine - startLine + 1, updatedContent);
    } else if (action === "remove") {
      lines.splice(startLine - 1, endLine - startLine + 1);
    } else {
      throw new Error('Invalid action. Use "update" or "remove".');
    }

    await fs.writeFile(filePath, lines.join("\n"), "utf8");

    const relativePath = path.basename(filePath);
    if (startLine === endLine) {
      console.log(
        `${relativePath} : ${action === "update" ? "Updated" : "Removed"} line ${startLine}`,
      );
    } else {
      console.log(
        `${relativePath} : ${action === "update" ? "Updated" : "Removed"} lines ${startLine} to ${endLine}`,
      );
    }
  } catch (err) {
    console.error(`Error modifying file ${filePath}:`, err);
  }
};

const deleteFolderRecursive = async (folderPath) => {
  if (!(await fileExists(folderPath))) {
    console.log(`${folderPath} does not exist.`);
    return;
  }

  const stat = await fs.stat(folderPath);
  if (stat.isDirectory()) {
    const files = await fs.readdir(folderPath);
    await Promise.all(
      files.map((file) => deleteFolderRecursive(`${folderPath}/${file}`)),
    );
    await fs.rmdir(folderPath);
  } else {
    await fs.unlink(folderPath);
  }
};

(async () => {
  if (!mode) return;

  const appDir = path.join(process.cwd(), "app");
  const configDir = path.join(process.cwd(), "config");
  const componentsDir = path.join(process.cwd(), "components");
  const contentDir = path.join(process.cwd(), "content");
  const contentlayerPath = path.join(process.cwd(), "contentlayer.config.ts");
  const nextConfigPath = path.join(process.cwd(), "next.config.js");
  const staticDir = path.join(process.cwd(), "public", "_static");
  const typesDir = path.join(process.cwd(), "types");

  switch (mode) {
    case "blog":
      console.log("Deleting blog-related content only\n");

      // contentlayer.config.ts
      // Line 117: documentTypes: [Page, Doc, Post], → remove Post
      await manageLinesInFile('update', contentlayerPath, 117, null, "  documentTypes: [Page, Doc],");
      // Lines 51-97: export const Post = defineDocumentType(...)
      await manageLinesInFile('remove', contentlayerPath, 51, 97);

      // docs.ts
      // Lines 34-38: Blog sidebar entry in Configuration section
      await manageLinesInFile('remove', path.join(configDir, "docs.ts"), 34, 38);
      // Lines 5-8: Blog entry in mainNav
      await manageLinesInFile('remove', path.join(configDir, "docs.ts"), 5, 8);

      // marketing.ts
      // Lines 5-8: Blog entry in mainNav
      await manageLinesInFile('remove', path.join(configDir, "marketing.ts"), 5, 8);

      // remove folders & files
      await deleteFolderRecursive(path.join(appDir, "(marketing)", "(blog-post)"));
      await deleteFolderRecursive(path.join(appDir, "(marketing)", "blog"));
      await deleteFolderRecursive(path.join(componentsDir, "content", "author.tsx"));
      await deleteFolderRecursive(path.join(componentsDir, "content", "blog-card.tsx"));
      await deleteFolderRecursive(path.join(componentsDir, "content", "blog-header-layout.tsx"));
      await deleteFolderRecursive(path.join(componentsDir, "content", "blog-posts.tsx"));
      await deleteFolderRecursive(path.join(contentDir, "blog"));
      await deleteFolderRecursive(path.join(contentDir, "docs", "configuration", "blog.mdx"));
      await deleteFolderRecursive(path.join(configDir, "blog.ts"));
      await deleteFolderRecursive(path.join(staticDir, "avatars"));

      console.log("\nDone.");
      break;

    case "docs":
      console.log("Deleting docs-related content only\n");

      // contentlayer.config.ts
      // Line 117: documentTypes: [Page, Doc, Post], → remove Doc
      await manageLinesInFile('update', contentlayerPath, 117, null, "  documentTypes: [Page, Post],");
      // Lines 31-49: export const Doc = defineDocumentType(...)
      await manageLinesInFile('remove', contentlayerPath, 31, 49);

      // hero-landing.tsx
      // Line 37: href="/docs" → href="/login"
      await manageLinesInFile('update', path.join(componentsDir, "sections", "hero-landing.tsx"), 37, null, '            href="/login"');
      // Line 44: <span>Installation Guide</span> → <span>Go to Login Page</span>
      await manageLinesInFile('update', path.join(componentsDir, "sections", "hero-landing.tsx"), 44, null, "            <span>Go to Login Page</span>");

      // mobile-nav.tsx (operations go bottom-to-top to preserve line numbers)
      // Lines 124-129: DocsSidebarNav conditional block
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "mobile-nav.tsx"), 124, 129);
      // Lines 21-29: selectedLayout, documentation, configMap, links block → simplified
      await manageLinesInFile('update', path.join(componentsDir, "layout", "mobile-nav.tsx"), 21, 29, "  const links = marketingConfig.mainNav;");
      // Line 13: DocsSidebarNav import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "mobile-nav.tsx"), 13, null);
      // Line 9: docsConfig import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "mobile-nav.tsx"), 9, null);
      // Line 5: useSelectedLayoutSegment import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "mobile-nav.tsx"), 5, null);

      // navbar.tsx (operations go bottom-to-top to preserve line numbers)
      // Lines 81-102: docs-specific header block (DocsSearch, GitHub link)
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 81, 102);
      // Line 48: large={documentation} prop
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 48, null);
      // Lines 30-38: selectedLayout, documentation, configMap, links block → simplified
      await manageLinesInFile('update', path.join(componentsDir, "layout", "navbar.tsx"), 30, 38, "  const links = marketingConfig.mainNav;");
      // Line 15: DocsSearch import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 15, null);
      // Line 8: docsConfig import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 8, null);
      // Line 5: useSelectedLayoutSegment import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 5, null);

      // dashboard.ts
      // Line 38: { href: "/docs", icon: "bookOpen", title: "Documentation" },
      await manageLinesInFile('remove', path.join(configDir, "dashboard.ts"), 38, null);

      // marketing.ts
      // Lines 9-12: Documentation entry in mainNav
      await manageLinesInFile('remove', path.join(configDir, "marketing.ts"), 9, 12);

      // types/index.d.ts - only remove DocsConfig type, keep SidebarNavItem
      // Lines 40-44: empty line + DocsConfig type
      await manageLinesInFile('remove', path.join(typesDir, "index.d.ts"), 40, 44);

      // remove folders & files
      await deleteFolderRecursive(path.join(appDir, "(docs)"));
      await deleteFolderRecursive(path.join(componentsDir, "docs"));
      await deleteFolderRecursive(path.join(configDir, "docs.ts"));
      await deleteFolderRecursive(path.join(contentDir, "docs"));
      await deleteFolderRecursive(path.join(staticDir, "docs"));

      console.log("\nDone.");
      break;

    default:
      console.log("Deleting all content\n");

      // hero-landing.tsx
      // Line 37: href="/docs" → href="/login"
      await manageLinesInFile('update', path.join(componentsDir, "sections", "hero-landing.tsx"), 37, null, '            href="/login"');
      // Line 44: <span>Installation Guide</span> → <span>Go to Login Page</span>
      await manageLinesInFile('update', path.join(componentsDir, "sections", "hero-landing.tsx"), 44, null, "            <span>Go to Login Page</span>");

      // mobile-nav.tsx (operations go bottom-to-top to preserve line numbers)
      // Lines 124-129: DocsSidebarNav conditional block
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "mobile-nav.tsx"), 124, 129);
      // Lines 21-29: selectedLayout, documentation, configMap, links block → simplified
      await manageLinesInFile('update', path.join(componentsDir, "layout", "mobile-nav.tsx"), 21, 29, "  const links = marketingConfig.mainNav;");
      // Line 13: DocsSidebarNav import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "mobile-nav.tsx"), 13, null);
      // Line 9: docsConfig import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "mobile-nav.tsx"), 9, null);
      // Line 5: useSelectedLayoutSegment import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "mobile-nav.tsx"), 5, null);

      // navbar.tsx (operations go bottom-to-top to preserve line numbers)
      // Lines 81-102: docs-specific header block (DocsSearch, GitHub link)
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 81, 102);
      // Line 48: large={documentation} prop
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 48, null);
      // Lines 30-38: selectedLayout, documentation, configMap, links block → simplified
      await manageLinesInFile('update', path.join(componentsDir, "layout", "navbar.tsx"), 30, 38, "  const links = marketingConfig.mainNav;");
      // Line 15: DocsSearch import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 15, null);
      // Line 8: docsConfig import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 8, null);
      // Line 5: useSelectedLayoutSegment import
      await manageLinesInFile('remove', path.join(componentsDir, "layout", "navbar.tsx"), 5, null);

      // config files
      // Line 38: Documentation link in dashboard sidebar
      await manageLinesInFile('remove', path.join(configDir, "dashboard.ts"), 38, null);
      // Lines 5-12: Blog + Documentation entries in marketing mainNav
      await manageLinesInFile('remove', path.join(configDir, "marketing.ts"), 5, 12);

      // types/index.d.ts - only remove DocsConfig type, keep SidebarNavItem
      // Lines 40-44: empty line + DocsConfig type
      await manageLinesInFile('remove', path.join(typesDir, "index.d.ts"), 40, 44);

      // next.config.js
      // Line 27: module.exports = withContentlayer(nextConfig); → module.exports = nextConfig;
      await manageLinesInFile('update', nextConfigPath, 27, null, "module.exports = nextConfig;");
      // Lines 1-2: contentlayer require + blank line
      await manageLinesInFile('remove', nextConfigPath, 1, 2);

      // remove folders & files
      await deleteFolderRecursive(path.join(appDir, "(docs)"));
      await deleteFolderRecursive(path.join(appDir, "(marketing)", "(blog-post)"));
      await deleteFolderRecursive(path.join(appDir, "(marketing)", "[slug]"));
      await deleteFolderRecursive(path.join(appDir, "(marketing)", "blog"));
      await deleteFolderRecursive(path.join(componentsDir, "content"));
      await deleteFolderRecursive(path.join(componentsDir, "docs"));
      await deleteFolderRecursive(path.join(configDir, "blog.ts"));
      await deleteFolderRecursive(path.join(configDir, "docs.ts"));
      await deleteFolderRecursive(contentDir);
      await deleteFolderRecursive(path.join(staticDir, "avatars"));
      await deleteFolderRecursive(path.join(staticDir, "blog"));
      await deleteFolderRecursive(path.join(staticDir, "docs"));
      await deleteFolderRecursive(path.join(process.cwd(), "styles", "mdx.css"));
      await deleteFolderRecursive("contentlayer.config.ts");
      await deleteFolderRecursive(path.join(process.cwd(), ".contentlayer"));

      console.log("\nDone.");
      break;
  }
})();
