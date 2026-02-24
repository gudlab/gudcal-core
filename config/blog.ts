export const BLOG_CATEGORIES: {
  title: string;
  slug: "news" | "education";
  description: string;
}[] = [
  {
    title: "News",
    slug: "news",
    description: "Updates and announcements from GudCal.",
  },
  {
    title: "Education",
    slug: "education",
    description: "Guides and tutorials for scheduling and integrations.",
  },
];

export const BLOG_AUTHORS = {
  timchosen: {
    name: "Tim",
    image: "/_static/avatars/timchosen.jpg",
    twitter: "timchosen",
  },
};
