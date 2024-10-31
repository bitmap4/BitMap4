require("dotenv").config();
const Mustache = require("mustache");
const fs = require("fs");

const GITHUB_API_URL = 'https://api.github.com/graphql';
const TOKEN = process.env.GH_ACCESS_TOKEN;

async function getCommitCount(username, from, to) {
  const query = `
    query CommitCount($username: String!, $from: DateTime, $to: DateTime) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
        }
      }
    }
  `;

  const variables = {
    username: username,
    from: from || null, // ISO 8601 format, e.g., "2023-01-01T00:00:00Z"
    to: to || null      // ISO 8601 format, e.g., "2023-12-31T23:59:59Z"
  };

  try {
    const response = await fetch(GITHUB_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return null;
    }

    const commitCount = result.data.user.contributionsCollection.totalCommitContributions;
    return commitCount;
  } catch (error) {
    console.error('Error fetching commit count:', error);
    return null;
  }
}

const toISOStringWithoutMs = (date) => {
  return date.toISOString().split('.')[0] + 'Z'; // Remove milliseconds
};

async function updateReadme(userData) {
  const TEMPLATE_PATH = "./main.mustache";
  await fs.readFile(TEMPLATE_PATH, (err, data) => {
    if (err) {
      throw err;
    }

    const output = Mustache.render(data.toString(), userData);
    fs.writeFileSync("README.md", output);
  });
}

async function main() {
  const lastYear = new Date();
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  const currentDate = new Date();

  const totalCommitsInPastYear = await getCommitCount(
    process.env.GH_USERNAME,
    toISOStringWithoutMs(lastYear),
    toISOStringWithoutMs(currentDate)
  );

  // Hex color codes for the color blocks
  const colors = ["FFF4E0", "B4C5A9", "8FA977", "E15B5B", "4A3B38"];

  const age = (b => `${new Date().getFullYear() - b.getFullYear()} years, ${new Date().getMonth() - b.getMonth()} months, ${new Date().getDate() - b.getDate()} days${new Date().getMonth() === b.getMonth() && new Date().getDate() === b.getDate() ? ' 🎂' : ''}`)(new Date(2006, 1, 4))
  await updateReadme({ totalCommitsInPastYear, colors, age });
}

main();
