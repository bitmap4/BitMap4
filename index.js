require("dotenv").config();
const Mustache = require("mustache");
const fs = require("fs");
const https = require('https');

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

  const requestBody = JSON.stringify({ query, variables });

  const options = {
    hostname: 'api.github.com',
    path: '/graphql',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Node.js'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.errors) {
          console.error('GraphQL errors:', result.errors);
          resolve(null);
        } else {
          resolve(result.data.user.contributionsCollection.totalCommitContributions);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Error fetching commit count:', error);
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
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
  const totalStars = 0;

  const age = (b => `${new Date().getFullYear() - b.getFullYear()} years, ${new Date().getMonth() - b.getMonth()} months, ${new Date().getDate() - b.getDate()} days${new Date().getMonth() === b.getMonth() && new Date().getDate() === b.getDate() ? ' 🎂' : ''}`)(new Date(2006, 1, 4))
  await updateReadme({ totalStars, totalCommitsInPastYear, colors, age });
}

main();
