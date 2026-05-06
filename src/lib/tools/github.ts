import axios from "axios";

export async function getGithubDetailsAboutUser(args: unknown) {
  const username = typeof args === "string" ? args : String(args ?? "");
  if (!username) return "Error: username is required";
  try {
    const { data } = await axios.get(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      { timeout: 10_000 },
    );
    return {
      login: data.login,
      name: data.name,
      blog: data.blog,
      public_repos: data.public_repos,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Error fetching github user: ${msg}`;
  }
}
