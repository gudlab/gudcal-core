import { notFound } from "next/navigation";
import { allPages } from "contentlayer/generated";

import { Mdx } from "@/components/content/mdx-components";

import "@/styles/mdx.css";

import { Metadata } from "next";

import { constructMetadata } from "@/lib/utils";

const slug = "privacy";

export function generateMetadata(): Metadata | undefined {
  const page = allPages.find((page) => page.slugAsParams === slug);
  if (!page) {
    return;
  }

  const { title, description } = page;

  return constructMetadata({
    title: `${title} – GudCal`,
    description: description,
  });
}

export default function PrivacyPage() {
  const page = allPages.find((page) => page.slugAsParams === slug);

  if (!page) {
    notFound();
  }

  return (
    <article className="container max-w-3xl py-6 lg:py-12">
      <div className="space-y-4">
        <h1 className="inline-block font-heading text-4xl lg:text-5xl">
          {page.title}
        </h1>
        {page.description && (
          <p className="text-xl text-muted-foreground">{page.description}</p>
        )}
      </div>
      <hr className="my-4" />
      <Mdx code={page.body.code} />
    </article>
  );
}
